"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretCipher = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * AES-256-GCM envelope encryption for MFA secrets at rest (§15).
 * Key derivation: scrypt(MFA_ENCRYPTION_KEY) → 32 bytes.
 * Output format: v1.<iv b64>.<tag b64>.<ciphertext b64>
 */
class SecretCipher {
    key;
    constructor(masterKey) {
        if (masterKey.length < 43)
            throw new Error('MFA_ENCRYPTION_KEY must be at least 43 characters');
        this.key = (0, node_crypto_1.scryptSync)(masterKey, 'karen.mfa.v1', 32);
    }
    encrypt(plaintext) {
        const iv = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
    }
    decrypt(envelope) {
        const parts = envelope.split('.');
        const ivB64 = parts[1];
        const tagB64 = parts[2];
        const ctB64 = parts[3];
        if (parts.length !== 4 || parts[0] !== 'v1' || !ivB64 || !tagB64 || !ctB64)
            throw new Error('INVALID_SECRET_ENVELOPE');
        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const ciphertext = Buffer.from(ctB64, 'base64');
        const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    }
}
exports.SecretCipher = SecretCipher;
