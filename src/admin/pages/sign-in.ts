/**
 * Sign-in: every state the page can be in, each written plainly.
 *
 *   ?reason=expired     the session ended; sign in again
 *   ?reason=signed-out  confirmation after signing out
 *   ?reason=forbidden   an account without console access tried to enter
 *   already signed in   a session slip with Continue and Sign out
 *   submitting          the button busy, a progress hairline
 *   second factor       the account has one: a code field appears, and the
 *                       same email and password are sent again with the code
 *   refused             wrong credentials / no access / too many attempts /
 *                       a wrong code / not configured / the service not
 *                       answering, each with its own words
 *
 * After success, back to the page the admin was sent away from (`next`),
 * but only if it is inside the console: never an open redirect.
 */
import { ADMIN_BASE, routes } from '../config';
import { AuthError } from '../services/errors';
import { getSession, signIn, signOut } from '../services/auth';
import { signInConfig } from '../services/http/auth.http';
import { can, ROLE_LABEL } from '../services/permissions';
import type { AdminSession } from '../types/admin';
import { dateTime } from '../lib/format';
import { need } from '../ui/dom';
import { motionLevel } from '../../lib/motion/level';

const form = need<HTMLFormElement>('[data-signin]');
const email = need<HTMLInputElement>('#f-email', form);
const password = need<HTMLInputElement>('#f-password', form);
const codeField = need('[data-code-field]', form);
const code = need<HTMLInputElement>('#f-code', form);
const submit = need<HTMLButtonElement>('[data-submit]', form);
const submitLabel = need('.btn-label', submit);
const status = need('[data-status]', form);
const msg = need('[data-msg]');
const sessionBox = need('[data-session]');
const params = new URLSearchParams(location.search);

document.documentElement.dataset.auth = 'ready';
void signInConfig().then((c) => {
  need('[data-dev-accounts]').hidden = !c?.devAccounts;
  if (c && !c.configured) message(REFUSAL.not_configured!, 'alert');
});

function message(text: string | null, tone: 'quiet' | 'good' | 'alert' = 'quiet'): void {
  msg.hidden = !text;
  msg.dataset.tone = tone;
  need('[data-msg-text]', msg).textContent = text ?? '';
}

function nextUrl(): string {
  const next = params.get('next');
  // Only a path inside the console: no scheme, no host, no protocol-relative "//".
  if (next && next.startsWith(`${ADMIN_BASE}/`) && !next.startsWith('//') && !next.includes('\\') && !/sign-in/.test(next)) return next;
  return routes.commandCenter;
}

function fieldError(input: HTMLInputElement, text: string | null): void {
  const field = input.closest('[data-field]');
  const error = field?.querySelector<HTMLElement>('[data-error]');
  if (!error) return;
  error.hidden = !text;
  error.querySelector('[data-error-text]')!.textContent = text ?? '';
  if (text) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validate(): boolean {
  const e = email.value.trim();
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  fieldError(email, e ? (okEmail ? null : 'Enter a full email address, like name@shaheen.money.') : 'Enter your work email.');
  fieldError(password, password.value ? null : 'Enter your password.');
  const needCode = !codeField.hidden;
  const okCode = !needCode || /^\d{6}$/.test(code.value.replace(/\s/g, ''));
  if (needCode) fieldError(code, okCode ? null : 'Enter the 6 digits from your authenticator app.');
  if (!okEmail) email.focus();
  else if (!password.value) password.focus();
  else if (!okCode) code.focus();
  return okEmail && !!password.value && okCode;
}

function busy(on: boolean): void {
  form.setAttribute('aria-busy', String(on));
  submit.disabled = on;
  submitLabel.textContent = on ? 'Signing in…' : 'Sign in';
  status.textContent = on ? 'Checking your details.' : '';
}

const REFUSAL: Record<string, string> = {
  invalid_credentials: 'That email and password don’t match an operations account.',
  not_authorized: 'This account can’t open the operations console. Ask an administrator for access.',
  unavailable: 'The sign-in service isn’t answering. Try again in a moment.',
  session_expired: 'Your session ended. Sign in again to continue.',
  mfa_invalid: 'That code didn’t match. Codes change every 30 seconds: enter the one showing now.',
  not_configured: 'Sign-in isn’t set up on this server yet, or this account has no second factor. An administrator needs to finish the setup (ADMIN_AUTH_INTEGRATION.md).',
};

function askForCode(): void {
  codeField.hidden = false;
  code.required = true;
  message('This account uses a second factor. Enter the code from your authenticator app.', 'quiet');
  code.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message(null);
  if (!validate()) return;
  busy(true);
  try {
    await signIn(email.value, password.value, codeField.hidden ? undefined : code.value.replace(/\s/g, ''));
    password.value = '';
    code.value = '';
    status.textContent = 'Signed in. Opening the console.';
    location.replace(nextUrl());
  } catch (err) {
    busy(false);
    const reason = err instanceof AuthError ? err.code : 'unavailable';
    if (reason === 'mfa_required') {
      askForCode();
      return;
    }
    code.value = '';
    if (reason === 'mfa_invalid') {
      message(REFUSAL.mfa_invalid!, 'alert');
      code.focus();
      return;
    }
    password.value = '';
    if (reason === 'rate_limited') {
      const minutes = err instanceof AuthError && err.retryAfterSeconds ? Math.max(1, Math.ceil(err.retryAfterSeconds / 60)) : 15;
      message(`Too many attempts. For your account’s safety, try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`, 'alert');
    } else {
      message(REFUSAL[reason] ?? REFUSAL.unavailable!, 'alert');
    }
    password.focus();
  }
});

for (const input of [email, password, code]) input.addEventListener('input', () => fieldError(input, null));
// A different account may not have a second factor: start that step again.
email.addEventListener('change', () => {
  codeField.hidden = true;
  code.required = false;
  code.value = '';
});

const reveal = need<HTMLButtonElement>('[data-reveal-password]');
reveal.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  reveal.textContent = show ? 'Hide' : 'Show';
  reveal.setAttribute('aria-pressed', String(show));
  password.focus();
});

function showSession(s: AdminSession): void {
  form.hidden = true;
  sessionBox.hidden = false;
  need('[data-session-name]').textContent = `Signed in as ${s.admin.name}`;
  need('[data-session-role]').textContent = `${ROLE_LABEL[s.admin.role]} · ${s.admin.email}`;
  need('[data-session-expiry]').textContent = `Session ends ${dateTime(s.expiresAt)}`;
  need<HTMLAnchorElement>('[data-continue]').href = nextUrl();
  need('[data-session-signout]').addEventListener('click', async () => {
    await signOut();
    sessionBox.hidden = true;
    form.hidden = false;
    message('You’ve signed out.', 'good');
    email.focus();
  });
}

const reason = params.get('reason');
if (reason === 'expired') message(REFUSAL.session_expired!, 'quiet');
else if (reason === 'signed-out') message('You’ve signed out.', 'good');
else if (reason === 'forbidden') message(REFUSAL.not_authorized!, 'alert');

// Already signed in? Offer to continue instead of asking again.
if (reason !== 'expired') {
  getSession()
    .then((s) => {
      if (s && can(s, 'console:access')) showSession(s);
      else email.focus();
    })
    .catch(() => email.focus());
} else {
  email.focus();
}

// The feather's accent barb draws itself in, as on the site's inner pages.
if (motionLevel() !== 'reduced') void import('../../lib/motion/index');
