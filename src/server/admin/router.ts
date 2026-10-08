/**
 * The operations console's API: every /api/admin/* request, in one table.
 *
 * Before any route runs:
 *  · the request must carry X-Requested-With: shaheen-ops, and must not be
 *    a cross-site request (Fetch Metadata), and a POST's Origin must be this
 *    site: together with SameSite=Strict cookies, no other site can make an
 *    admin's browser call this API;
 *  · every response is no-store.
 *
 * Every data route then checks, on the server, that there is a session and
 * that the session's role has the permission named beside the route. The
 * browser hiding a link is a courtesy; this is the control.
 *
 * Emails are masked here for roles without users:read_pii, whatever the
 * data source returns.
 */
import type { APIContext } from 'astro';
import type {
  ActivityCategory,
  AdminUser,
  ConnectorSortKey,
  ConnectorStatus,
  FlowType,
  Permission,
  Range,
  SortDir,
  TransactionSortKey,
  TransactionStatus,
  UserSortKey,
  UserStatus,
} from '../../admin/types/admin';
import { SCENARIO_COOKIE } from '../../admin/mock/scenario';
import { signIn } from './auth';
import { demoAccountsAccepted, accounts } from './accounts';
import { maskEmail, record } from './audit';
import { NotConnectedError, SourceUnavailableError, dataSource, type AdminDataSource } from './data-source';
import { exportAnalytics, exportConnectors, exportTransactions, exportUsers } from './exports';
import { securityOverview } from './security';
import { client, current, describe, end, rawAddress, refresh, type Current } from './session';
import { dataSourceName, mfaRequired, sessionSecret } from './settings';

// ── Responses ────────────────────────────────────────────────────────────
const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...headers },
  });
}
const problem = (status: number, code: string, message?: string, headers?: Record<string, string>) => json(status, { code, ...(message ? { message } : {}) }, headers);

// ── Query parsing: every input is checked against what it may be ─────────
const RANGES = ['24h', '7d', '30d', '90d', '1y'] as const;
const FLOWS = ['receive', 'send', 'payment', 'cash_out'] as const;

class BadRequest extends Error {}

function query(url: URL) {
  const q = url.searchParams;
  const text = (name: string, max = 100) => {
    const v = q.get(name)?.trim();
    if (!v) return undefined;
    if (v.length > max) throw new BadRequest(name);
    return v;
  };
  const one = <T extends string>(name: string, allowed: readonly T[]): T | undefined => {
    const v = q.get(name);
    if (v === null || v === '') return undefined;
    if (!(allowed as readonly string[]).includes(v)) throw new BadRequest(name);
    return v as T;
  };
  const int = (name: string, min: number, max: number, fallback: number) => {
    const v = q.get(name);
    if (v === null || v === '') return fallback;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new BadRequest(name);
    return n;
  };
  const id = (name: string) => {
    const v = text(name, 64);
    if (v && !/^[A-Za-z0-9_-]+$/.test(v)) throw new BadRequest(name);
    return v;
  };
  const country = () => {
    const v = text('country', 2);
    if (v && !/^[A-Z]{2}$/.test(v)) throw new BadRequest('country');
    return v;
  };
  return {
    text,
    one,
    int,
    id,
    country,
    range: (fallback: Range = '30d') => one('range', RANGES) ?? fallback,
    page: () => ({ page: int('page', 1, 100_000, 1), pageSize: int('pageSize', 1, 100, 25) }),
    dir: () => one<SortDir>('dir', ['asc', 'desc']),
  };
}

// ── Routes ───────────────────────────────────────────────────────────────
interface Req {
  ctx: APIContext;
  match: RegExpMatchArray;
  me: Current;
  q: ReturnType<typeof query>;
  src: () => Promise<AdminDataSource>;
  pii: boolean;
}

interface Route {
  method: 'GET' | 'POST';
  path: RegExp;
  permission: Permission;
  run: (r: Req) => Promise<unknown>;
}

const mask = (pii: boolean) => <T extends Pick<AdminUser, 'email'>>(u: T): T => (pii ? u : { ...u, email: maskEmail(u.email) });

const found = <T>(v: T | null): T => {
  if (v === null) throw new NotFound();
  return v;
};
class NotFound extends Error {}

async function csv(r: Req, kind: 'users' | 'transactions' | 'connectors' | 'analytics'): Promise<Response> {
  const src = await r.src();
  const f = Object.fromEntries(['search', 'status', 'country', 'type', 'range', 'userId'].map((k) => [k, r.q.text(k)]));
  const built =
    kind === 'users'
      ? await exportUsers(src, f, mask(r.pii))
      : kind === 'transactions'
        ? await exportTransactions(src, f)
        : kind === 'connectors'
          ? await exportConnectors(src, f)
          : await exportAnalytics(src, r.q.range());
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `shaheen-${kind}-${dataSourceName() === 'demo' ? 'demo-' : ''}${stamp}.csv`;
  const who = client(r.ctx.request, r.ctx.clientAddress);
  const filters = Object.entries(f)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  await record({
    kind: 'export',
    account: maskEmail(r.me.account.email),
    actor: r.me.account.name,
    ...who,
    detail: `Exported ${built.rows} ${kind === 'analytics' ? 'analytics rows' : kind} (CSV)${filters ? `, filtered by ${filters}` : ''}.`,
  });
  return new Response(`﻿${built.csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Row-Count': String(built.rows),
      ...NO_STORE,
    },
  });
}

const routes: Route[] = [
  { method: 'GET', path: /^stats$/, permission: 'console:access', run: async (r) => (await r.src()).getDashboardStats(r.q.range()) },
  { method: 'GET', path: /^money-movement$/, permission: 'transactions:read', run: async (r) => (await r.src()).getMoneyMovement(r.q.range()) },

  { method: 'GET', path: /^users\/summary$/, permission: 'users:read', run: async (r) => (await r.src()).getUserSummary() },
  { method: 'GET', path: /^users\/export$/, permission: 'users:export', run: (r) => csv(r, 'users') },
  {
    method: 'GET',
    path: /^users$/,
    permission: 'users:read',
    run: async (r) => {
      const p = await (await r.src()).getUsers({
        ...r.q.page(),
        search: r.q.text('search'),
        status: r.q.one<UserStatus>('status', ['active', 'inactive', 'pending', 'suspended']),
        country: r.q.country(),
        sort: r.q.one<UserSortKey>('sort', ['name', 'country', 'joinedAt', 'status', 'lastActiveAt']),
        dir: r.q.dir(),
      });
      return { ...p, items: p.items.map(mask(r.pii)) };
    },
  },
  { method: 'GET', path: /^users\/([A-Za-z0-9_-]{1,64})$/, permission: 'users:read', run: async (r) => mask(r.pii)(found(await (await r.src()).getUserById(r.match[1]!))) },

  { method: 'GET', path: /^transactions\/analytics$/, permission: 'transactions:read', run: async (r) => (await r.src()).getTransactionAnalytics(r.q.range(), r.q.one('type', FLOWS) ?? 'all') },
  { method: 'GET', path: /^transactions\/export$/, permission: 'transactions:export', run: (r) => csv(r, 'transactions') },
  {
    method: 'GET',
    path: /^transactions$/,
    permission: 'transactions:read',
    run: async (r) =>
      (await r.src()).getTransactions({
        ...r.q.page(),
        search: r.q.text('search'),
        type: r.q.one<FlowType>('type', FLOWS),
        status: r.q.one<TransactionStatus>('status', ['completed', 'pending', 'failed', 'cancelled']),
        range: r.q.one('range', RANGES),
        userId: r.q.id('userId'),
        connectorId: r.q.id('connectorId'),
        sort: r.q.one<TransactionSortKey>('sort', ['createdAt', 'usdValue', 'status', 'type']),
        dir: r.q.dir(),
      }),
  },
  { method: 'GET', path: /^transactions\/([A-Za-z0-9_-]{1,64})$/, permission: 'transactions:read', run: async (r) => found(await (await r.src()).getTransactionById(r.match[1]!)) },

  { method: 'GET', path: /^connectors\/summary$/, permission: 'connectors:read', run: async (r) => (await r.src()).getConnectorSummary() },
  { method: 'GET', path: /^connectors\/export$/, permission: 'connectors:export', run: (r) => csv(r, 'connectors') },
  {
    method: 'GET',
    path: /^connectors$/,
    permission: 'connectors:read',
    run: async (r) =>
      (await r.src()).getConnectors({
        ...r.q.page(),
        search: r.q.text('search'),
        status: r.q.one<ConnectorStatus>('status', ['active', 'inactive', 'pending']),
        country: r.q.country(),
        sort: r.q.one<ConnectorSortKey>('sort', ['name', 'country', 'city', 'status', 'transactionCount', 'volumeUsd', 'lastActiveAt']),
        dir: r.q.dir(),
      }),
  },
  { method: 'GET', path: /^connectors\/([A-Za-z0-9_-]{1,64})$/, permission: 'connectors:read', run: async (r) => found(await (await r.src()).getConnectorById(r.match[1]!)) },

  { method: 'GET', path: /^network$/, permission: 'network:read', run: async (r) => (await r.src()).getGlobalNetwork(r.q.range()) },
  { method: 'GET', path: /^assets$/, permission: 'assets:read', run: async (r) => (await r.src()).getAssets(r.q.range()) },
  { method: 'GET', path: /^analytics\/users$/, permission: 'analytics:read', run: async (r) => (await r.src()).getUserAnalytics(r.q.range('90d')) },
  { method: 'GET', path: /^analytics\/export$/, permission: 'analytics:export', run: (r) => csv(r, 'analytics') },
  {
    method: 'GET',
    path: /^activity$/,
    permission: 'activity:read',
    run: async (r) =>
      (await r.src()).getActivity({
        category: r.q.one<ActivityCategory>('category', ['users', 'transactions', 'connectors', 'security', 'system']),
        cursor: r.q.text('cursor', 64),
        limit: r.q.int('limit', 1, 100, 40),
      }),
  },
  { method: 'GET', path: /^system-health$/, permission: 'system:read', run: async (r) => (await r.src()).getSystemHealth() },
  { method: 'GET', path: /^security$/, permission: 'security:read', run: (r) => securityOverview(r.me, client(r.ctx.request, r.ctx.clientAddress)) },
  {
    method: 'GET',
    path: /^search$/,
    permission: 'console:access',
    run: async (r) => {
      const term = r.q.text('q', 100) ?? '';
      if (term.length < 2) return { users: [], transactions: [], connectors: [] };
      const res = await (await r.src()).search(term);
      const may = (p: Permission) => r.me.permissions.includes(p);
      return {
        users: may('users:read') ? res.users.map(mask(r.pii)) : [],
        transactions: may('transactions:read') ? res.transactions : [],
        connectors: may('connectors:read') ? res.connectors : [],
      };
    },
  },
];

// ── Sign-in routes ───────────────────────────────────────────────────────
async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return null;
  try {
    const text = await request.text();
    if (text.length > 4096) return null;
    const v = JSON.parse(text) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const SIGN_IN_STATUS: Record<string, number> = {
  invalid_credentials: 401,
  mfa_required: 401,
  mfa_invalid: 401,
  not_authorized: 403,
  rate_limited: 429,
  not_configured: 503,
};

async function auth(ctx: APIContext, action: string): Promise<Response | null> {
  const { request, cookies } = ctx;
  const method = request.method;

  if (action === 'config' && method === 'GET') {
    return json(200, {
      configured: !!sessionSecret() && (await accounts()).length > 0,
      mfaRequired: mfaRequired(),
      devAccounts: demoAccountsAccepted(),
    });
  }

  if (action === 'sign-in' && method === 'POST') {
    const body = await readJson(request);
    const email = typeof body?.email === 'string' ? body.email.slice(0, 254) : '';
    const password = typeof body?.password === 'string' ? body.password.slice(0, 512) : '';
    const code = typeof body?.code === 'string' ? body.code.slice(0, 12) : undefined;
    if (!email || !password) return problem(400, 'invalid_credentials');
    const result = await signIn({ email, password, code }, rawAddress(request, ctx.clientAddress), client(request, ctx.clientAddress), cookies);
    if (result.ok) return json(200, { session: describe(result.claims, result.account) });
    return problem(SIGN_IN_STATUS[result.code] ?? 401, result.code, undefined, result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {});
  }

  if (action === 'session' && method === 'GET') {
    const me = await current(cookies);
    return me ? json(200, { session: describe(me.claims, me.account) }) : problem(401, 'no_session');
  }

  if (action === 'refresh' && method === 'POST') {
    const me = await refresh(cookies);
    return me ? json(200, { session: describe(me.claims, me.account) }) : problem(401, 'no_session');
  }

  if (action === 'sign-out' && method === 'POST') {
    const me = await current(cookies, { slide: false });
    if (me) await record({ kind: 'sign_out', account: maskEmail(me.account.email), actor: me.account.name, ...client(request, ctx.clientAddress) });
    await end(cookies, me?.claims.sid ?? null);
    return json(204, null);
  }

  return null;
}

// ── Entry point ──────────────────────────────────────────────────────────
export async function handle(ctx: APIContext): Promise<Response> {
  const { request, url } = ctx;
  const path = String(ctx.params.path ?? '').replace(/^\/+|\/+$/g, '');

  // Only the console's own pages may call this API.
  if (request.headers.get('x-requested-with') !== 'shaheen-ops') return problem(403, 'forbidden');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return problem(403, 'forbidden');
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return problem(403, 'forbidden');
  }

  try {
    if (path.startsWith('auth/')) {
      const res = await auth(ctx, path.slice(5));
      return res ?? problem(404, 'not_found');
    }

    const route = routes.find((r) => r.path.test(path));
    if (!route) return problem(404, 'not_found');
    if (request.method !== route.method) return problem(405, 'method_not_allowed', undefined, { Allow: route.method });

    const me = await current(ctx.cookies);
    if (!me) return problem(401, 'unauthorized');
    if (!me.permissions.includes(route.permission)) return problem(403, 'forbidden', `This needs the “${route.permission}” permission.`);

    const q = query(url);
    const scenario = ctx.cookies.get(SCENARIO_COOKIE)?.value;
    let src: Promise<AdminDataSource> | undefined;
    const result = await route.run({
      ctx,
      match: path.match(route.path)!,
      me,
      q,
      src: () => (src ??= dataSource({ scenario })),
      pii: me.permissions.includes('users:read_pii'),
    });
    return result instanceof Response ? result : json(200, result);
  } catch (err) {
    if (err instanceof BadRequest) return problem(400, 'bad_request', `“${err.message}” is not a valid value here.`);
    if (err instanceof NotFound) return problem(404, 'not_found');
    if (err instanceof NotConnectedError) return problem(503, 'not_connected', err.message);
    if (err instanceof SourceUnavailableError) return problem(503, 'unavailable', err.message);
    console.error('[ops] API error', err);
    return problem(500, 'error');
  }
}
