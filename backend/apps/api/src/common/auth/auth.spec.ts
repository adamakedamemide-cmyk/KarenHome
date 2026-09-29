import { describe, expect, it } from '@jest/globals';
import { hashRefreshToken } from '../../modules/iam/application/iam.service';

describe('refresh token hashing', () => {
  it('is deterministic and one-way sized', () => {
    const token = 'example-refresh-token-abcdef';
    const a = hashRefreshToken(token);
    const b = hashRefreshToken(token);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toBe(token);
  });
});
