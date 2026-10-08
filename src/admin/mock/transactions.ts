/**
 * MOCK DATA — transactions. Generated day by day over the mock world's
 * history from the mock users and Connectors, so every figure in the
 * console (volumes, corridors, Connector activity, a user's history) is
 * computed from the same records and agrees with every other figure.
 */
import type { AssetCode, CountryCode, FlowType, Party, Transaction, TransactionStatus } from '../types/admin';
import type { MockConnector } from './connectors';
import { isHome, type MockUser } from './users';
import { DAY, HISTORY_DAYS, HOUR, HOUR_WEIGHTS, MIN, NOW, TODAY, iso, stream, type Stream } from './seed';

export interface MockTxn extends Transaction {
  ms: number;
  usd: number;
  userId: string;
  connectorId?: string | undefined;
}

const TYPES: ReadonlyArray<readonly [FlowType, number]> = [
  ['receive', 34],
  ['send', 26],
  ['payment', 22],
  ['cash_out', 18],
];

/** Where incoming money is sent from: where people earn. */
const ORIGINS: ReadonlyArray<readonly [CountryCode, number]> = [
  ['AE', 22],
  ['SA', 18],
  ['US', 10],
  ['GB', 9],
  ['DE', 9],
  ['QA', 8],
  ['TR', 5],
  ['CA', 5],
  ['FR', 4],
];

const HOMES: ReadonlyArray<readonly [CountryCode, number]> = [
  ['JO', 60],
  ['EG', 25],
  ['LB', 15],
];

const MERCHANTS = ['Weibdeh Coffee Roasters', 'Jabal Books', 'Sweifieh Electronics', 'Nile View Market', 'Cedar Mobile Top-up', 'Harbour Fresh Market', 'Desert Bloom Florist', 'Old Town Tailor', 'Corner Bakery No. 7', 'Northgate Pharmacy', 'Citadel Hardware', 'Blue Door Café', 'Olive Grove Grocer', 'Seven Hills Optics'];

const FAILURES = ['Network confirmation timed out', 'Recipient wallet not reachable', 'Quote expired before signing', 'Connector could not hand over cash'];

const EU = new Set(['DE', 'FR']);
const EUROC_USD = 1.09;

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

export function generateTransactions(users: MockUser[], connectors: MockConnector[]): MockTxn[] {
  const r = stream('transactions');
  const txns: MockTxn[] = [];

  // Users by country, already in join order: a binary search finds who had joined by a given time.
  const byCountry = new Map<CountryCode, MockUser[]>();
  for (const u of users) {
    if (!byCountry.has(u.country)) byCountry.set(u.country, []);
    byCountry.get(u.country)!.push(u);
  }
  const joinedBy = (list: MockUser[], t: number) => {
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid]!.joinedMs <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const pickUser = (country: CountryCode, t: number, s: Stream): MockUser | null => {
    const list = byCountry.get(country);
    if (!list) return null;
    const n = joinedBy(list, t);
    if (n === 0) return null;
    let fallback: MockUser | null = null;
    for (let k = 0; k < 6; k++) {
      const u = list[s.int(0, n - 1)]!;
      if (u.propensity === 0 || (u.churnMs !== null && t > u.churnMs)) continue;
      fallback = u;
      if (s.chance(u.propensity)) return u;
    }
    return fallback;
  };
  const countries = [...byCountry.keys()];
  const userWeights = countries.map((c) => [c, byCountry.get(c)!.length] as const);

  const connectorsBy = new Map<CountryCode, MockConnector[]>();
  for (const c of connectors) {
    if (!connectorsBy.has(c.country)) connectorsBy.set(c.country, []);
    connectorsBy.get(c.country)!.push(c);
  }
  const pickConnector = (country: CountryCode, t: number, s: Stream) => {
    const open = (connectorsBy.get(country) ?? []).filter(
      (c) => c.status !== 'pending' && c.onboardedMs <= t && (c.stoppedMs === null || t < c.stoppedMs),
    );
    return open.length ? s.weighted(open.map((c) => [c, c.weight] as const)) : null;
  };

  const party = (u: MockUser): Party => ({ kind: 'user', id: u.id, name: u.name, country: u.country });

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const dayStart = TODAY - d * DAY;
    const progress = (HISTORY_DAYS - d) / HISTORY_DAYS;
    const weekday = new Date(dayStart).getDay();
    const seasonal = weekday === 4 ? 1.15 : weekday === 5 ? 0.9 : 1;
    const count = Math.round((4 + 116 * progress ** 1.6) * seasonal * (0.85 + r.next() * 0.3));

    for (let i = 0; i < count; i++) {
      const ms = dayStart + r.weighted(HOUR_WEIGHTS) * HOUR + r.int(0, 3599) * 1000;
      if (ms > NOW) continue;
      let type = r.weighted(TYPES);

      // Who is transacting, and where.
      let userCountry: CountryCode;
      if (type === 'receive' || type === 'cash_out') userCountry = r.chance(0.88) ? r.weighted(HOMES) : r.weighted(userWeights);
      else if (type === 'send') userCountry = r.chance(0.55) ? r.weighted(ORIGINS) : r.weighted(HOMES);
      else userCountry = r.weighted(userWeights);
      const user = pickUser(userCountry, ms, r);
      if (!user) continue;

      let connector: MockConnector | null = null;
      if (type === 'cash_out') {
        connector = pickConnector(user.country, ms, r);
        if (!connector) type = 'send';
      }

      let from: Party;
      let to: Party;
      if (type === 'receive') {
        const origin = isHome(user.country) ? (r.chance(0.9) ? r.weighted(ORIGINS) : user.country) : r.chance(0.7) ? user.country : r.weighted(ORIGINS);
        const sender = r.chance(0.55) ? pickUser(origin, ms, r) : null;
        from = sender && sender.id !== user.id ? party(sender) : { kind: 'external', name: 'External wallet', country: origin };
        to = party(user);
      } else if (type === 'send') {
        const dest = isHome(user.country) ? (r.chance(0.8) ? user.country : r.weighted(HOMES)) : r.chance(0.8) ? r.weighted(HOMES) : user.country;
        const recipient = r.chance(0.85) ? pickUser(dest, ms, r) : null;
        from = party(user);
        to = recipient && recipient.id !== user.id ? party(recipient) : { kind: 'external', name: 'External wallet', country: dest };
      } else if (type === 'payment') {
        from = party(user);
        to = { kind: 'merchant', name: r.pick(MERCHANTS), country: user.country };
      } else {
        from = party(user);
        to = { kind: 'connector', id: connector!.id, name: connector!.name, country: connector!.country };
      }

      const eu = EU.has(from.country) || EU.has(to.country);
      const asset: AssetCode = eu && r.chance(0.4) ? 'EUROC' : r.chance(0.66) ? 'USDC' : 'USDT';
      let value =
        type === 'receive'
          ? r.lognormal(260, 0.75)
          : type === 'send'
            ? r.lognormal(110, 0.8)
            : type === 'payment'
              ? r.lognormal(38, 0.85)
              : r.lognormal(170, 0.6);
      value = Math.min(Math.max(value, type === 'payment' ? 1 : 10), type === 'payment' ? 900 : 5000);
      value = type === 'cash_out' ? Math.max(20, round(value, 10)) : round(value, 0.01);
      const usd = asset === 'EUROC' ? value * EUROC_USD : value;

      const age = NOW - ms;
      let status: TransactionStatus;
      if (age < 90 * MIN && r.chance(0.35)) status = 'pending';
      else {
        const roll = r.next();
        status = roll < 0.942 ? 'completed' : roll < 0.978 ? 'failed' : 'cancelled';
      }
      const settle = type === 'cash_out' ? r.int(2, 25) * MIN : r.int(20, 240) * 1000;

      txns.push({
        id: r.id('txn', 12),
        type,
        status,
        amount: value.toFixed(2),
        asset,
        usdValue: usd.toFixed(2),
        usd,
        from,
        to,
        corridor: { from: from.country, to: to.country },
        createdAt: iso(ms),
        completedAt: status === 'completed' ? iso(Math.min(ms + settle, NOW)) : null,
        failureReason: status === 'failed' ? (type === 'cash_out' ? FAILURES[3]! : r.pick(FAILURES.slice(0, 3))) : null,
        ms,
        userId: user.id,
        connectorId: connector?.id,
      });
    }
  }
  txns.sort((a, b) => a.ms - b.ms);
  return txns;
}
