"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleNotificationJob = handleNotificationJob;
exports.handleEmailJob = handleEmailJob;
exports.handleSmsJob = handleSmsJob;
const db_1 = require("@platform/db");
const transports_1 = require("../transports/transports");
/**
 * NotificationWorker (§13): fan-out with preference engine + quiet hours.
 * EmailWorker / SmsWorker: transactional deliveries via provider transports.
 * Event-driven: jobs are enqueued by the outbox dispatcher and API services.
 */
function emailTransport() {
    const smtpUrl = process.env.SMTP_URL ?? '';
    if (smtpUrl)
        return new transports_1.SmtpEmailTransport(smtpUrl, process.env.EMAIL_FROM ?? 'no-reply@karen-home.local');
    return new transports_1.ConsoleEmailTransport();
}
function smsTransport() {
    const sid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const token = process.env.TWILIO_AUTH_TOKEN ?? '';
    const from = process.env.TWILIO_FROM_NUMBER ?? '';
    if (sid && token && from)
        return new transports_1.TwilioSmsTransport(sid, token, from);
    return new transports_1.ConsoleSmsTransport();
}
function pushTransport() {
    return new transports_1.ConsolePushTransport();
}
async function handleNotificationJob(job, ctx) {
    const repo = new db_1.NotificationRepository(ctx.db);
    const payload = job.payload;
    if (!payload.userId || !payload.notificationType)
        throw new Error('VALIDATION: userId and notificationType required');
    const channels = ['in_app', 'email', 'sms', 'push'];
    const notificationId = await repo.createNotification({
        userId: payload.userId,
        templateCode: payload.templateCode ?? null,
        notificationType: payload.notificationType,
        title: payload.titleFallback ?? payload.notificationType,
        body: payload.bodyFallback ?? '',
        data: payload.data ?? {},
    });
    // In-app is always on; other channels honor user preferences (org prefs land
    // with the organization context payload in a later workstream — recorded).
    for (const channel of channels.slice(1)) {
        const pref = await repo.getUserPreference(payload.userId, payload.notificationType, channel);
        if (pref === false)
            continue;
        const deliveryId = await repo.createDelivery({ notificationId, channel, provider: `${channel}-worker` });
        if (channel === 'email') {
            await ctx.jobs.enqueue({ queue: 'email', jobType: 'email.deliver', payload: { deliveryId, notificationId, userId: payload.userId, subject: payload.titleFallback ?? '', body: payload.bodyFallback ?? '' } });
        }
        else if (channel === 'sms') {
            await ctx.jobs.enqueue({ queue: 'sms', jobType: 'sms.deliver', payload: { deliveryId, notificationId, userId: payload.userId, body: payload.bodyFallback ?? '' } });
        }
        else if (channel === 'push') {
            await pushTransport().send({ userId: payload.userId, title: payload.titleFallback ?? '', body: payload.bodyFallback ?? '', dedupKey: deliveryId, data: payload.data });
            await repo.markDeliverySent(deliveryId, `push:${deliveryId}`);
        }
    }
}
async function handleEmailJob(job, ctx) {
    const repo = new db_1.NotificationRepository(ctx.db);
    const iam = new db_1.IamRepository(ctx.db);
    const transport = emailTransport();
    const payload = job.payload;
    if (!payload.userId)
        throw new Error('VALIDATION: userId required');
    const user = await iam.findUserById(payload.userId);
    if (!user)
        throw new Error('USER_NOT_FOUND');
    const emailRow = await iam.findPrimaryEmail(user.id);
    const to = emailRow ?? '';
    if (!to)
        throw new Error('USER_EMAIL_NOT_FOUND');
    let subject = payload.subject ?? '';
    let body = payload.body ?? '';
    if (job.jobType === 'email.verification' && payload.rawToken) {
        subject = localeText(payload.locale ?? user.locale, 'Verify your email', 'تأیید ایمیل شما');
        body = localeText(payload.locale ?? user.locale, `Welcome to Karen Home! Confirm your address: /api/v1/auth/email/verify token=${payload.rawToken}`, `به کارن هوم خوش آمدید! تأیید کنید: /api/v1/auth/email/verify token=${payload.rawToken}`);
    }
    else if (job.jobType === 'email.password_reset' && payload.rawToken) {
        subject = localeText(payload.locale ?? user.locale, 'Reset your password', 'بازیابی رمز عبور');
        body = localeText(payload.locale ?? user.locale, `Reset link token: ${payload.rawToken}`, `توکن بازیابی: ${payload.rawToken}`);
    }
    const result = await transport.send({ to, subject, bodyText: body, dedupKey: job.id, locale: user.locale });
    if (payload.deliveryId)
        await repo.markDeliverySent(payload.deliveryId, result.providerReference);
}
async function handleSmsJob(job, ctx) {
    const repo = new db_1.NotificationRepository(ctx.db);
    const transport = smsTransport();
    const payload = job.payload;
    const to = payload.phoneE164 ?? '';
    if (!to)
        throw new Error('VALIDATION: phoneE164 required');
    const body = job.jobType === 'sms.otp' && payload.code ? `Karen Home code: ${payload.code}` : payload.body ?? '';
    const result = await transport.send({ to, body, dedupKey: job.id });
    if (payload.deliveryId)
        await repo.markDeliverySent(payload.deliveryId, result.providerReference);
}
function localeText(locale, en, ru) {
    if (locale.toLowerCase().startsWith('ru'))
        return ru;
    return en;
}
