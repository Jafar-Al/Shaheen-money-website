/**
 * The operations console's cryptography, on Node's own `crypto` and nothing
 * else: password hashes (scrypt), second-factor codes (TOTP, RFC 6238, the
 * codes every authenticator app shows), and signatures for session cookies
 * (HMAC-SHA256).
 *
 * No imports beyond node:crypto, so scripts/admin-account.mjs can use it to
 * create accounts on an admin's own machine.
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))));

export const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
export const randomId = (bytes = 18) => randomBytes(bytes).toString('base64url');

/** Equal-time comparison of two strings (a mismatch in length is still a mismatch). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ── Passwords ────────────────────────────────────────────────────────────
// scrypt with N = 2^15, r = 8, p = 1 (OWASP's recommended minimum); the
// parameters travel in the stored string so they can be raised later.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${b64url(salt)}$${b64url(key)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * A hash of nothing, checked against when an email is unknown, so a wrong
 * email takes as long to refuse as a wrong password (no account probing).
 */
let dummy: Promise<string> | undefined;
export const dummyHash = () => (dummy ??= hashPassword(randomId()));

// ── TOTP (RFC 6238: 30-second steps, 6 digits, HMAC-SHA1) ─────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('Invalid base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new second-factor secret: 160 random bits, as authenticator apps expect. */
export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1]! & 15;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}

export const totpStep = (ms = Date.now()) => Math.floor(ms / 30_000);

/**
 * The step a code belongs to, accepting one step either side for clock
 * drift, or null. The caller refuses a step it has already accepted
 * (replay).
 */
export function verifyTotp(secret: string, code: string, ms = Date.now()): number | null {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const now = totpStep(ms);
  for (const step of [now, now - 1, now + 1]) if (safeEqual(totpAt(secret, step), clean)) return step;
  return null;
}

export function otpauthUri(secret: string, email: string, issuer = 'Shaheen Operations'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ── Signatures ───────────────────────────────────────────────────────────
export const sign = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('base64url');
