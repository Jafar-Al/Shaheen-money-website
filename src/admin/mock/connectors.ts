/**
 * MOCK DATA — Connectors: the shops that hand out cash. Not real
 * businesses: each name is a common shop name plus a shop type, drawn from a
 * fixed seed, in cities the public site already names or their neighbours.
 */
import type { ConnectorDetail, CountryCode } from '../types/admin';
import { DAY, HISTORY_DAYS, NOW, iso, stream } from './seed';

const OWNERS = ['Abu Ahmad', 'Abu Khalil', 'Al Noor', 'Al Rawabi', 'Al Amal', 'Al Salam', 'Al Hayat', 'Al Yasmeen', 'Al Fajr', 'Al Wafa', 'Al Barakeh', 'Al Sharq', 'Zahrat', 'Nile Corner', 'Cedar', 'Al Manara', 'Bab Al Medina', 'Al Waha', 'Al Khair', 'Dar Al Hana'];
const TYPES = ['Mini Market', 'Pharmacy', 'Mobile Shop', 'Grocery', 'Electronics', 'Supermarket', 'Bakery', 'Stationery', 'Bookshop', 'Hardware'];

const CITIES: Record<CountryCode, ReadonlyArray<readonly [string, number]>> = {
  JO: [
    ['Amman', 6],
    ['Zarqa', 2],
    ['Irbid', 2],
    ['Aqaba', 1],
    ['Salt', 1],
    ['Madaba', 1],
  ],
  EG: [
    ['Cairo', 3],
    ['Alexandria', 2],
    ['Giza', 1],
  ],
  LB: [
    ['Beirut', 2],
    ['Tripoli', 1],
    ['Sidon', 1],
  ],
  AE: [
    ['Dubai', 1],
    ['Sharjah', 1],
  ],
};

const PER_COUNTRY: ReadonlyArray<readonly [CountryCode, number]> = [
  ['JO', 34],
  ['EG', 14],
  ['LB', 10],
  ['AE', 6],
];

export interface MockConnector extends ConnectorDetail {
  onboardedMs: number;
  /** When an inactive Connector stopped handing out cash. */
  stoppedMs: number | null;
  /** Relative share of its city's cash-outs. */
  weight: number;
}

export function generateConnectors(): MockConnector[] {
  const r = stream('connectors');
  const out: MockConnector[] = [];
  const names = new Set<string>();
  for (const [country, n] of PER_COUNTRY) {
    for (let i = 0; i < n; i++) {
      let name = `${r.pick(OWNERS)} ${r.pick(TYPES)}`;
      while (names.has(name)) name = `${r.pick(OWNERS)} ${r.pick(TYPES)}`;
      names.add(name);
      const city = r.weighted(CITIES[country]!);
      const roll = r.next();
      const status = roll < 0.11 ? 'pending' : roll < 0.24 ? 'inactive' : 'active';
      // Pending ones applied in the last fortnight; the rest over the network's life.
      const onboardedMs =
        status === 'pending' ? NOW - r.int(1, 14) * DAY - r.int(0, 86_399) * 1000 : NOW - r.int(30, HISTORY_DAYS - 20) * DAY;
      const stoppedMs = status === 'inactive' ? NOW - r.int(32, 140) * DAY : null;
      out.push({
        id: r.id('con', 8),
        name,
        country,
        city,
        status,
        transactionCount: 0,
        volumeUsd: '0.00',
        lastActiveAt: null,
        onboardedAt: iso(onboardedMs),
        onboardedMs,
        stoppedMs: stoppedMs && stoppedMs > onboardedMs ? stoppedMs : status === 'inactive' ? onboardedMs + 20 * DAY : null,
        weight: 0.4 + r.next() * 1.6,
        activity: [],
      });
    }
  }
  return out;
}
