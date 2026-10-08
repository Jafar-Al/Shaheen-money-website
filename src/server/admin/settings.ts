/**
 * The console's server settings, read at runtime (astro:env/server), never
 * shipped to a browser. Development has safe fallbacks so `npm run dev`
 * works with nothing configured; production has none: a missing setting
 * makes sign-in refuse with "not configured" rather than guess.
 */
import { ADMIN_ACCOUNTS, ADMIN_DATA_SOURCE, ADMIN_DEMO, ADMIN_REQUIRE_MFA, ADMIN_SESSION_SECRET } from 'astro:env/server';
import { randomId } from './crypto';
import { resolveMode, type Mode } from './mode';
import { connected } from './shaheen-source';

const DEV = import.meta.env.DEV;

/** Development only: a random secret per server start (sessions end on restart). */
const devSecret = DEV ? randomId(32) : '';

/** The key that signs session cookies, or null when production has none. */
export function sessionSecret(): string | null {
  if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) return ADMIN_SESSION_SECRET;
  return DEV ? devSecret : null;
}

/** The figures and the accounts in use (the rules are in mode.ts). */
export function mode(): Mode {
  return resolveMode({
    connected,
    dev: DEV,
    demo: ADMIN_DEMO,
    dataSource: ADMIN_DATA_SOURCE,
    hasAccounts: !!(ADMIN_ACCOUNTS ?? '').trim(),
  });
}

/** Where the figures come from: the Shaheen app's database, or generated demo data. */
export function dataSourceName(): 'shaheen' | 'demo' {
  return mode().dataSource;
}

/** Staff must use a second factor in production unless explicitly turned off. */
export function mfaRequired(): boolean {
  if (ADMIN_REQUIRE_MFA) return ADMIN_REQUIRE_MFA === 'true';
  return !DEV;
}

export const SESSION = {
  /** Signed out after this long without a request. */
  idleMinutes: 30,
  /** Signed out this long after signing in, whatever happens. */
  absoluteHours: 8,
  cookie: DEV ? 'shaheen_ops' : '__Host-shaheen_ops',
  secureCookie: !DEV,
} as const;

export const LOCKOUT = {
  /** Failed sign-ins on one account before it is locked for the window. */
  perAccount: 5,
  /** Failed sign-ins from one address before it is locked for the window. */
  perAddress: 30,
  windowSeconds: 15 * 60,
} as const;
