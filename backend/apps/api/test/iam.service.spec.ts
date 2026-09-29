import { describe, expect, it, jest } from '@jest/globals';
import { IamService } from '../src/modules/iam/application/iam.service';

describe('IamService', () => {
  it('rejects an existing account before hashing the password', async () => {
    const repo = { findUserByEmail: (jest.fn() as any).mockResolvedValue({ id: 'u1' }) } as any;
    const tokens = {} as any;
    const config = { refreshTtlSeconds: 3600, accessTtlSeconds: 900 } as any;
    const hardening = {
      createEmailVerification: (jest.fn() as any).mockResolvedValue(undefined),
      recordLoginAttempt: (jest.fn() as any).mockResolvedValue(undefined),
      findActiveMfaFactor: (jest.fn() as any).mockResolvedValue(null),
    } as any;
    const antiBot = {
      precheck: (jest.fn() as any).mockResolvedValue({ allowed: true, riskScore: 0, challengeRequired: false, blockApplied: false, signals: [] }),
      recordFailure: (jest.fn() as any).mockResolvedValue(undefined),
    } as any;
    const jobs = { enqueue: (jest.fn() as any).mockResolvedValue('job-1') } as any;
    const service = new IamService(repo, tokens, config, hardening, antiBot, jobs);
    await expect(service.register({ email: 'a@example.com', password: 'StrongPassword!123' }))
      .rejects.toThrow('Email is already registered');
  });

  it('routes a successful registration into the event-driven email verification queue (§12)', async () => {
    const repo = {
      findUserByEmail: (jest.fn() as any).mockResolvedValue(null),
      createPasswordUser: (jest.fn() as any).mockResolvedValue({ id: 'u2', status: 'pending', firstName: null, lastName: null, displayName: null, locale: 'en', timezone: 'UTC', createdAt: new Date() }),
    } as any;
    const config = { refreshTtlSeconds: 3600, accessTtlSeconds: 900, emailVerificationTtlSeconds: 86_400 } as any;
    const hardening = { createEmailVerification: (jest.fn() as any).mockResolvedValue(undefined) } as any;
    const antiBot = {
      precheck: (jest.fn() as any).mockResolvedValue({ allowed: true, riskScore: 0, challengeRequired: false, blockApplied: false, signals: [] }),
    } as any;
    const jobs = { enqueue: (jest.fn() as any).mockResolvedValue('job-2') } as any;
    const service = new IamService(repo, tokensStub(), config, hardening, antiBot, jobs);
    const result = await service.register({ email: 'b@example.com', password: 'StrongPassword!123' }, { ip: '127.0.0.1' });
    expect(result.verificationRequired).toBe(true);
    expect(jobs.enqueue).toHaveBeenCalledTimes(1);
    const call = (jobs.enqueue as any).mock.calls[0][0];
    expect(call.queue).toBe('email');
    expect(call.jobType).toBe('email.verification');
    expect(call.dedupKey).toBe('email.verification:u2');
  });
});

function tokensStub(): any {
  return {};
}
