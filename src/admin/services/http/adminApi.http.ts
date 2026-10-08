/**
 * AdminApi over HTTP: this site's /api/admin (src/server/admin/router.ts).
 *
 * The server checks the session and the permission named beside each call
 * on every request, masks emails for roles without users:read_pii, and
 * answers from the configured data source (ADMIN_API_INTEGRATION.md).
 * The console hiding a link is not a control; the server is.
 */
import type { AdminApi } from '../adminApi';
import type { ExportFile } from '../../types/admin';
import { request } from './client';

const pageQuery = (q: { page: number; pageSize: number; sort?: string | undefined; dir?: string | undefined }) => ({
  page: q.page,
  pageSize: q.pageSize,
  sort: q.sort,
  dir: q.dir,
});

export const httpApi: AdminApi = {
  // console:access
  getDashboardStats: (range, o) => request('/stats', { query: { range }, signal: o?.signal }),
  // transactions:read
  getMoneyMovement: (range, o) => request('/money-movement', { query: { range }, signal: o?.signal }),

  // users:read (emails masked by the server without users:read_pii)
  getUserSummary: (o) => request('/users/summary', { signal: o?.signal }),
  getUsers: (q, o) =>
    request('/users', { query: { ...pageQuery(q), search: q.search, status: q.status, country: q.country }, signal: o?.signal }),
  getUserById: (id, o) => request(`/users/${encodeURIComponent(id)}`, { signal: o?.signal }),

  // transactions:read
  getTransactions: (q, o) =>
    request('/transactions', {
      query: { ...pageQuery(q), search: q.search, type: q.type, status: q.status, range: q.range, userId: q.userId, connectorId: q.connectorId },
      signal: o?.signal,
    }),
  getTransactionById: (id, o) => request(`/transactions/${encodeURIComponent(id)}`, { signal: o?.signal }),
  getTransactionAnalytics: (range, type, o) =>
    request('/transactions/analytics', { query: { range, type: type === 'all' ? undefined : type }, signal: o?.signal }),

  // connectors:read
  getConnectorSummary: (o) => request('/connectors/summary', { signal: o?.signal }),
  getConnectors: (q, o) =>
    request('/connectors', { query: { ...pageQuery(q), search: q.search, status: q.status, country: q.country }, signal: o?.signal }),
  getConnectorById: (id, o) => request(`/connectors/${encodeURIComponent(id)}`, { signal: o?.signal }),

  // network:read, assets:read, analytics:read
  getGlobalNetwork: (range, o) => request('/network', { query: { range }, signal: o?.signal }),
  getAssets: (range, o) => request('/assets', { query: { range }, signal: o?.signal }),
  getUserAnalytics: (range, o) => request('/analytics/users', { query: { range }, signal: o?.signal }),

  // activity:read, system:read, security:read
  getActivity: (q, o) => request('/activity', { query: { category: q.category, cursor: q.cursor, limit: q.limit }, signal: o?.signal }),
  getSystemHealth: (o) => request('/system-health', { signal: o?.signal }),
  getSecurityOverview: (o) => request('/security', { signal: o?.signal }),

  // console:access; results limited to what the session may read
  search: (query, o) => request('/search', { query: { q: query }, signal: o?.signal }),

  // users:export / transactions:export / connectors:export / analytics:export
  async exportData(kind, filters, o): Promise<ExportFile> {
    // Generated on the server, permission-checked and written to the audit log there.
    const res = await request<Response>(`/${kind}/export`, { query: filters, as: 'raw', signal: o?.signal });
    const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1];
    const rows = Number(res.headers.get('x-row-count'));
    return { filename: name ?? `shaheen-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, blob: await res.blob(), rows: Number.isFinite(rows) ? rows : -1 };
  },
};
