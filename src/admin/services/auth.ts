/**
 * Authentication for the console, behind one small interface.
 *
 *   src/admin/services/http/auth.http.ts → /api/admin/auth/* → src/server/admin
 *
 * What the browser does here is convenience: it decides which screen to
 * show. What keeps data safe is the server, which checks the session and
 * the permission on every admin API request (ADMIN_AUTH_INTEGRATION.md).
 * Someone who edits this file in their browser gets an empty console,
 * because the API refuses them.
 */
import type { AdminSession, Permission } from '../types/admin';
import { configureSessionHandlers } from './http/client';
import { can } from './permissions';

export interface AuthProvider {
  /** Rejects with AuthError (invalid_credentials, mfa_required, mfa_invalid, not_authorized, rate_limited, not_configured, unavailable). */
  signIn(email: string, password: string, code?: string): Promise<AdminSession>;
  signOut(): Promise<void>;
  /** The current session, asked of the server; null when signed out or expired. */
  getSession(): Promise<AdminSession | null>;
  /** Extends the session before it expires; null when it cannot be extended. */
  refresh(): Promise<AdminSession | null>;
}

let provider: Promise<AuthProvider> | undefined;
function auth(): Promise<AuthProvider> {
  provider ??= import('./http/auth.http').then((m) => m.httpAuth);
  return provider;
}

let current: AdminSession | null = null;
let lostHandler: (() => void) | null = null;

configureSessionHandlers({
  refresh: async () => !!(await refreshSession()),
  lost: () => {
    current = null;
    lostHandler?.();
  },
});

/** What to do when the server says the session is gone (the shell sends the admin to sign-in). */
export function onSessionLost(fn: () => void): void {
  lostHandler = fn;
}

export async function signIn(email: string, password: string, code?: string): Promise<AdminSession> {
  current = await (await auth()).signIn(email.trim(), password, code);
  return current;
}

export async function signOut(): Promise<void> {
  try {
    await (await auth()).signOut();
  } finally {
    current = null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  current = await (await auth()).getSession();
  return current;
}

export async function refreshSession(): Promise<AdminSession | null> {
  current = await (await auth()).refresh();
  return current;
}

/** The session already loaded on this page, without asking again. */
export const currentSession = () => current;

export const hasPermission = (permission: Permission) => can(current, permission);
