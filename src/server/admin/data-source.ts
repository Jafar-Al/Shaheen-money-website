/**
 * Where the console's figures come from, on the server.
 *
 * Everything around this interface is done: sign-in, sessions, second
 * factor, lockouts, the permission check on every request, masking of
 * emails for roles without users:read_pii, CSV exports and their audit
 * entries, the audit-based Security page. What remains is to answer these
 * questions from the Shaheen app's database, in one file:
 * src/server/admin/shaheen-source.ts.
 *
 * Rules for an implementation:
 *  · return full data (full emails): the API layer masks per role;
 *  · page, filter and sort in the database, never in memory;
 *  · never return passwords, private keys, recovery phrases or tokens;
 *  · return null for a record that does not exist (the API answers 404);
 *  · the shapes, units and definitions are in src/admin/types/admin.ts and
 *    ADMIN_DATA_REQUIREMENTS.md.
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
  FlowType,
  GlobalNetwork,
  MoneyMovement,
  Page,
  Range,
  SearchResults,
  SystemHealth,
  Transaction,
  TransactionAnalytics,
  TransactionQuery,
  UserAnalytics,
  UserQuery,
  UserSummary,
} from '../../admin/types/admin';
import { dataSourceName } from './settings';

export interface AdminDataSource {
  getDashboardStats(range: Range): Promise<DashboardStats>;
  getMoneyMovement(range: Range): Promise<MoneyMovement>;

  getUserSummary(): Promise<UserSummary>;
  getUsers(query: UserQuery): Promise<Page<AdminUser>>;
  getUserById(id: string): Promise<AdminUserDetail | null>;

  getTransactions(query: TransactionQuery): Promise<Page<Transaction>>;
  getTransactionById(id: string): Promise<Transaction | null>;
  getTransactionAnalytics(range: Range, type: FlowType | 'all'): Promise<TransactionAnalytics>;

  getConnectorSummary(): Promise<ConnectorSummary>;
  getConnectors(query: ConnectorQuery): Promise<Page<Connector>>;
  getConnectorById(id: string): Promise<ConnectorDetail | null>;

  getGlobalNetwork(range: Range): Promise<GlobalNetwork>;
  getAssets(range: Range): Promise<AssetOverview>;
  getUserAnalytics(range: Range): Promise<UserAnalytics>;
  getActivity(query: ActivityQuery): Promise<CursorPage<ActivityEvent>>;
  getSystemHealth(): Promise<SystemHealth>;

  /**
   * Up to five users, transactions and Connectors matching free text (ID,
   * name, city). Users' emails are matched only when options.matchEmail is
   * true, which the server sets for roles with users:read_pii.
   */
  search(query: string, options?: { matchEmail?: boolean }): Promise<SearchResults>;
}

export { NotConnectedError, SourceUnavailableError } from './errors';

export interface SourceOptions {
  /** Demo only: a state to show (slow, empty, error, degraded), from the Account page. */
  scenario?: string | undefined;
}

export async function dataSource(options: SourceOptions = {}): Promise<AdminDataSource> {
  if (dataSourceName() === 'demo') {
    const { createDemoSource } = await import('../../admin/mock/source');
    return createDemoSource(options.scenario);
  }
  const { shaheenSource } = await import('./shaheen-source');
  return shaheenSource;
}
