/**
 * The one door between the console's screens and Shaheen's data.
 *
 * Screens import the functions at the bottom of this file and nothing else
 * from the data layer. Behind them: src/admin/services/http/adminApi.http.ts,
 * which calls this site's /api/admin (src/server/admin/router.ts), where
 * every request is checked for a session and a permission and answered
 * from the configured data source. ADMIN_API_INTEGRATION.md documents
 * every call.
 */
import type {
  ActivityEvent,
  ActivityQuery,
  AdminUser,
  AdminUserDetail,
  AssetOverview,
  Connector,
  ConnectorDetail,
  ConnectorQuery,
  ConnectorSummary,
  CursorPage,
  DashboardStats,
  ExportFile,
  ExportKind,
  FlowType,
  GlobalNetwork,
  MoneyMovement,
  Page,
  Range,
  SearchResults,
  SecurityOverview,
  SystemHealth,
  Transaction,
  TransactionAnalytics,
  TransactionQuery,
  UserAnalytics,
  UserQuery,
  UserSummary,
} from '../types/admin';

export interface CallOptions {
  /** Cancels the request when a filter changes before it returns. */
  signal?: AbortSignal | undefined;
}

export interface AdminApi {
  getDashboardStats(range: Range, o?: CallOptions): Promise<DashboardStats>;
  getMoneyMovement(range: Range, o?: CallOptions): Promise<MoneyMovement>;

  getUserSummary(o?: CallOptions): Promise<UserSummary>;
  getUsers(query: UserQuery, o?: CallOptions): Promise<Page<AdminUser>>;
  getUserById(id: string, o?: CallOptions): Promise<AdminUserDetail>;

  getTransactions(query: TransactionQuery, o?: CallOptions): Promise<Page<Transaction>>;
  getTransactionById(id: string, o?: CallOptions): Promise<Transaction>;
  getTransactionAnalytics(range: Range, type: FlowType | 'all', o?: CallOptions): Promise<TransactionAnalytics>;

  getConnectorSummary(o?: CallOptions): Promise<ConnectorSummary>;
  getConnectors(query: ConnectorQuery, o?: CallOptions): Promise<Page<Connector>>;
  getConnectorById(id: string, o?: CallOptions): Promise<ConnectorDetail>;

  getGlobalNetwork(range: Range, o?: CallOptions): Promise<GlobalNetwork>;
  getAssets(range: Range, o?: CallOptions): Promise<AssetOverview>;
  getUserAnalytics(range: Range, o?: CallOptions): Promise<UserAnalytics>;

  getActivity(query: ActivityQuery, o?: CallOptions): Promise<CursorPage<ActivityEvent>>;
  getSystemHealth(o?: CallOptions): Promise<SystemHealth>;
  getSecurityOverview(o?: CallOptions): Promise<SecurityOverview>;

  /** Users, transactions and Connectors matching a free-text query (the command palette). */
  search(query: string, o?: CallOptions): Promise<SearchResults>;
  /** The full filtered set as CSV. The server should generate it, check users:export etc., and log it. */
  exportData(kind: ExportKind, filters: Record<string, string>, o?: CallOptions): Promise<ExportFile>;
}

let impl: Promise<AdminApi> | undefined;
function api(): Promise<AdminApi> {
  impl ??= import('./http/adminApi.http').then((m) => m.httpApi);
  return impl;
}

export const getDashboardStats = (range: Range, o?: CallOptions) => api().then((a) => a.getDashboardStats(range, o));
export const getMoneyMovement = (range: Range, o?: CallOptions) => api().then((a) => a.getMoneyMovement(range, o));
export const getUserSummary = (o?: CallOptions) => api().then((a) => a.getUserSummary(o));
export const getUsers = (q: UserQuery, o?: CallOptions) => api().then((a) => a.getUsers(q, o));
export const getUserById = (id: string, o?: CallOptions) => api().then((a) => a.getUserById(id, o));
export const getTransactions = (q: TransactionQuery, o?: CallOptions) => api().then((a) => a.getTransactions(q, o));
export const getTransactionById = (id: string, o?: CallOptions) => api().then((a) => a.getTransactionById(id, o));
export const getTransactionAnalytics = (range: Range, type: FlowType | 'all', o?: CallOptions) =>
  api().then((a) => a.getTransactionAnalytics(range, type, o));
export const getConnectorSummary = (o?: CallOptions) => api().then((a) => a.getConnectorSummary(o));
export const getConnectors = (q: ConnectorQuery, o?: CallOptions) => api().then((a) => a.getConnectors(q, o));
export const getConnectorById = (id: string, o?: CallOptions) => api().then((a) => a.getConnectorById(id, o));
export const getGlobalNetwork = (range: Range, o?: CallOptions) => api().then((a) => a.getGlobalNetwork(range, o));
export const getAssets = (range: Range, o?: CallOptions) => api().then((a) => a.getAssets(range, o));
export const getUserAnalytics = (range: Range, o?: CallOptions) => api().then((a) => a.getUserAnalytics(range, o));
export const getActivity = (q: ActivityQuery, o?: CallOptions) => api().then((a) => a.getActivity(q, o));
export const getSystemHealth = (o?: CallOptions) => api().then((a) => a.getSystemHealth(o));
export const getSecurityOverview = (o?: CallOptions) => api().then((a) => a.getSecurityOverview(o));
export const search = (query: string, o?: CallOptions) => api().then((a) => a.search(query, o));
export const exportData = (kind: ExportKind, filters: Record<string, string>, o?: CallOptions) =>
  api().then((a) => a.exportData(kind, filters, o));
