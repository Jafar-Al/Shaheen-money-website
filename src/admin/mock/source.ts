/**
 * MOCK DATA — the demo data source: AdminDataSource (src/server/admin/
 * data-source.ts) answered from the generated mock world, on the server.
 * Used when ADMIN_DATA_SOURCE=demo (the default under `npm run dev`); every
 * screen then carries the "Mock data" stamp.
 *
 * It is also the reference implementation for src/server/admin/
 * shaheen-source.ts: same inputs, same shapes, same definitions, so the
 * real source can be written function by function against it.
 *
 * Scenarios (./scenario.ts, chosen on the Account page) turn on the slow,
 * empty, failing and degraded paths so every screen's states can be seen.
 */
import type { AdminDataSource } from '../../server/admin/data-source';
import { SourceUnavailableError } from '../../server/admin/data-source';
import type {
  AdminUserDetail,
  Connector,
  ConnectorDetail,
  DashboardStats,
  Metric,
  Page,
  SortDir,
  Transaction,
} from '../types/admin';
import { countryName } from '../lib/geo';
import { activityEvents } from './activity';
import {
  assetOverview,
  connectorSummary,
  dashboardStats,
  globalNetwork,
  moneyMovement,
  transactionAnalytics,
  userAnalytics,
  userSummary,
  windowFor,
} from './analytics';
import { isScenario, type Scenario } from './scenario';
import { systemHealth } from './system';
import type { MockConnector } from './connectors';
import type { MockTxn } from './transactions';
import type { MockUser } from './users';
import { world } from './world';
import { NOW } from './seed';

function page<T>(rows: T[], p: number, size: number): Page<T> {
  const pageSize = Math.min(Math.max(size, 1), 100);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(p, 1), pages);
  return { items: rows.slice((current - 1) * pageSize, current * pageSize), total: rows.length, page: current, pageSize };
}

function sortBy<T>(rows: T[], key: (r: T) => string | number, dir: SortDir = 'asc'): T[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    return (x < y ? -1 : x > y ? 1 : 0) * m;
  });
}

/** The public record of a user, without the mock world's bookkeeping. */
function userRecord(u: MockUser): AdminUserDetail {
  const { propensity: _p, churnMs: _c, sessions: _s, joinedMs: _j, ...rest } = u;
  return rest;
}
function txnRecord(t: MockTxn): Transaction {
  const { ms: _m, usd: _u, userId: _id, connectorId: _c, ...rest } = t;
  return rest;
}
function connectorRecord(c: MockConnector): Connector {
  const { onboardedMs: _o, stoppedMs: _s, weight: _w, activity: _a, onboardedAt: _on, ...rest } = c;
  return rest;
}
function connectorDetail(c: MockConnector): ConnectorDetail {
  const { onboardedMs: _o, stoppedMs: _s, weight: _w, ...rest } = c;
  return rest;
}

const zero = (unit: Metric['unit']): Metric => ({ value: 0, previous: null, unit, series: new Array(12).fill(0) });

const matches = (q: string | undefined, ...fields: string[]) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(needle));
};

export function createDemoSource(scenarioName?: string): AdminDataSource {
  const scenario: Scenario = isScenario(scenarioName) ? scenarioName : 'normal';
  const empty = scenario === 'empty';
  const degraded = scenario === 'degraded';

  /** The slow and failing scenarios; the normal one adds nothing (the network adds enough). */
  const gate = async () => {
    if (scenario === 'slow') await new Promise((r) => setTimeout(r, 2800));
    if (scenario === 'error') throw new SourceUnavailableError('Demo scenario: every data request fails.');
  };

  const users = (q: { search?: string | undefined; status?: string | undefined; country?: string | undefined }): MockUser[] =>
    empty ? [] : world().users.filter((u) => (!q.status || u.status === q.status) && (!q.country || u.country === q.country) && matches(q.search, u.name, u.email, u.id));

  const transactions = (q: {
    search?: string | undefined;
    type?: string | undefined;
    status?: string | undefined;
    range?: string | undefined;
    userId?: string | undefined;
    connectorId?: string | undefined;
  }): MockTxn[] => {
    if (empty) return [];
    const since = q.range ? windowFor(q.range as never).start : 0;
    const out: MockTxn[] = [];
    const list = world().txns;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i]!;
      if (t.ms < since) break;
      if (q.type && t.type !== q.type) continue;
      if (q.status && t.status !== q.status) continue;
      if (q.userId && t.userId !== q.userId && t.to.id !== q.userId) continue;
      if (q.connectorId && t.connectorId !== q.connectorId) continue;
      if (!matches(q.search, t.id, t.from.name, t.to.name)) continue;
      out.push(t);
    }
    return out;
  };

  const connectors = (q: { search?: string | undefined; status?: string | undefined; country?: string | undefined }): MockConnector[] =>
    empty ? [] : world().connectors.filter((c) => (!q.status || c.status === q.status) && (!q.country || c.country === q.country) && matches(q.search, c.name, c.city, c.id));

  return {
    async getDashboardStats(range) {
      await gate();
      if (!empty) return dashboardStats(range);
      const z: DashboardStats = {
        range,
        generatedAt: new Date(NOW).toISOString(),
        totalUsers: zero('count'),
        newUsers: zero('count'),
        activeUsers: zero('count'),
        transactionVolume: zero('usd'),
        activeCountries: zero('count'),
        activeConnectors: zero('count'),
      };
      return z;
    },

    async getMoneyMovement(range) {
      await gate();
      const m = moneyMovement(range);
      if (!empty) return m;
      for (const s of Object.values(m.stages)) Object.assign(s, { volumeUsd: 0, count: 0, previousVolumeUsd: null, series: new Array(12).fill(0) });
      m.store = { fundedWallets: 0, previousFundedWallets: null, walletBalanceUsd: null };
      return m;
    },

    async getUserSummary() {
      await gate();
      const s = userSummary();
      if (!empty) return s;
      return { ...s, total: zero('count'), new30d: zero('count'), active30d: zero('count'), inactive: zero('count'), countries: [] };
    },

    async getUsers(q) {
      await gate();
      const key: Record<string, (u: MockUser) => string | number> = {
        name: (u) => u.name.toLowerCase(),
        country: (u) => countryName(u.country),
        joinedAt: (u) => u.joinedMs,
        status: (u) => u.status,
        lastActiveAt: (u) => (u.lastActiveAt ? Date.parse(u.lastActiveAt) : 0),
      };
      const sorted = sortBy(users(q), key[q.sort ?? 'joinedAt'] ?? key.joinedAt!, q.dir ?? 'desc');
      const p = page(sorted, q.page, q.pageSize);
      // A list row carries only the list's fields; the rest is in the record.
      return {
        ...p,
        items: p.items.map((u) => ({ id: u.id, name: u.name, email: u.email, country: u.country, joinedAt: u.joinedAt, status: u.status, lastActiveAt: u.lastActiveAt, walletStatus: u.walletStatus })),
      };
    },

    async getUserById(id) {
      await gate();
      const u = world().usersById.get(id);
      return u && !empty ? userRecord(u) : null;
    },

    async getTransactions(q) {
      await gate();
      const rows = transactions(q);
      const sortKey: Record<string, (t: MockTxn) => string | number> = {
        createdAt: (t) => t.ms,
        usdValue: (t) => t.usd,
        status: (t) => t.status,
        type: (t) => t.type,
      };
      const sorted = q.sort && q.sort !== 'createdAt' ? sortBy(rows, sortKey[q.sort]!, q.dir) : q.dir === 'asc' ? [...rows].reverse() : rows;
      const p = page(sorted, q.page, q.pageSize);
      return { ...p, items: p.items.map(txnRecord) };
    },

    async getTransactionById(id) {
      await gate();
      const t = world().txnsById.get(id);
      return t && !empty ? txnRecord(t) : null;
    },

    async getTransactionAnalytics(range, type) {
      await gate();
      const a = transactionAnalytics(range, type);
      if (!empty) return a;
      return {
        ...a,
        totals: { count: 0, completed: 0, pending: 0, failed: 0, cancelled: 0, volumeUsd: 0, previousCount: null, previousVolumeUsd: null },
        series: a.series.map((p) => ({ ...p, volumeUsd: 0, count: 0, completed: 0, failed: 0 })),
      };
    },

    async getConnectorSummary() {
      await gate();
      const s = connectorSummary();
      if (!empty) return s;
      return {
        ...s,
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        countries: [],
        cashOut: { volumeUsd: 0, count: 0, previousVolumeUsd: null, previousCount: null },
        activity: s.activity.map((p) => ({ ...p, value: 0 })),
      };
    },

    async getConnectors(q) {
      await gate();
      const key: Record<string, (c: MockConnector) => string | number> = {
        name: (c) => c.name.toLowerCase(),
        country: (c) => countryName(c.country),
        city: (c) => c.city,
        status: (c) => c.status,
        transactionCount: (c) => c.transactionCount,
        volumeUsd: (c) => Number(c.volumeUsd),
        lastActiveAt: (c) => (c.lastActiveAt ? Date.parse(c.lastActiveAt) : 0),
      };
      const sorted = sortBy(connectors(q), key[q.sort ?? 'volumeUsd'] ?? key.volumeUsd!, q.dir ?? 'desc');
      const p = page(sorted, q.page, q.pageSize);
      return { ...p, items: p.items.map(connectorRecord) };
    },

    async getConnectorById(id) {
      await gate();
      const c = world().connectorsById.get(id);
      return c && !empty ? connectorDetail(c) : null;
    },

    async getGlobalNetwork(range) {
      await gate();
      const n = globalNetwork(range);
      return empty ? { ...n, countries: [], corridors: [] } : n;
    },

    async getAssets(range) {
      await gate();
      const a = assetOverview(range);
      if (!empty) return a;
      return { ...a, assets: a.assets.map((x) => ({ ...x, volumeUsd: 0, count: 0, previousVolumeUsd: null, previousCount: null, series: x.series.map((pt) => ({ ...pt, value: 0 })) })) };
    },

    async getUserAnalytics(range) {
      await gate();
      const a = userAnalytics(range);
      if (!empty) return a;
      const z = (s: typeof a.newUsers) => s.map((p) => ({ ...p, value: 0 }));
      return { ...a, newUsers: z(a.newUsers), activeUsers: z(a.activeUsers), totalUsers: z(a.totalUsers), retention: [] };
    },

    async getActivity(q) {
      await gate();
      if (empty) return { items: [], nextCursor: null };
      const all = activityEvents(degraded).filter((e) => !q.category || e.category === q.category);
      const start = q.cursor ? Number(q.cursor) || 0 : 0;
      const items = all.slice(start, start + q.limit);
      return { items, nextCursor: start + q.limit < all.length ? String(start + q.limit) : null };
    },

    async getSystemHealth() {
      await gate();
      return systemHealth(degraded);
    },

    async search(query) {
      await gate();
      const q = query.trim();
      if (q.length < 2 || empty) return { users: [], transactions: [], connectors: [] };
      const w = world();
      const us = w.users.filter((u) => matches(q, u.name, u.email, u.id)).slice(0, 5);
      const ts: MockTxn[] = [];
      for (let i = w.txns.length - 1; i >= 0 && ts.length < 5; i--) if (matches(q, w.txns[i]!.id)) ts.push(w.txns[i]!);
      const cs = w.connectors.filter((c) => matches(q, c.name, c.city, c.id)).slice(0, 5);
      return {
        users: us.map((u) => ({ id: u.id, name: u.name, email: u.email, country: u.country, status: u.status })),
        transactions: ts.map((t) => ({ id: t.id, type: t.type, status: t.status, amount: t.amount, asset: t.asset, createdAt: t.createdAt })),
        connectors: cs.map((c) => ({ id: c.id, name: c.name, city: c.city, country: c.country, status: c.status })),
      };
    },
  };
}
