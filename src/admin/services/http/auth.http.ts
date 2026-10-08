/**
 * AuthProvider for the console's own sign-in service (src/server/admin):
 *
 *   POST /api/admin/auth/sign-in   { email, password, code? } → { session }
 *   GET  /api/admin/auth/session   → { session } | 401
 *   POST /api/admin/auth/refresh   → { session } | 401
 *   POST /api/admin/auth/sign-out  → 204
 *
 * The server sets and clears the session cookie (httpOnly, Secure,
 * SameSite=Strict); this file never sees it.
 */
import type { AuthProvider } from '../auth';
import type { AdminSession, AuthErrorCode } from '../../types/admin';
import { AuthError } from '../errors';
import { buildUrl } from './client';

async function call(path: string, method: 'GET' | 'POST', body?: unknown): Promise<Response> {
  try {
    return await fetch(buildUrl(path), {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'X-Requested-With': 'shaheen-ops', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : null,
    });
  } catch {
    throw new AuthError('unavailable');
  }
}

async function session(res: Response): Promise<AdminSession> {
  try {
    const data = (await res.json()) as { session?: AdminSession };
    const s = data.session;
    if (!s?.admin || !Array.isArray(s.permissions)) throw new Error('shape');
    return s;
  } catch {
    throw new AuthError('unavailable');
  }
}

const KNOWN: readonly AuthErrorCode[] = ['invalid_credentials', 'not_authorized', 'rate_limited', 'mfa_required', 'mfa_invalid', 'not_configured'];

export const httpAuth: AuthProvider = {
  async signIn(email, password, code) {
    const res = await call('/auth/sign-in', 'POST', { email, password, ...(code ? { code } : {}) });
    if (res.ok) return session(res);
    let errorCode: AuthErrorCode = res.status === 429 ? 'rate_limited' : res.status === 403 ? 'not_authorized' : res.status === 401 ? 'invalid_credentials' : 'unavailable';
    try {
      const body = (await res.json()) as { code?: AuthErrorCode };
      if (body.code && KNOWN.includes(body.code)) errorCode = body.code;
    } catch {
      /* the status is enough */
    }
    const retry = Number(res.headers.get('Retry-After'));
    throw new AuthError(errorCode, errorCode === 'rate_limited' && Number.isFinite(retry) && retry > 0 ? retry : undefined);
  },

  async signOut() {
    await call('/auth/sign-out', 'POST').catch(() => undefined);
  },

  async getSession() {
    const res = await call('/auth/session', 'GET');
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new AuthError('unavailable');
    return session(res);
  },

  async refresh() {
    const res = await call('/auth/refresh', 'POST');
    return res.ok ? session(res) : null;
  },
};

/** What the sign-in page needs to know before anyone signs in. */
export async function signInConfig(): Promise<{ configured: boolean; mfaRequired: boolean; devAccounts: boolean } | null> {
  try {
    const res = await call('/auth/config', 'GET');
    return res.ok ? ((await res.json()) as { configured: boolean; mfaRequired: boolean; devAccounts: boolean }) : null;
  } catch {
    return null;
  }
}
