import { describe, expect, it, jest } from '@jest/globals';
import { IamService } from '../src/modules/iam/application/iam.service';

describe('IamService', () => {
  it('rejects an existing account before hashing the password', async () => {
    const repo = { findUserByEmail: jest.fn().mockResolvedValue({ id: 'u1' }) } as any;
    const tokens = {} as any;
    const config = { refreshTtlSeconds: 3600, accessTtlSeconds: 900 } as any;
    const service = new IamService(repo, tokens, config);
    await expect(service.register({ email: 'a@example.com', password: 'StrongPassword!123' }))
      .rejects.toThrow('Email is already registered');
  });
});
