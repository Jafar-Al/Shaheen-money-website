/**
 * Signing in, on the server.
 *
 *  1. Too many recent failures for this account or this address → 429 with
 *     Retry-After, before any password is checked.
 *  2. The password is checked against the account's scrypt hash; an unknown
 *     email is checked against a dummy hash, so both take the same time and
 *     get the same answer (no way to learn which emails exist).
 *  3. An account with a second factor must send its current 6-digit code; a
 *     code is accepted once (replay is refused). In production an account
 *     without a second factor cannot sign in unless ADMIN_REQUIRE_MFA=false.
 *     The demo accounts are the exception: they exist only while the demo
 *     is on, see generated data only, and their password is published.
 *  4. An account without console access (role USER) is refused even with
 *     the right password.
 *  5. Every outcome is written to the audit log, masked.
 */
import { createHash } from 'node:crypto';
import type { AstroCookies } from 'astro';
import type { AuthErrorCode } from '../../admin/types/admin';
import { permissionsFor } from '../../admin/services/permissions';
import { accounts, findByEmail, type AdminAccount } from './accounts';
import { maskEmail, record } from './audit';
import { dummyHash, verifyPassword, verifyTotp } from './crypto';
import { LOCKOUT, mfaRequired, sessionSecret } from './settings';
import { start, type Claims, type Client } from './session';
import { del, getNumber, incr, set, ttl } from './store';

export interface SignInInput {
  email: string;
  password: string;
  code?: string | undefined;
}

export type SignInResult =
  | { ok: true; claims: Claims; account: AdminAccount }
  | { ok: false; code: AuthErrorCode; retryAfter?: number };

export type FailReason = 'invalid_credentials' | 'mfa_failed' | 'not_authorized' | 'no_second_factor';

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);
const accountKey = (email: string) => `ops:fail:acct:${hash(email.trim().toLowerCase())}`;
const addressKey = (ip: string) => `ops:fail:ip:${hash(ip)}`;

/** Local development: the developer's own machine is never locked out by address. */
const exemptAddress = (ip: string) => import.meta.env.DEV && /^(::1|127\.|::ffff:127\.|localhost|unknown)/.test(ip);

async function fail(email: string, ip: string, who: Client, code: AuthErrorCode, reason: FailReason): Promise<SignInResult> {
  await incr(accountKey(email), LOCKOUT.windowSeconds);
  if (!exemptAddress(ip)) await incr(addressKey(ip), LOCKOUT.windowSeconds);
  await record({ kind: code === 'mfa_invalid' ? 'mfa_failed' : 'sign_in_failed', account: maskEmail(email), actor: null, ...who, reason });
  return { ok: false, code };
}

export async function signIn(input: SignInInput, ip: string, who: Client, cookies: AstroCookies): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase();
  if (!sessionSecret() || !(await accounts()).length) return { ok: false, code: 'not_configured' };

  // 1. Locked?
  const accountFails = await getNumber(accountKey(email));
  const addressFails = exemptAddress(ip) ? 0 : await getNumber(addressKey(ip));
  if (accountFails >= LOCKOUT.perAccount || addressFails >= LOCKOUT.perAddress) {
    const key = accountFails >= LOCKOUT.perAccount ? accountKey(email) : addressKey(ip);
    const retryAfter = (await ttl(key)) || LOCKOUT.windowSeconds;
    if (accountFails === LOCKOUT.perAccount) {
      // Logged once per lockout, not on every refused attempt after it.
      await incr(accountKey(email), LOCKOUT.windowSeconds);
      await record({ kind: 'locked', account: maskEmail(email), actor: null, ...who, detail: `Locked for ${Math.ceil(retryAfter / 60)} minutes after ${LOCKOUT.perAccount} failed sign-ins.` });
    }
    return { ok: false, code: 'rate_limited', retryAfter };
  }

  // 2. Password, in equal time whether or not the account exists.
  const account = await findByEmail(email);
  const passwordOk = await verifyPassword(input.password, account?.passwordHash ?? (await dummyHash()));
  if (!account || !passwordOk) return fail(email, ip, who, 'invalid_credentials', 'invalid_credentials');

  // 3. Second factor.
  if (account.totpSecret) {
    if (!input.code) return { ok: false, code: 'mfa_required' };
    const step = verifyTotp(account.totpSecret, input.code);
    // One use per code: claim the step for this account.
    const fresh = step !== null && (await set(`ops:totp:${account.id}:${step}`, '1', 120, true));
    if (!fresh) return fail(email, ip, who, 'mfa_invalid', 'mfa_failed');
  } else if (mfaRequired() && !account.demo) {
    await record({ kind: 'sign_in_failed', account: maskEmail(email), actor: null, ...who, reason: 'no_second_factor' });
    return { ok: false, code: 'not_configured' };
  }

  // 4. Console access.
  if (!permissionsFor(account.role).includes('console:access')) {
    await record({ kind: 'sign_in_failed', account: maskEmail(email), actor: null, ...who, reason: 'not_authorized' });
    return { ok: false, code: 'not_authorized' };
  }

  // 5. In.
  await del(accountKey(email));
  const claims = await start(cookies, account, who, !!account.totpSecret);
  if (!claims) return { ok: false, code: 'not_configured' };
  await record({ kind: 'sign_in', account: maskEmail(email), actor: account.name, ...who, detail: account.totpSecret ? 'With second factor' : 'Without second factor' });
  return { ok: true, claims, account };
}

