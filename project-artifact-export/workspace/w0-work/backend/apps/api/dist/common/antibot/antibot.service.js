"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiBotService = exports.StaticDisposableEmailProvider = exports.NoopChallengeProvider = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const db_1 = require("@platform/db");
const metrics_1 = require("../../common/observability/metrics");
/** Honest default until a CAPTCHA vendor is contracted (§27 registered). */
class NoopChallengeProvider {
    name = 'noop';
    async issueChallenge(subject) {
        void subject;
        return { challengeId: `noop-${(0, node_crypto_1.createHash)('sha256').update(JSON.stringify(subject)).digest('hex').slice(0, 16)}`, expiresInMs: 300_000 };
    }
    async verifyChallenge(_challengeId, _answer) {
        return true;
    }
}
exports.NoopChallengeProvider = NoopChallengeProvider;
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
    'throwawaymail.com', 'yopmail.com', 'getnada.com', 'dispostable.com', 'sharklasers.com',
    'trashmail.com', 'fakeinbox.com', 'maildrop.cc', 'mailnesia.com', 'discard.email',
]);
class StaticDisposableEmailProvider {
    isDisposable(email) {
        const domain = email.trim().toLowerCase().split('@')[1] ?? '';
        return DISPOSABLE_EMAIL_DOMAINS.has(domain);
    }
}
exports.StaticDisposableEmailProvider = StaticDisposableEmailProvider;
const TEMPORARY_BLOCK_MINUTES = 15;
let AntiBotService = class AntiBotService {
    antiBot;
    metrics;
    challenge;
    disposable;
    constructor(antiBot, metrics) {
        this.antiBot = antiBot;
        this.metrics = metrics;
        // Providers default to honest implementations; a CAPTCHA vendor is a
        // later swap at this seam (§16 provider abstraction).
        this.challenge = new NoopChallengeProvider();
        this.disposable = new StaticDisposableEmailProvider();
    }
    get challengeProviderName() {
        return this.challenge.name;
    }
    async precheck(input) {
        const signals = [];
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
            if (ipFailures >= 10)
                risk += 0.3;
            if (ipFailures >= 20) {
                signals.push('ip_velocity_high');
                await this.antiBot.createBlock({ subjectType: 'ip', subjectKey: input.ip, reason: `velocity:${ipFailures} failures/15m`, expiresAt: new Date(Date.now() + TEMPORARY_BLOCK_MINUTES * 60_000) });
                this.metrics.counter('antibot_temp_blocks_total', 'Temporary IP blocks applied', {});
                return { allowed: false, riskScore: Math.min(1, risk + 0.4), challengeRequired: false, blockApplied: true, signals: [...signals, 'temporary_block_applied'] };
            }
            else if (ipFailures >= 10) {
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
    async antiBotRecordedIpFailures(ip) {
        // Reuses login telemetry; wrapped so tests can stub without DB.
        return this.antiBot.countRecentIpFailures(ip, 900);
    }
    async recordFailure(input) {
        await this.antiBot.recordRiskEvent({ subjectType: 'ip', subjectKey: input.ip, signal: `${input.action}_failure`, score: 0.2, metadata: { emailDomain: input.email?.split('@')[1] ?? null } });
    }
};
exports.AntiBotService = AntiBotService;
exports.AntiBotService = AntiBotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.AntiBotRepository,
        metrics_1.MetricsRegistry])
], AntiBotService);
