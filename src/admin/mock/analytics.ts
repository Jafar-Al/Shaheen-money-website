/**
 * MOCK DATA — aggregates. Each function computes, from the mock world's
 * records, exactly what the matching admin API endpoint is expected to
 * return (ADMIN_API_INTEGRATION.md). Definitions used everywhere:
 *
 *  · volume       completed transactions only, in US dollars;
 *  · active user  a user with at least one session in the window (opened the
 *                 app, or sent or received money); pending and suspended
 *                 accounts are not counted;
 *  · windows      aligned to whole hours (24H), days (7D–90D) or weeks (1Y),
 *                 ending now; "previous" is the window of equal length
 *                 immediately before.
 */
import type {
  AssetCode,
  AssetOverview,
  ConnectorSummary,
  Corridor,
  CountryStat,
  DashboardStats,
  FlowType,
  GlobalNetwork,
  Metric,
  MoneyMovement,
  Range,
  RetentionCohort,
  TransactionAnalytics,
  UserAnalytics,
  UserSummary,
} from '../types/admin';
import type { MockTxn } from './transactions';
import type { MockUser } from './users';
import { world } from './world';
import { DAY, HOUR, NOW, TODAY, iso } from './seed';

export interface Window {
  start: number;
  bucket: 'hour' | 'day' | 'week';
  size: number;
  count: number;
  /** Bucket starts, oldest first. */
  starts: number[];
}

export function windowFor(range: Range): Window {
  const hourStart = Math.floor(NOW / HOUR) * HOUR;
  const spec: Record<Range, { bucket: Window['bucket']; size: number; count: number; last: number }> = {
    '24h': { bucket: 'hour', size: HOUR, count: 24, last: hourStart },
    '7d': { bucket: 'day', size: DAY, count: 7, last: TODAY },
    '30d': { bucket: 'day', size: DAY, count: 30, last: TODAY },
    '90d': { bucket: 'day', size: DAY, count: 90, last: TODAY },
    '1y': { bucket: 'week', size: 7 * DAY, count: 52, last: TODAY - 6 * DAY },
  };
  const s = spec[range];
  const starts = Array.from({ length: s.count }, (_, i) => s.last - (s.count - 1 - i) * s.size);
  return { start: starts[0]!, bucket: s.bucket, size: s.size, count: s.count, starts };
}

/** Transactions with start ≤ ms < end (the list is sorted by time). */
function slice(txns: MockTxn[], start: number, end: number): MockTxn[] {
  const find = (t: number) => {
    let lo = 0;
    let hi = txns.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (txns[mid]!.ms < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return txns.slice(find(start), find(end));
}

const sumUsd = (list: MockTxn[]) => list.reduce((n, t) => n + t.usd, 0);
const completed = (list: MockTxn[]) => list.filter((t) => t.status === 'completed');
const distinct = <T>(list: T[]) => new Set(list).size;

/** Twelve equal slices of [start, NOW]: the sparkline under a headline figure. */
function spark(start: number, measure: (a: number, b: number) => number): number[] {
  const step = (NOW + 1 - start) / 12;
  return Array.from({ length: 12 }, (_, i) => measure(start + i * step, start + (i + 1) * step));
}

function bucketSeries(w: Window, list: MockTxn[], value: (t: MockTxn) => number): number[] {
  const out = new Array<number>(w.count).fill(0);
  for (const t of list) {
    const i = Math.floor((t.ms - w.start) / w.size);
    if (i >= 0 && i < w.count) out[i] = out[i]! + value(t);
  }
  return out;
}

const metric = (value: number, previous: number | null, unit: Metric['unit'], series?: number[]): Metric => ({ value, previous, unit, series });

/** Whether the user had a session with start ≤ time < end. */
function sessionIn(u: MockUser, start: number, end: number): boolean {
  const s = u.sessions;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid]! < start) lo = mid + 1;
    else hi = mid;
  }
  return lo < s.length && s[lo]! < end;
}

const countable = (u: MockUser) => u.status !== 'pending' && u.status !== 'suspended';

function activeUsers(start: number, end: number): number {
  let n = 0;
  for (const u of world().users) if (countable(u) && sessionIn(u, start, end)) n++;
  return n;
}

export function dashboardStats(range: Range): DashboardStats {
  const { users, txns } = world();
  const w = windowFor(range);
  const len = NOW + 1 - w.start;
  const prevStart = w.start - len;
  const cur = completed(slice(txns, w.start, NOW + 1));
  const prev = completed(slice(txns, prevStart, w.start));
  const joinedBetween = (a: number, b: number) => users.filter((u) => u.joinedMs >= a && u.joinedMs < b).length;
  const countries = (list: MockTxn[]) => distinct(list.flatMap((t) => [t.corridor.from, t.corridor.to]));
  const connectors = (list: MockTxn[]) => distinct(list.filter((t) => t.type === 'cash_out').map((t) => t.connectorId));

  return {
    range,
    generatedAt: iso(NOW),
    totalUsers: metric(
      users.length,
      users.length - joinedBetween(w.start, NOW + 1),
      'count',
      spark(w.start, (_, b) => users.filter((u) => u.joinedMs < b).length),
    ),
    newUsers: metric(joinedBetween(w.start, NOW + 1), joinedBetween(prevStart, w.start), 'count', spark(w.start, joinedBetween)),
    activeUsers: metric(activeUsers(w.start, NOW + 1), activeUsers(prevStart, w.start), 'count', spark(w.start, activeUsers)),
    transactionVolume: metric(
      sumUsd(cur),
      sumUsd(prev),
      'usd',
      spark(w.start, (a, b) => sumUsd(completed(slice(txns, a, b)))),
    ),
    activeCountries: metric(countries(cur), countries(prev), 'count', spark(w.start, (a, b) => countries(completed(slice(txns, a, b))))),
    activeConnectors: metric(connectors(cur), connectors(prev), 'count', spark(w.start, (a, b) => connectors(completed(slice(txns, a, b))))),
  };
}

export function moneyMovement(range: Range): MoneyMovement {
  const { txns } = world();
  const w = windowFor(range);
  const prevStart = w.start - (NOW + 1 - w.start);
  const cur = completed(slice(txns, w.start, NOW + 1));
  const prev = completed(slice(txns, prevStart, w.start));
  const stage = (type: FlowType) => {
    const list = cur.filter((t) => t.type === type);
    return {
      type,
      volumeUsd: sumUsd(list),
      count: list.length,
      previousVolumeUsd: sumUsd(prev.filter((t) => t.type === type)),
      series: spark(w.start, (a, b) => sumUsd(list.filter((t) => t.ms >= a && t.ms < b))),
    };
  };

  // Funded wallets: users who have received money at least once by a given time.
  const firstReceive = new Map<string, number>();
  let balance = 0;
  for (const t of txns) {
    if (t.status !== 'completed') continue;
    if (t.type === 'receive') {
      if (!firstReceive.has(t.userId)) firstReceive.set(t.userId, t.ms);
      balance += t.usd;
    } else if (t.type === 'payment' || t.type === 'cash_out' || (t.type === 'send' && t.to.kind === 'external')) {
      balance -= t.usd;
    }
  }
  const fundedBy = (ms: number) => [...firstReceive.values()].filter((v) => v < ms).length;

  return {
    range,
    generatedAt: iso(NOW),
    stages: { receive: stage('receive'), send: stage('send'), payment: stage('payment'), cash_out: stage('cash_out') },
    store: { fundedWallets: fundedBy(NOW + 1), previousFundedWallets: fundedBy(w.start), walletBalanceUsd: Math.max(0, balance) },
  };
}

export function transactionAnalytics(range: Range, type: FlowType | 'all'): TransactionAnalytics {
  const { txns } = world();
  const w = windowFor(range);
  const prevStart = w.start - (NOW + 1 - w.start);
  const pick = (list: MockTxn[]) => (type === 'all' ? list : list.filter((t) => t.type === type));
  const cur = pick(slice(txns, w.start, NOW + 1));
  const prev = pick(slice(txns, prevStart, w.start));
  const by = (s: string) => cur.filter((t) => t.status === s).length;
  const volume = bucketSeries(w, completed(cur), (t) => t.usd);
  const count = bucketSeries(w, cur, () => 1);
  const done = bucketSeries(w, completed(cur), () => 1);
  const failed = bucketSeries(w, cur.filter((t) => t.status === 'failed'), () => 1);
  return {
    range,
    type,
    generatedAt: iso(NOW),
    bucket: w.bucket,
    totals: {
      count: cur.length,
      completed: by('completed'),
      pending: by('pending'),
      failed: by('failed'),
      cancelled: by('cancelled'),
      volumeUsd: sumUsd(completed(cur)),
      previousCount: prev.length,
      previousVolumeUsd: sumUsd(completed(prev)),
    },
    series: w.starts.map((t, i) => ({ t: iso(t), volumeUsd: volume[i]!, count: count[i]!, completed: done[i]!, failed: failed[i]! })),
  };
}

export function userSummary(): UserSummary {
  const { users } = world();
  const w = windowFor('30d');
  const prevStart = w.start - (NOW + 1 - w.start);
  const joined = (a: number, b: number) => users.filter((u) => u.joinedMs >= a && u.joinedMs < b).length;
  return {
    generatedAt: iso(NOW),
    total: metric(users.length, users.length - joined(w.start, NOW + 1), 'count'),
    new30d: metric(joined(w.start, NOW + 1), joined(prevStart, w.start), 'count'),
    active30d: metric(activeUsers(w.start, NOW + 1), activeUsers(prevStart, w.start), 'count'),
    inactive: metric(users.filter((u) => u.status === 'inactive').length, null, 'count'),
    countries: [...new Set(users.map((u) => u.country))].sort(),
  };
}

export function connectorSummary(): ConnectorSummary {
  const { connectors, txns } = world();
  const w = windowFor('30d');
  const prevStart = w.start - (NOW + 1 - w.start);
  const cash = (list: MockTxn[]) => completed(list).filter((t) => t.type === 'cash_out');
  const cur = cash(slice(txns, w.start, NOW + 1));
  const prev = cash(slice(txns, prevStart, w.start));
  const daily = bucketSeries(w, cur, () => 1);
  return {
    generatedAt: iso(NOW),
    total: connectors.length,
    active: connectors.filter((c) => c.status === 'active').length,
    inactive: connectors.filter((c) => c.status === 'inactive').length,
    pending: connectors.filter((c) => c.status === 'pending').length,
    countries: [...new Set(connectors.map((c) => c.country))].sort(),
    cashOut: { volumeUsd: sumUsd(cur), count: cur.length, previousVolumeUsd: sumUsd(prev), previousCount: prev.length },
    activity: w.starts.map((t, i) => ({ t: iso(t), value: daily[i]! })),
  };
}

export function globalNetwork(range: Range): GlobalNetwork {
  const { users, connectors, txns } = world();
  const w = windowFor(range);
  const prevStart = w.start - (NOW + 1 - w.start);
  const cur = completed(slice(txns, w.start, NOW + 1));
  const prev = completed(slice(txns, prevStart, w.start));

  const stats = new Map<string, CountryStat>();
  const get = (code: string) => {
    if (!stats.has(code)) stats.set(code, { code, users: 0, connectors: 0, volumeUsd: 0, sentUsd: 0, receivedUsd: 0 });
    return stats.get(code)!;
  };
  for (const u of users) get(u.country).users += 1;
  for (const c of connectors) if (c.status === 'active') get(c.country).connectors += 1;
  for (const t of cur) {
    const a = get(t.corridor.from);
    const b = get(t.corridor.to);
    a.sentUsd += t.usd;
    b.receivedUsd += t.usd;
    a.volumeUsd += t.usd;
    if (b !== a) b.volumeUsd += t.usd;
  }

  const key = (t: MockTxn) => `${t.corridor.from}>${t.corridor.to}`;
  const group = (list: MockTxn[]) => {
    const m = new Map<string, { volumeUsd: number; count: number }>();
    for (const t of list) {
      if (t.corridor.from === t.corridor.to) continue;
      const g = m.get(key(t)) ?? { volumeUsd: 0, count: 0 };
      g.volumeUsd += t.usd;
      g.count += 1;
      m.set(key(t), g);
    }
    return m;
  };
  const now = group(cur);
  const before = group(prev);
  const corridors: Corridor[] = [...now.entries()]
    .map(([k, v]) => {
      const [from, to] = k.split('>') as [string, string];
      return { from, to, volumeUsd: v.volumeUsd, count: v.count, previousVolumeUsd: before.get(k)?.volumeUsd ?? null };
    })
    .sort((a, b) => b.volumeUsd - a.volumeUsd);

  return {
    range,
    generatedAt: iso(NOW),
    countries: [...stats.values()].sort((a, b) => b.volumeUsd - a.volumeUsd),
    corridors,
  };
}

export function assetOverview(range: Range): AssetOverview {
  const { txns } = world();
  const w = windowFor(range);
  const prevStart = w.start - (NOW + 1 - w.start);
  const cur = completed(slice(txns, w.start, NOW + 1));
  const prev = completed(slice(txns, prevStart, w.start));
  const codes: AssetCode[] = ['USDC', 'USDT', 'EUROC'];
  return {
    range,
    generatedAt: iso(NOW),
    bucket: w.bucket,
    assets: codes.map((code) => {
      const list = cur.filter((t) => t.asset === code);
      const before = prev.filter((t) => t.asset === code);
      return {
        code,
        volumeUsd: sumUsd(list),
        count: list.length,
        previousVolumeUsd: sumUsd(before),
        previousCount: before.length,
        series: bucketSeries(w, list, (t) => t.usd).map((value, i) => ({ t: iso(w.starts[i]!), value })),
      };
    }),
  };
}

export function userAnalytics(range: Range): UserAnalytics {
  const { users } = world();
  const w = windowFor(range);
  const joinedIn = new Array<number>(w.count).fill(0);
  for (const u of users) {
    const i = Math.floor((u.joinedMs - w.start) / w.size);
    if (i >= 0 && i < w.count) joinedIn[i] = joinedIn[i]! + 1;
  }
  const activeSets = Array.from({ length: w.count }, () => new Set<string>());
  for (const u of users) {
    if (!countable(u)) continue;
    for (let k = u.sessions.length - 1; k >= 0 && u.sessions[k]! >= w.start; k--) {
      const i = Math.floor((u.sessions[k]! - w.start) / w.size);
      if (i < w.count) activeSets[i]!.add(u.id);
    }
  }
  const before = users.filter((u) => u.joinedMs < w.start).length;
  let running = before;

  // Weekly signup cohorts: the eight most recent full weeks.
  const weekStart = TODAY - 6 * DAY;
  const cohorts: RetentionCohort[] = [];
  const base = weekStart - 7 * 7 * DAY;
  for (let c = 0; c < 8; c++) {
    const start = base + c * 7 * DAY;
    const members = users.filter((u) => u.joinedMs >= start && u.joinedMs < start + 7 * DAY);
    const retained: Array<number | null> = [];
    for (let k = 0; k < 8; k++) {
      const week = c + k;
      if (base + week * 7 * DAY > NOW) {
        retained.push(null);
        continue;
      }
      const from = base + week * 7 * DAY;
      const n = members.filter((u) => sessionIn(u, from, from + 7 * DAY)).length;
      retained.push(members.length ? n / members.length : 0);
    }
    cohorts.push({ cohort: iso(start), size: members.length, retained });
  }

  return {
    range,
    generatedAt: iso(NOW),
    bucket: w.bucket,
    newUsers: w.starts.map((t, i) => ({ t: iso(t), value: joinedIn[i]! })),
    activeUsers: w.starts.map((t, i) => ({ t: iso(t), value: activeSets[i]!.size })),
    totalUsers: w.starts.map((t, i) => {
      running += joinedIn[i]!;
      return { t: iso(t), value: running };
    }),
    retention: cohorts,
  };
}
