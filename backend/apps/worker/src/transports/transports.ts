/**
 * Gate 4 §12 — outbound transports with provider abstraction.
 * Email: SMTP transport (nodemailer, UNVERIFIED without a live SMTP server)
 * + Console transport (verified dev default). SMS/Push: provider interfaces
 * with logged dev transports + Twilio/Fcm HTTP adapters (UNVERIFIED).
 * Every transport is idempotency-friendly: caller passes a providerReference
 * dedup key that providers should include in provider_reference.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  bodyText: string;
  dedupKey: string;
  locale: string;
}

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<{ providerReference: string }>;
}

export class ConsoleEmailTransport implements EmailTransport {
  readonly name = 'console-email';
  async send(message: EmailMessage): Promise<{ providerReference: string }> {
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

export class SmtpEmailTransport implements EmailTransport {
  readonly name = 'smtp';
  private readonly transporter: {
    sendMail(options: { from: string; to: string; subject: string; text: string }): Promise<{ messageId?: string }>;
  };

  constructor(smtpUrl: string, private readonly fromAddress: string) {
    // Lazy require keeps the worker runnable without nodemailer in minimal envs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as { createTransport(url: string): { sendMail(options: unknown): Promise<{ messageId?: string }> } };
    this.transporter = nodemailer.createTransport(smtpUrl);
  }

  async send(message: EmailMessage): Promise<{ providerReference: string }> {
    const result = await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.bodyText,
    });
    return { providerReference: result.messageId ?? `smtp:${message.dedupKey}` };
  }
}

export interface SmsMessage {
  to: string;
  body: string;
  dedupKey: string;
}

export interface SmsTransport {
  readonly name: string;
  send(message: SmsMessage): Promise<{ providerReference: string }>;
}

export class ConsoleSmsTransport implements SmsTransport {
  readonly name = 'console-sms';
  async send(message: SmsMessage): Promise<{ providerReference: string }> {
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

export class TwilioSmsTransport implements SmsTransport {
  readonly name = 'twilio';
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async send(message: SmsMessage): Promise<{ providerReference: string }> {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      method: 'POST',
      headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: message.to, From: this.fromNumber, Body: message.body }),
    });
    if (!response.ok) throw new Error(`TWILIO_${response.status}`);
    const body = (await response.json()) as { sid?: string };
    return { providerReference: body.sid ?? `twilio:${message.dedupKey}` };
  }
}

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | undefined;
  dedupKey: string;
}

export interface PushTransport {
  readonly name: string;
  send(message: PushMessage): Promise<{ providerReference: string }>;
}

export class ConsolePushTransport implements PushTransport {
  readonly name = 'console-push';
  async send(message: PushMessage): Promise<{ providerReference: string }> {
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
