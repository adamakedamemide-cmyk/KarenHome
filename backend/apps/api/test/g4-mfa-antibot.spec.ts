import { createHmac } from 'node:crypto';
import { base32Decode, generateTotpSecret, totpUri, verifyTotp } from '../src/common/auth/totp';
import { SecretCipher } from '../src/common/auth/secret-cipher';
import { StaticDisposableEmailProvider } from '../src/common/antibot/antibot.service';

function totpAt(secret: string, atMs: number): string {
  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buffer.writeUInt32BE(counter % 2 ** 32, 4);
  const digest = createHmac('sha1', key).update(buffer).digest();
  const dynamicOffset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary =
    (((digest[dynamicOffset] ?? 0) & 0x7f) << 24) |
    (((digest[dynamicOffset + 1] ?? 0) & 0xff) << 16) |
    (((digest[dynamicOffset + 2] ?? 0) & 0xff) << 8) |
    ((digest[dynamicOffset + 3] ?? 0) & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

describe('G4 — MFA foundation: TOTP + secret cipher (§15)', () => {
  it('round-trips a valid TOTP code within the ±1 window', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    expect(verifyTotp(secret, totpAt(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true); // previous step
    expect(verifyTotp(secret, totpAt(secret, now + 30_000), now)).toBe(true); // next step
  });

  it('rejects stale codes outside the window and malformed input', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    expect(verifyTotp(secret, totpAt(secret, now - 120_000), now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
  });

  it('produces a valid otpauth URI', () => {
    const secret = generateTotpSecret();
    const uri = totpUri(secret, 'user-1', 'KarenHome');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(secret);
  });

  it('encrypts MFA secrets at rest and detects tampering', () => {
    const cipher = new SecretCipher('unit-test-master-key-0123456789abcdef0123456789');
    const secret = generateTotpSecret();
    const envelope = cipher.encrypt(secret);
    expect(envelope).not.toContain(secret);
    expect(cipher.decrypt(envelope)).toBe(secret);
    const tampered = `${envelope.slice(0, -4)}AAAA`;
    expect(() => cipher.decrypt(tampered)).toThrow();
  });
});

describe('G4 — anti-bot disposable email (§16)', () => {
  it('flags known disposable domains and passes real domains', () => {
    const provider = new StaticDisposableEmailProvider();
    expect(provider.isDisposable('a@mailinator.com')).toBe(true);
    expect(provider.isDisposable('a@Temp-Mail.ORG')).toBe(true);
    expect(provider.isDisposable('a@gmail.com')).toBe(false);
    expect(provider.isDisposable('no-at-sign')).toBe(false);
  });
});
