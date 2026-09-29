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
    send(message: EmailMessage): Promise<{
        providerReference: string;
    }>;
}
export declare class ConsoleEmailTransport implements EmailTransport {
    readonly name = "console-email";
    send(message: EmailMessage): Promise<{
        providerReference: string;
    }>;
}
export declare class SmtpEmailTransport implements EmailTransport {
    private readonly fromAddress;
    readonly name = "smtp";
    private readonly transporter;
    constructor(smtpUrl: string, fromAddress: string);
    send(message: EmailMessage): Promise<{
        providerReference: string;
    }>;
}
export interface SmsMessage {
    to: string;
    body: string;
    dedupKey: string;
}
export interface SmsTransport {
    readonly name: string;
    send(message: SmsMessage): Promise<{
        providerReference: string;
    }>;
}
export declare class ConsoleSmsTransport implements SmsTransport {
    readonly name = "console-sms";
    send(message: SmsMessage): Promise<{
        providerReference: string;
    }>;
}
export declare class TwilioSmsTransport implements SmsTransport {
    private readonly accountSid;
    private readonly authToken;
    private readonly fromNumber;
    readonly name = "twilio";
    constructor(accountSid: string, authToken: string, fromNumber: string);
    send(message: SmsMessage): Promise<{
        providerReference: string;
    }>;
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
    send(message: PushMessage): Promise<{
        providerReference: string;
    }>;
}
export declare class ConsolePushTransport implements PushTransport {
    readonly name = "console-push";
    send(message: PushMessage): Promise<{
        providerReference: string;
    }>;
}
