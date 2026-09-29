import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AntiBotRepository } from '@platform/db';
import { MetricsRegistry } from '../../common/observability/metrics';

/**
 * Gate 4 §16 — Anti-Bot Foundation.
 * Risk scoring over velocity signals (login attempts / IP / email from
 * iam.login_attempts), disposable-email detection, temporary blocks
 * (platform.blocks via platform.is_blocked) and a progressive-challenge
 * provider abstraction. CAPTCHA vendor is pluggable; the noop provider is
 * the honest default until a vendor contract exists.
 */
export type AntiBotAction = 'login' | 'register' | 'refresh' | 'otp_send' | 'ad_serve';

export interface AntiBotDecision {
  allowed: boolean;
  riskScore: number;
  challengeRequired: boolean;
  blockApplied: boolean;
  signals: string[];
}

export interface ChallengeProvider {
  readonly name: string;
  issueChallenge(subject: { ip: string; email?: string }): Promise<{ challengeId: string; expiresInMs: number }>;
  verifyChallenge(challengeId: string, answer: string): Promise<boolean>;
}

/** Honest default until a CAPTCHA vendor is contracted (§27 registered). */
export class NoopChallengeProvider implements ChallengeProvider {
  readonly name = 'noop';
  async issueChallenge(subject: { ip: string; email?: string }): Promise<{ challengeId: string; expiresInMs: number }> {
    void subject;
    return { challengeId: `noop-${createHash('sha256').update(JSON.stringify(subject)).digest('hex').slice(0, 16)}`, expiresInMs: 300_000 };
  }
  async verifyChallenge(_challengeId: string, _answer: string): Promise<boolean> {
    return true;
  }
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'throwawaymail.com', 'yopmail.com', 'getnada.com', 'dispostable.com', 'sharklasers.com',
  'trashmail.com', 'fakeinbox.com', 'maildrop.cc', 'mailnesia.com', 'discard.email',
]);

export interface DisposableEmailProvider {
  isDisposable(email: string): boolean;
}

export class StaticDisposableEmailProvider implements DisposableEmailProvider {
  isDisposable(email: string): boolean {
    const domain = email.trim().toLowerCase().split('@')[1] ?? '';
    return DISPOSABLE_EMAIL_DOMAINS.has(domain);
  }
}

const TEMPORARY_BLOCK_MINUTES = 15;

@Injectable()
export class AntiBotService {
  private readonly challenge: ChallengeProvider;
  private readonly disposable: DisposableEmailProvider;

  constructor(
    private readonly antiBot: AntiBotRepository,
    private readonly metrics: MetricsRegistry,
  ) {
    // Providers default to honest implementations; a CAPTCHA vendor is a
    // later swap at this seam (§16 provider abstraction).
    this.challenge = new NoopChallengeProvider();
    this.disposable = new StaticDisposableEmailProvider();
  }

  get challengeProviderName(): string {
    return this.challenge.name;
  }

  async precheck(input: { ip: string; email?: string | undefined; action: AntiBotAction }): Promise<AntiBotDecision> {
    const signals: string[] = [];
    let risk = 0;

    const ipBlocked = await this.antiBot.isBlocked('ip', input.ip);
    if (ipBlocked) {
      this.metrics.counter('antibot_block_rejections_total', 'Requests rejected for an active block', { action: input.action });
      return { allowed: false, riskScore: 1, challengeRequired: false, blockApplied: false, signals: ['ip_blocked'] };
    }

    if (input.email && this.disposable.isDisposable(input.email)) {
      risk += 0.6;
      signals.push('disposable_email');
      await this.antiBot.recordRiskEvent({ subjectType: 'email', subjectKey: input.email.toLowerCase(), signal: 'disposable_email', score: 0.6, metadata: { action: input.action } });
    }

    if (input.action === 'login' || input.action === 'register' || input.action === 'otp_send') {
      const ipFailures = await this.antiBotRecordedIpFailures(input.ip);
      if (ipFailures >= 10) risk += 0.3;
      if (ipFailures >= 20) {
        signals.push('ip_velocity_high');
        await this.antiBot.createBlock({ subjectType: 'ip', subjectKey: input.ip, reason: `velocity:${ipFailures} failures/15m`, expiresAt: new Date(Date.now() + TEMPORARY_BLOCK_MINUTES * 60_000) });
        this.metrics.counter('antibot_temp_blocks_total', 'Temporary IP blocks applied', {});
        return { allowed: false, riskScore: Math.min(1, risk + 0.4), challengeRequired: false, blockApplied: true, signals: [...signals, 'temporary_block_applied'] };
      } else if (ipFailures >= 10) {
        signals.push('ip_velocity_elevated');
      }
    }

    const challengeRequired = risk >= 0.5 && risk < 0.9;
    this.metrics.counter('antibot_evaluations_total', 'Anti-bot evaluations', { action: input.action });
    return {
      allowed: risk < 0.9,
      riskScore: Math.min(1, risk),
      challengeRequired,
      blockApplied: false,
      signals,
    };
  }

  private async antiBotRecordedIpFailures(ip: string): Promise<number> {
    // Reuses login telemetry; wrapped so tests can stub without DB.
    return this.antiBot.countRecentIpFailures(ip, 900);
  }

  async recordFailure(input: { ip: string; email?: string | undefined; userId?: string | undefined; action: AntiBotAction }): Promise<void> {
    await this.antiBot.recordRiskEvent({ subjectType: 'ip', subjectKey: input.ip, signal: `${input.action}_failure`, score: 0.2, metadata: { emailDomain: input.email?.split('@')[1] ?? null } });
  }
}
