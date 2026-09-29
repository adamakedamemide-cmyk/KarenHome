"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = exports.RATE_LIMIT_POLICIES = void 0;
class InMemoryTokenBucketStore {
    buckets = new Map();
    async hit(key, limitPerMinute) {
        this.evict();
        const now = Date.now();
        const capacity = limitPerMinute;
        const refillPerMs = limitPerMinute / 60_000;
        const bucket = this.buckets.get(key) ?? { tokens: capacity, updatedAt: now };
        const elapsed = Math.max(0, now - bucket.updatedAt);
        bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
        bucket.updatedAt = now;
        if (bucket.tokens < 1) {
            this.buckets.set(key, bucket);
            const missing = 1 - bucket.tokens;
            return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(missing / refillPerMs / 1000)) };
        }
        bucket.tokens -= 1;
        this.buckets.set(key, bucket);
        return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
    }
    evict() {
        if (this.buckets.size <= 50_000)
            return;
        const now = Date.now();
        for (const [key, bucket] of this.buckets) {
            if (now - bucket.updatedAt > 300_000)
                this.buckets.delete(key);
        }
    }
}
exports.RATE_LIMIT_POLICIES = {
    default: 120,
    auth: 10,
    search: 60,
    mediaUpload: 20,
    adServe: 300,
};
class RateLimitService {
    store;
    constructor(store) {
        this.store = store ?? new InMemoryTokenBucketStore();
    }
    async enforce(policy, subject) {
        const limit = exports.RATE_LIMIT_POLICIES[policy];
        return this.store.hit(`${policy}:${subject}`, limit);
    }
}
exports.RateLimitService = RateLimitService;
