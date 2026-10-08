/**
 * CSV exports, generated on the server so the permission is checked and
 * the export is written to the audit log. The whole filtered set, not one
 * page, read 100 rows at a time from the data source, up to 50,000 rows.
 * The CSV rules (quoting, the formula guard, the byte-order mark) are the
 * console's own (src/admin/lib/csv.ts).
 */
import type { AdminUser, Connector, Transaction } from '../../admin/types/admin';
import { toCsv } from '../../admin/lib/csv';
import type { AdminDataSource } from './data-source';

const MAX_ROWS = 50_000;
const PAGE = 100;

async function all<T, Q extends { page: number; pageSize: number }>(fetch: (q: Q) => Promise<{ items: T[]; total: number }>, query: Omit<Q, 'page' | 'pageSize'>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; out.length < MAX_ROWS; page++) {
    const p = await fetch({ ...query, page, pageSize: PAGE } as Q);
    out.push(...p.items);
    if (p.items.length < PAGE || out.length >= p.total) break;
  }
  return out.slice(0, MAX_ROWS);
}

export interface Built {
  csv: string;
  rows: number;
}

export async function exportUsers(src: AdminDataSource, q: Record<string, string | undefined>, mask: (u: AdminUser) => AdminUser): Promise<Built> {
  const rows = (await all((x) => src.getUsers(x), { search: q.search, status: q.status as never, country: q.country })).map(mask);
  return {
    rows: rows.length,
    csv: toCsv(rows, [
      { header: 'id', value: (u) => u.id },
      { header: 'name', value: (u) => u.name },
      { header: 'email', value: (u) => u.email },
      { header: 'country', value: (u) => u.country },
      { header: 'joined_at', value: (u) => u.joinedAt },
      { header: 'status', value: (u) => u.status },
      { header: 'last_active_at', value: (u) => u.lastActiveAt },
      { header: 'wallet_status', value: (u) => u.walletStatus },
    ]),
  };
}

export async function exportTransactions(src: AdminDataSource, q: Record<string, string | undefined>): Promise<Built> {
  const rows: Transaction[] = await all((x) => src.getTransactions(x), {
    search: q.search,
    type: q.type as never,
    status: q.status as never,
    range: q.range as never,
    userId: q.userId,
  });
  return {
    rows: rows.length,
    csv: toCsv(rows, [
      { header: 'id', value: (t) => t.id },
      { header: 'type', value: (t) => t.type },
      { header: 'status', value: (t) => t.status },
      { header: 'amount', value: (t) => t.amount },
      { header: 'asset', value: (t) => t.asset },
      { header: 'usd_value', value: (t) => t.usdValue },
      { header: 'from', value: (t) => t.from.name },
      { header: 'to', value: (t) => t.to.name },
      { header: 'corridor', value: (t) => `${t.corridor.from}-${t.corridor.to}` },
      { header: 'created_at', value: (t) => t.createdAt },
      { header: 'completed_at', value: (t) => t.completedAt },
    ]),
  };
}

export async function exportConnectors(src: AdminDataSource, q: Record<string, string | undefined>): Promise<Built> {
  const rows: Connector[] = await all((x) => src.getConnectors(x), { search: q.search, status: q.status as never, country: q.country });
  return {
    rows: rows.length,
    csv: toCsv(rows, [
      { header: 'id', value: (c) => c.id },
      { header: 'name', value: (c) => c.name },
      { header: 'country', value: (c) => c.country },
      { header: 'city', value: (c) => c.city },
      { header: 'status', value: (c) => c.status },
      { header: 'cash_outs_30d', value: (c) => c.transactionCount },
      { header: 'volume_usd_30d', value: (c) => c.volumeUsd },
      { header: 'last_active_at', value: (c) => c.lastActiveAt },
    ]),
  };
}

export async function exportAnalytics(src: AdminDataSource, range: string): Promise<Built> {
  const a = await src.getTransactionAnalytics(range as never, 'all');
  return {
    rows: a.series.length,
    csv: toCsv(a.series, [
      { header: 'bucket_start', value: (p) => p.t },
      { header: 'transactions', value: (p) => p.count },
      { header: 'completed', value: (p) => p.completed },
      { header: 'failed', value: (p) => p.failed },
      { header: 'completed_volume_usd', value: (p) => p.volumeUsd.toFixed(2) },
    ]),
  };
}
