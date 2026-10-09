/**
 * Admin sessions: a signed, httpOnly cookie the page's JavaScript can never
 * read.
 *
 *   value     base64url(JSON claims) "." HMAC-SHA256(claims, ADMIN_SESSION_SECRET)
 *   claims    sid (session id), aid (account id), iat (signed in), exp (idle
 *             expiry), abs (absolute expiry), mfa (second factor used)
 *   cookie    __Host-shaheen_ops; HttpOnly; Secure; SameSite=Strict; Path=/
 *
 * A cookie is accepted only if the signature matches, neither expiry has
 * passed, and the account still exists and is not disabled; its role is
 * read fresh from the account on every request, so a role change applies
 * at once. With a shared store (Upstash) the session must also still be on
 * the list of open sessions, which is how one session is ended early
 * (sign-out, revocation). Each request that finds the idle window more than
 * half used slides it forward (re-signing the cookie), up to the absolute
 * limit.
 */
import type { AstroCookies } from 'astro';
import type { AdminSession, Permission } from '../../admin/types/admin';
import { permissionsFor } from '../../admin/services/permissions';
import { findById, type AdminAccount } from './accounts';
import { b64url, randomId, safeEqual, sign } from './crypto';
import { SESSION, dataSourceName, sessionSecret, sharedStoreRequired } from './settings';
import { del, get, getMany, isShared, list, push, set } from './store';

export interface Claims {
  sid: string;
  aid: string;
  iat: number;
  exp: number;
  abs: number;
  mfa: boolean;
}

export interface Client {
  ipMasked: string;
  location: string | null;
  device: string;
}

export interface SessionRecord extends Client {
  sid: string;
  aid: string;
  startedAt: string;
  lastSeenAt: string;
}

const IDLE = SESSION.idleMinutes * 60_000;
const ABS = SESSION.absoluteHours * 3_600_000;
const sessionKey = (sid: string) => `ops:session:${sid}`;
const INDEX = 'ops:sessions';

/**
 * The caller's address. The first X-Forwarded-For entry is whatever the
 * caller wrote, so it is never trusted: Vercel's own x-real-ip first, then
 * the platform's address, then the hop the nearest proxy appended (last).
 */
function address(request: Request, clientAddress: string | undefined): string {
  const h = request.headers;
  return h.get('x-real-ip')?.trim() || clientAddress || h.get('x-forwarded-for')?.split(',').pop()?.trim() || '';
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Who is asking, as far as it is safe to keep: masked address, rough place, browser. */
export function client(request: Request, clientAddress: string | undefined): Client {
  const h = request.headers;
  const ip = address(request, clientAddress);
  const ipMasked = ip.includes(':') ? `${ip.split(':').slice(0, 2).join(':')}:…` : ip.split('.').length === 4 ? `${ip.split('.').slice(0, 2).join('.')}.x.x` : 'unknown';
  const city = h.get('x-vercel-ip-city');
  const country = h.get('x-vercel-ip-country');
  const location = city || country ? [city ? decode(city) : null, country].filter(Boolean).join(', ') : null;
  const ua = h.get('user-agent') ?? '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
  return { ipMasked, location, device: `${browser} · ${os}` };
}

/** The raw address, for counting failures only: hashed before it is stored. */
export function rawAddress(request: Request, clientAddress: string | undefined): string {
  return address(request, clientAddress) || 'unknown';
}

function encode(claims: Claims, secret: string): string {
  const body = b64url(JSON.stringify(claims));
  return `${body}.${sign(body, secret)}`;
}

function decodeClaims(value: string, secret: string): Claims | null {
  const [body, mac] = value.split('.');
  if (!body || !mac || !safeEqual(sign(body, secret), mac)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString()) as Claims;
    return typeof c.sid === 'string' && typeof c.aid === 'string' && Number.isFinite(c.exp) && Number.isFinite(c.abs) ? c : null;
  } catch {
    return null;
  }
}

function writeCookie(cookies: AstroCookies, claims: Claims, secret: string): void {
  cookies.set(SESSION.cookie, encode(claims, secret), {
    httpOnly: true,
    secure: SESSION.secureCookie,
    sameSite: 'strict',
    path: '/',
    // The browser forgets it at the absolute limit even if the tab stays open.
    maxAge: Math.max(0, Math.floor((claims.abs - Date.now()) / 1000)),
  });
}

export function clearCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION.cookie, { path: '/', secure: SESSION.secureCookie, sameSite: 'strict', httpOnly: true });
}

/** What the browser is told about its session (never the cookie itself). */
export function describe(claims: Claims, account: AdminAccount): AdminSession {
  return {
    admin: { id: account.id, name: account.name, email: account.email, role: account.role },
    permissions: permissionsFor(account.role),
    issuedAt: new Date(claims.iat).toISOString(),
    expiresAt: new Date(Math.min(claims.exp, claims.abs)).toISOString(),
    sessionId: claims.sid,
    secondFactor: claims.mfa,
    dataSource: dataSourceName(),
  };
}

/** Starts a session after a successful sign-in. */
export async function start(cookies: AstroCookies, account: AdminAccount, who: Client, mfa: boolean): Promise<Claims | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const now = Date.now();
  const claims: Claims = { sid: `ses_${randomId(12)}`, aid: account.id, iat: now, exp: now + IDLE, abs: now + ABS, mfa };
  const rec: SessionRecord = { ...who, sid: claims.sid, aid: account.id, startedAt: new Date(now).toISOString(), lastSeenAt: new Date(now).toISOString() };
  await set(sessionKey(claims.sid), JSON.stringify(rec), Math.ceil(ABS / 1000));
  await push(INDEX, claims.sid, 500);
  writeCookie(cookies, claims, secret);
  return claims;
}

export interface Current {
  claims: Claims;
  account: AdminAccount;
  permissions: Permission[];
}

/** The request's session, or null. Slides the idle window when it is half used. */
export async function current(cookies: AstroCookies, { slide = true } = {}): Promise<Current | null> {
  const secret = sessionSecret();
  const raw = cookies.get(SESSION.cookie)?.value;
  if (!secret || !raw) return null;
  // Real staff without the shared store: no session is honoured (see settings).
  if (sharedStoreRequired() && !isShared()) return null;
  const claims = decodeClaims(raw, secret);
  const now = Date.now();
  if (!claims || claims.exp <= now || claims.abs <= now) return null;
  const account = await findById(claims.aid);
  if (!account) return null;
  if (isShared()) {
    const rec = await get(sessionKey(claims.sid));
    if (!rec) return null;
    if (slide) {
      const r = JSON.parse(rec) as SessionRecord;
      r.lastSeenAt = new Date(now).toISOString();
      await set(sessionKey(claims.sid), JSON.stringify(r), Math.max(1, Math.ceil((claims.abs - now) / 1000)));
    }
  }
  if (slide && claims.exp - now < IDLE / 2) {
    claims.exp = Math.min(now + IDLE, claims.abs);
    writeCookie(cookies, claims, secret);
  }
  return { claims, account, permissions: permissionsFor(account.role) };
}

/** Moves the idle window forward now (the console calls this before it expires). */
export async function refresh(cookies: AstroCookies): Promise<Current | null> {
  const c = await current(cookies, { slide: false });
  const secret = sessionSecret();
  if (!c || !secret) return null;
  c.claims.exp = Math.min(Date.now() + IDLE, c.claims.abs);
  writeCookie(cookies, c.claims, secret);
  return c;
}

export async function end(cookies: AstroCookies, sid: string | null): Promise<void> {
  if (sid) await del(sessionKey(sid));
  clearCookie(cookies);
}

/** Open sessions, newest first (all of them with a shared store; else none recorded beyond this instance). */
export async function openSessions(): Promise<SessionRecord[]> {
  const sids = [...new Set(await list(INDEX, 500))];
  const rows = await getMany(sids.map(sessionKey));
  const out: SessionRecord[] = [];
  for (const r of rows) {
    if (!r) continue;
    try {
      out.push(JSON.parse(r) as SessionRecord);
    } catch {
      /* skip */
    }
  }
  return out;
}
