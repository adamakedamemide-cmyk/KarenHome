/**
 * Gate 4 §17 — rate limit policy enforcement.
 * Token-bucket per (policy, subject). In-memory store by default (single node);
 * a Redis store adapter is behind the RateLimitStore interface so multi-node
 * deployments can swap it without touching call sites. Policies per §20/§17:
 * default 120/min per IP, auth 10/min per IP, search 60/min per IP.
 */
export interface RateLimitStore {
  hit(key: string, limitPerMinute: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>;
}

class InMemoryTokenBucketStore implements RateLimitStore {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  async hit(key: string, limitPerMinute: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
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

  private evict(): void {
    if (this.buckets.size <= 50_000) return;
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updatedAt > 300_000) this.buckets.delete(key);
    }
  }
}

export const RATE_LIMIT_POLICIES = {
  default: 120,
  auth: 10,
  search: 60,
  mediaUpload: 20,
  adServe: 300,
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export class RateLimitService {
  private readonly store: RateLimitStore;

  constructor(store?: RateLimitStore) {
    this.store = store ?? new InMemoryTokenBucketStore();
  }

  async enforce(policy: RateLimitPolicyName, subject: string): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
    const limit = RATE_LIMIT_POLICIES[policy];
    return this.store.hit(`${policy}:${subject}`, limit);
  }
}
