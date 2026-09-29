"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsolePushTransport = exports.TwilioSmsTransport = exports.ConsoleSmsTransport = exports.SmtpEmailTransport = exports.ConsoleEmailTransport = void 0;
class ConsoleEmailTransport {
    name = 'console-email';
    async send(message) {
        console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            transport: this.name,
            kind: 'email',
            to: message.to,
            subject: message.subject,
            locale: message.locale,
            dedupKey: message.dedupKey,
            bodyPreview: message.bodyText.slice(0, 200),
        }));
        return { providerReference: `console:${message.dedupKey}` };
    }
}
exports.ConsoleEmailTransport = ConsoleEmailTransport;
class SmtpEmailTransport {
    fromAddress;
    name = 'smtp';
    transporter;
    constructor(smtpUrl, fromAddress) {
        this.fromAddress = fromAddress;
        // Lazy require keeps the worker runnable without nodemailer in minimal envs.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport(smtpUrl);
    }
    async send(message) {
        const result = await this.transporter.sendMail({
            from: this.fromAddress,
            to: message.to,
            subject: message.subject,
            text: message.bodyText,
        });
        return { providerReference: result.messageId ?? `smtp:${message.dedupKey}` };
    }
}
exports.SmtpEmailTransport = SmtpEmailTransport;
class ConsoleSmsTransport {
    name = 'console-sms';
    async send(message) {
        console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            transport: this.name,
            kind: 'sms',
            to: message.to,
            dedupKey: message.dedupKey,
            bodyPreview: message.body.slice(0, 120),
        }));
        return { providerReference: `console:${message.dedupKey}` };
    }
}
exports.ConsoleSmsTransport = ConsoleSmsTransport;
class TwilioSmsTransport {
    accountSid;
    authToken;
    fromNumber;
    name = 'twilio';
    constructor(accountSid, authToken, fromNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
    }
    async send(message) {
        const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
            method: 'POST',
            headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: message.to, From: this.fromNumber, Body: message.body }),
        });
        if (!response.ok)
            throw new Error(`TWILIO_${response.status}`);
        const body = (await response.json());
        return { providerReference: body.sid ?? `twilio:${message.dedupKey}` };
    }
}
exports.TwilioSmsTransport = TwilioSmsTransport;
class ConsolePushTransport {
    name = 'console-push';
    async send(message) {
        console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            transport: this.name,
            kind: 'push',
            userId: message.userId,
            title: message.title,
            dedupKey: message.dedupKey,
        }));
        return { providerReference: `console:${message.dedupKey}` };
    }
}
exports.ConsolePushTransport = ConsolePushTransport;
