"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.totpUri = totpUri;
exports.verifyTotp = verifyTotp;
exports.base32Encode = base32Encode;
exports.base32Decode = base32Decode;
const node_crypto_1 = require("node:crypto");
/**
 * RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) — MFA foundation (§15).
 * Zero-dependency implementation over node:crypto; window ±1 step.
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function generateTotpSecret(bytes = 20) {
    return base32Encode((0, node_crypto_1.randomBytes)(bytes));
}
function totpUri(secret, account, issuer) {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
function verifyTotp(secret, token, atMs = Date.now(), window = 1) {
    const normalized = token.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized))
        return false;
    const key = base32Decode(secret);
    const step = Math.floor(atMs / 1000 / 30);
    for (let offset = -window; offset <= window; offset += 1) {
        const candidate = hotp(key, step + offset);
        if (timingSafeEqualHex(candidate, normalized))
            return true;
    }
    return false;
}
function hotp(key, counter) {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
    buffer.writeUInt32BE(counter % 2 ** 32, 4);
    const digest = (0, node_crypto_1.createHmac)('sha1', key).update(buffer).digest();
    const dynamicOffset = digest[digest.length - 1] ?? 0;
    const offset = dynamicOffset & 0x0f;
    const b0 = digest[offset] ?? 0;
    const b1 = digest[offset + 1] ?? 0;
    const b2 = digest[offset + 2] ?? 0;
    const b3 = digest[offset + 3] ?? 0;
    const binary = ((b0 & 0x7f) << 24) |
        ((b1 & 0xff) << 16) |
        ((b2 & 0xff) << 8) |
        (b3 & 0xff);
    return String(binary % 1_000_000).padStart(6, '0');
}
function timingSafeEqualHex(a, b) {
    if (a.length !== b.length)
        return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1)
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return mismatch === 0;
}
function base32Encode(input) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of input) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0)
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    return output;
}
function base32Decode(input) {
    const clean = input.replace(/=+$/g, '').toUpperCase().replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1)
            throw new Error('INVALID_BASE32');
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}
