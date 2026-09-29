import { describe, expect, it } from '@jest/globals';
import type { PropertyRecord } from '@platform/db';

describe('property repository contract', () => {
  it('requires decimal strings for exact area values', () => {
    const record: Pick<PropertyRecord, 'areaTotalM2'> = { areaTotalM2: '1234.56' };
    expect(typeof record.areaTotalM2).toBe('string');
  });
});
