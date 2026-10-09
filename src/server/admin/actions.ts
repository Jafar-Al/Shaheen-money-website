/**
 * The console's five actions, on the server: in-app messages, SMS and push
 * notifications to users (one, several, or everyone in some countries or
 * continents), money sent from the master wallet, and refunds. Every one is
 * an administrator's permission, checked by the router before this runs.
 *
 * Around each action:
 *  · every field is checked against what it may be (lengths, formats,
 *    allow-lists) before anything is sent;
 *  · money and refunds need the administrator to confirm with a fresh
 *    authenticator code (accepted once, failures counted and locked like
 *    sign-in); the demo accounts, which have none, confirm explicitly;
 *  · money and refunds carry an idempotency key: the same key twice is
 *    refused, so a double click or a retried request cannot pay twice;
 *  · every action is written to the audit log with who did it and what.
 *
 * The sending itself is the data source's (src/server/admin/shaheen-source.ts):
 * it calls the Shaheen app's own backend, which holds the keys, the SMS and
 * push providers and the ledger. The console never holds a key.
 */
import type { ActionRecord, Audience, Channel, Continent, MessageRequest, MoneyResult, MoneyTransferRequest, RefundRequest } from '../../admin/types/admin';
import type { Current } from './session';
import type { AdminDataSource } from './data-source';
import { maskEmail, record, recent } from './audit';
import type { Client } from './session';
import { verifyTotp } from './crypto';
import { countryName } from '../../admin/lib/geo';
import { LOCKOUT, mfaRequired } from './settings';
import { del, getNumber, incr, set, ttl } from './store';

export const CHANNELS: readonly Channel[] = ['in_app', 'sms', 'push'];
export const CONTINENTS: readonly Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
const ASSETS = ['USDC', 'USDT', 'EUROC'] as const;

/** Text limits: an SMS is kept to three segments; titles stay short enough for a notification. */
export const LIMITS = { title: 80, body: 1000, sms: 480, note: 200, reason: 300, users: 500, countries: 60 } as const;

/** A refused input or a refused action, with a code the page can show. */
export class ActionInputError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message);
  }
}

const clean = (v: unknown, max: number, field: string, required = true): string | undefined => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ActionInputError('missing_field', `“${field}” is required.`);
    return undefined;
  }
  if (typeof v !== 'string') throw new ActionInputError('bad_field', `“${field}” must be text.`);
  // Control characters (except line breaks) never reach a phone or a log.
  const s = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
  if (!s && required) throw new ActionInputError('missing_field', `“${field}” is required.`);
  if (s.length > max) throw new ActionInputError('too_long', `“${field}” can be at most ${max} characters.`);
  return s || undefined;
};

const idOf = (v: unknown, field: string) => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new ActionInputError('bad_field', `“${field}” is not a valid ID.`);
  return v;
};

/** A positive amount with at most six decimals (the assets' precision); no limit is set on its size. */
const amountOf = (v: unknown, field = 'amount') => {
  if (typeof v !== 'string' || !/^\d{1,15}(\.\d{1,6})?$/.test(v) || Number(v) <= 0) {
    throw new ActionInputError('bad_amount', `“${field}” must be a positive amount, like 250 or 99.50.`);
  }
  return v;
};

const keyOf = (v: unknown) => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(v)) throw new ActionInputError('bad_field', 'The request has no valid idempotency key.');
  return v;
};

export function parseAudience(v: unknown): Audience {
  const a = v as Record<string, unknown> | null;
  if (!a || typeof a !== 'object') throw new ActionInputError('missing_field', 'Choose who receives it.');
  if (a.kind === 'users') {
    const ids = Array.isArray(a.userIds) ? [...new Set(a.userIds)] : [];
    if (!ids.length) throw new ActionInputError('missing_field', 'Choose at least one user.');
    if (ids.length > LIMITS.users) throw new ActionInputError('too_many', `At most ${LIMITS.users} users at once; for more, choose countries or continents.`);
    return { kind: 'users', userIds: ids.map((x) => idOf(x, 'user')) };
  }
  if (a.kind === 'countries') {
    const cs = Array.isArray(a.countries) ? [...new Set(a.countries)] : [];
    if (!cs.length) throw new ActionInputError('missing_field', 'Choose at least one country.');
    if (cs.length > LIMITS.countries) throw new ActionInputError('too_many', 'Too many countries.');
    for (const c of cs) if (typeof c !== 'string' || !/^[A-Z]{2}$/.test(c)) throw new ActionInputError('bad_field', 'A country code is not valid.');
    return { kind: 'countries', countries: cs as string[] };
  }
  if (a.kind === 'continents') {
    const cs = Array.isArray(a.continents) ? [...new Set(a.continents)] : [];
    if (!cs.length) throw new ActionInputError('missing_field', 'Choose at least one continent.');
    for (const c of cs) if (!(CONTINENTS as readonly unknown[]).includes(c)) throw new ActionInputError('bad_field', 'A continent is not valid.');
    return { kind: 'continents', continents: cs as Continent[] };
  }
  throw new ActionInputError('bad_field', 'Choose users, countries or continents.');
}

export function parseMessage(body: Record<string, unknown>): MessageRequest {
  const channel = body.channel as Channel;
  if (!CHANNELS.includes(channel)) throw new ActionInputError('bad_field', 'Choose in-app, SMS or push.');
  const audience = parseAudience(body.audience);
  const title = channel === 'sms' ? undefined : clean(body.title, LIMITS.title, 'title', channel === 'push');
  const text = clean(body.body, channel === 'sms' ? LIMITS.sms : LIMITS.body, 'message')!;
  return { channel, audience, title, body: text };
}

function parseMoney(body: Record<string, unknown>): MoneyTransferRequest {
  const asset = body.asset as (typeof ASSETS)[number];
  if (!ASSETS.includes(asset)) throw new ActionInputError('bad_field', 'Choose USDC, USDT or EUROC.');
  return {
    userId: idOf(body.userId, 'recipient'),
    asset,
    amount: amountOf(body.amount),
    note: clean(body.note, LIMITS.note, 'note', false),
    idempotencyKey: keyOf(body.idempotencyKey),
  };
}

function parseRefund(body: Record<string, unknown>): RefundRequest {
  return {
    transactionId: idOf(body.transactionId, 'transaction'),
    amount: body.amount === undefined || body.amount === null || body.amount === '' ? undefined : amountOf(body.amount),
    reason: clean(body.reason, LIMITS.reason, 'reason')!,
    idempotencyKey: keyOf(body.idempotencyKey),
  };
}

// ── Confirming who is acting ─────────────────────────────────────────────
const stepUpKey = (id: string) => `ops:stepup:${id}`;

/**
 * Money and refunds: a fresh authenticator code from the acting administrator,
 * accepted once. Wrong codes are counted; after LOCKOUT.perAccount of them the
 * actions are locked for the window, as sign-in is.
 */
async function confirmIdentity(me: Current, body: Record<string, unknown>): Promise<void> {
  const account = me.account;
  const fails = await getNumber(stepUpKey(account.id));
  if (fails >= LOCKOUT.perAccount) {
    throw new ActionInputError('locked', `Too many wrong codes. Try again in about ${Math.ceil(((await ttl(stepUpKey(account.id))) || LOCKOUT.windowSeconds) / 60)} minutes.`, 429);
  }
  if (account.totpSecret) {
    const code = typeof body.code === 'string' ? body.code : '';
    if (!code) throw new ActionInputError('code_required', 'Enter the 6-digit code from your authenticator app to confirm.', 422);
    const step = verifyTotp(account.totpSecret, code);
    const fresh = step !== null && (await set(`ops:totp:${account.id}:${step}`, '1', 120, true));
    if (!fresh) {
      await incr(stepUpKey(account.id), LOCKOUT.windowSeconds);
      throw new ActionInputError('code_invalid', 'That code didn’t match. Enter the one showing now.', 422);
    }
    await del(stepUpKey(account.id));
    return;
  }
  // No second factor: only possible for the demo accounts, or where it is turned off.
  if (mfaRequired() && !account.demo) throw new ActionInputError('code_required', 'This account needs a second factor before it can move money.', 422);
  if (body.confirm !== true) throw new ActionInputError('confirm_required', 'Confirm the action to continue.', 422);
}

/** One use per idempotency key, for a day. */
async function claim(kind: string, key: string): Promise<void> {
  if (!(await set(`ops:idem:${kind}:${key}`, '1', 86_400, true))) {
    throw new ActionInputError('duplicate', 'This request was already sent. Nothing was done twice.', 409);
  }
}

const audienceText = (a: Audience) =>
  a.kind === 'users'
    ? `${a.userIds.length} selected user${a.userIds.length === 1 ? '' : 's'}`
    : a.kind === 'countries'
      ? `users in ${a.countries.map(countryName).join(', ')}`
      : `users in ${a.continents.join(', ')}`;

const CHANNEL_WORD: Record<Channel, string> = { in_app: 'an in-app message', sms: 'an SMS', push: 'a push notification' };
const count = (n: number) => n.toLocaleString('en-US');
/** Free text inside a sentence: without its own closing full stop. */
const inline = (s: string) => s.replace(/[.s]+$/, '');

// ── The actions ──────────────────────────────────────────────────────────
export async function countAudience(src: AdminDataSource, body: Record<string, unknown>): Promise<{ recipients: number }> {
  return { recipients: await src.countAudience(parseAudience(body.audience), CHANNELS.includes(body.channel as Channel) ? (body.channel as Channel) : 'in_app') };
}

export async function sendMessage(src: AdminDataSource, me: Current, who: Client, body: Record<string, unknown>) {
  const req = parseMessage(body);
  if (body.confirm !== true) throw new ActionInputError('confirm_required', 'Confirm the message to send it.', 422);
  const result = await src.sendMessage({ ...req, sentBy: { id: me.account.id, name: me.account.name } });
  await record({
    kind: 'message_sent',
    account: maskEmail(me.account.email),
    actor: me.account.name,
    ...who,
    detail: `Sent ${CHANNEL_WORD[req.channel]} to ${audienceText(req.audience)} (${count(result.recipients)} recipients)${req.title ? `: “${inline(req.title)}”` : ''}.`,
  });
  return result;
}

export async function sendMoney(src: AdminDataSource, me: Current, who: Client, body: Record<string, unknown>): Promise<MoneyResult> {
  const req = parseMoney(body);
  await confirmIdentity(me, body);
  await claim('money', req.idempotencyKey);
  const result = await src.sendMoney({ ...req, sentBy: { id: me.account.id, name: me.account.name } });
  const user = await src.getUserById(req.userId).catch(() => null);
  await record({
    kind: 'money_sent',
    account: maskEmail(me.account.email),
    actor: me.account.name,
    ...who,
    detail: `Sent ${req.amount} ${req.asset} from the master wallet to ${user ? `${user.name} (${req.userId})` : `user ${req.userId}`}, transaction ${result.transactionId}${req.note ? `. Note: ${inline(req.note)}` : ''}.`,
  });
  return result;
}

export async function issueRefund(src: AdminDataSource, me: Current, who: Client, body: Record<string, unknown>): Promise<MoneyResult> {
  const req = parseRefund(body);
  await confirmIdentity(me, body);
  await claim('refund', req.idempotencyKey);
  const result = await src.issueRefund({ ...req, sentBy: { id: me.account.id, name: me.account.name } });
  await record({
    kind: 'refund_issued',
    account: maskEmail(me.account.email),
    actor: me.account.name,
    ...who,
    detail: `Refunded ${req.amount ? req.amount : 'the full amount'} of ${req.transactionId}, transaction ${result.transactionId}. Reason: ${inline(req.reason)}.`,
  });
  return result;
}

/** The latest actions, newest first, from the audit log. */
export async function recentActions(limit = 20): Promise<ActionRecord[]> {
  const kinds = { message_sent: 'message', money_sent: 'money', refund_issued: 'refund' } as const;
  return (await recent(500))
    .filter((e) => e.kind in kinds)
    .slice(0, limit)
    .map((e) => ({ id: e.id, at: e.at, kind: kinds[e.kind as keyof typeof kinds], actor: e.actor, detail: e.detail ?? '' }));
}
