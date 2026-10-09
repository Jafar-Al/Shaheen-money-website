/**
 * The Operations Command Center's data contract.
 *
 * Every screen is built against these types and nothing else. The mock
 * layer (src/admin/mock) and the HTTP layer (src/admin/services/http)
 * both produce them, so replacing one with the other changes no UI code.
 * ADMIN_API_INTEGRATION.md documents the endpoint behind each function and
 * ADMIN_DATA_REQUIREMENTS.md the fields the backend needs to expose.
 *
 * Conventions:
 *  · times are ISO 8601 strings in UTC;
 *  · money on a single record is a decimal string ("250.00"), never a float;
 *    aggregates (volumes, chart points) are numbers in US dollars, which is
 *    precise enough for display and is what the charts need;
 *  · a field the backend cannot provide yet is optional or nullable, and the
 *    screen that shows it says "Not available" instead of inventing it.
 */

// ── Shared ───────────────────────────────────────────────────────────────
export type ISODate = string;
/** A decimal amount as a string, e.g. "1250.00". */
export type Decimal = string;
/** ISO 3166-1 alpha-2, e.g. "JO". */
export type CountryCode = string;

export type AssetCode = 'USDC' | 'USDT' | 'EUROC';
export type FlowType = 'receive' | 'send' | 'payment' | 'cash_out';
/** Time window for a metric or a chart. */
export type Range = '24h' | '7d' | '30d' | '90d' | '1y';
export type SortDir = 'asc' | 'desc';

export interface Page<T> {
  items: T[];
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** One headline figure, with the same figure for the previous window. */
export interface Metric {
  value: number;
  /** The same measure over the previous window of equal length; null when unknown. */
  previous: number | null;
  unit: 'count' | 'usd';
  /** Oldest first, evenly spaced across the window: drawn as the sparkline. */
  series?: number[] | undefined;
}

export interface SeriesPoint {
  /** Start of the bucket. */
  t: ISODate;
  value: number;
}

// ── Roles, permissions, sessions ─────────────────────────────────────────
export type Role = 'USER' | 'ADMIN' | 'OPERATIONS' | 'COMPLIANCE' | 'SUPPORT';

export type Permission =
  | 'console:access'
  | 'users:read'
  | 'users:read_pii'
  | 'users:export'
  | 'transactions:read'
  | 'transactions:export'
  | 'connectors:read'
  | 'connectors:export'
  | 'network:read'
  | 'assets:read'
  | 'analytics:read'
  | 'analytics:export'
  | 'activity:read'
  | 'system:read'
  | 'security:read'
  /** In-app messages, SMS and push notifications to users. */
  | 'messages:send'
  /** Money sent from the master wallet to a user. */
  | 'money:send'
  /** Refunds of a transaction. */
  | 'refunds:issue';

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * What the browser knows about the signed-in admin. Never a token: the
 * recommended setup keeps the session in an httpOnly cookie the page cannot
 * read (ADMIN_AUTH_INTEGRATION.md).
 */
export interface AdminSession {
  admin: AdminIdentity;
  /** Granted by the server. The UI uses them to hide what would be refused; the API enforces them. */
  permissions: Permission[];
  issuedAt: ISODate;
  expiresAt: ISODate;
  /** Opaque id, shown so an admin can match it to the Security page. */
  sessionId: string;
  /** Whether this session was opened with a second factor. */
  secondFactor?: boolean | undefined;
  /** Where the console's figures come from: the Shaheen app's database, or generated demo data. */
  dataSource?: 'shaheen' | 'demo' | undefined;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'not_authorized'
  | 'rate_limited'
  | 'unavailable'
  | 'session_expired'
  /** The account has a second factor: ask for the 6-digit code. */
  | 'mfa_required'
  | 'mfa_invalid'
  /** The server has no accounts or no session secret yet. */
  | 'not_configured';

// ── Command Center ───────────────────────────────────────────────────────
export interface DashboardStats {
  range: Range;
  generatedAt: ISODate;
  totalUsers: Metric;
  newUsers: Metric;
  activeUsers: Metric;
  transactionVolume: Metric;
  activeCountries: Metric;
  activeConnectors: Metric;
}

// ── Money movement ───────────────────────────────────────────────────────
export interface FlowStage {
  type: FlowType;
  volumeUsd: number;
  count: number;
  previousVolumeUsd: number | null;
  /** Volume per bucket, oldest first. */
  series: number[];
}

export interface MoneyMovement {
  range: Range;
  generatedAt: ISODate;
  stages: Record<FlowType, FlowStage>;
  /**
   * Shaheen is self-custodial: users hold their own balances. These are
   * observations of user wallets, not money Shaheen holds.
   */
  store: {
    fundedWallets: number;
    previousFundedWallets: number | null;
    /** Sum of balances in Shaheen wallets, if the backend can observe it. */
    walletBalanceUsd: number | null;
  };
}

// ── Users ────────────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type WalletStatus = 'active' | 'not_created' | 'restricted';

export interface AdminUser {
  id: string;
  name: string;
  /** Masked by the server ("l•••@example.com") for roles without users:read_pii. */
  email: string;
  country: CountryCode;
  joinedAt: ISODate;
  status: UserStatus;
  lastActiveAt: ISODate | null;
  walletStatus?: WalletStatus | undefined;
}

export interface AdminUserDetail extends AdminUser {
  onboarding?: 'complete' | 'in_progress' | undefined;
  appVersion?: string | undefined;
  /** e.g. "iPhone 15 · iOS 18.6" */
  device?: string | undefined;
  platform?: 'ios' | 'android' | undefined;
  /** Totals since the account opened, if the backend aggregates them. */
  totals?: { transactions: number; volumeUsd: number } | undefined;
}

export type UserSortKey = 'name' | 'country' | 'joinedAt' | 'status' | 'lastActiveAt';

export interface UserQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  /**
   * Match `search` against emails as well as names and IDs. The server sets
   * it only for roles with users:read_pii, so a masked email cannot be
   * recovered by searching for it a letter at a time.
   */
  matchEmail?: boolean | undefined;
  status?: UserStatus | undefined;
  country?: CountryCode | undefined;
  sort?: UserSortKey | undefined;
  dir?: SortDir | undefined;
}

export interface UserSummary {
  generatedAt: ISODate;
  total: Metric;
  new30d: Metric;
  active30d: Metric;
  inactive: Metric;
  /** Countries that have at least one user: the filter's options. */
  countries: CountryCode[];
}

// ── Transactions ─────────────────────────────────────────────────────────
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled';

export interface Party {
  kind: 'user' | 'connector' | 'merchant' | 'external';
  id?: string | undefined;
  name: string;
  country: CountryCode;
}

export interface Transaction {
  id: string;
  type: FlowType;
  status: TransactionStatus;
  amount: Decimal;
  asset: AssetCode;
  /** The amount in US dollars at the time of the transaction. */
  usdValue: Decimal;
  from: Party;
  to: Party;
  corridor: { from: CountryCode; to: CountryCode };
  createdAt: ISODate;
  completedAt?: ISODate | null | undefined;
  failureReason?: string | null | undefined;
}

export type TransactionSortKey = 'createdAt' | 'usdValue' | 'status' | 'type';

export interface TransactionQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  type?: FlowType | undefined;
  status?: TransactionStatus | undefined;
  range?: Range | undefined;
  userId?: string | undefined;
  connectorId?: string | undefined;
  sort?: TransactionSortKey | undefined;
  dir?: SortDir | undefined;
}

export interface TransactionAnalytics {
  range: Range;
  type: FlowType | 'all';
  generatedAt: ISODate;
  bucket: 'hour' | 'day' | 'week';
  totals: {
    count: number;
    completed: number;
    pending: number;
    failed: number;
    cancelled: number;
    volumeUsd: number;
    previousCount: number | null;
    previousVolumeUsd: number | null;
  };
  /** One point per bucket, oldest first: completed volume, every transaction, and how many completed and failed. */
  series: Array<{ t: ISODate; volumeUsd: number; count: number; completed: number; failed: number }>;
}

// ── Connectors ───────────────────────────────────────────────────────────
export type ConnectorStatus = 'active' | 'inactive' | 'pending';

export interface Connector {
  id: string;
  name: string;
  country: CountryCode;
  city: string;
  status: ConnectorStatus;
  /** Cash-outs handled in the last 30 days. */
  transactionCount: number;
  /** Cash-out volume in the last 30 days, US dollars. */
  volumeUsd: Decimal;
  lastActiveAt: ISODate | null;
}

export interface ConnectorDetail extends Connector {
  onboardedAt?: ISODate | undefined;
  /** Daily cash-outs, last 30 days, oldest first. */
  activity: Array<{ date: ISODate; count: number; volumeUsd: number }>;
}

export type ConnectorSortKey = 'name' | 'country' | 'city' | 'status' | 'transactionCount' | 'volumeUsd' | 'lastActiveAt';

export interface ConnectorQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: ConnectorStatus | undefined;
  country?: CountryCode | undefined;
  sort?: ConnectorSortKey | undefined;
  dir?: SortDir | undefined;
}

export interface ConnectorSummary {
  generatedAt: ISODate;
  total: number;
  active: number;
  inactive: number;
  pending: number;
  countries: CountryCode[];
  cashOut: { volumeUsd: number; count: number; previousVolumeUsd: number | null; previousCount: number | null };
  /** Network-wide daily cash-outs, last 30 days, oldest first. */
  activity: SeriesPoint[];
}

// ── Global network ───────────────────────────────────────────────────────
export interface CountryStat {
  code: CountryCode;
  users: number;
  connectors: number;
  /** Volume that started or ended in this country over the window. */
  volumeUsd: number;
  sentUsd: number;
  receivedUsd: number;
}

export interface Corridor {
  from: CountryCode;
  to: CountryCode;
  volumeUsd: number;
  count: number;
  previousVolumeUsd: number | null;
}

export interface GlobalNetwork {
  range: Range;
  generatedAt: ISODate;
  countries: CountryStat[];
  /** null when the backend does not track corridors yet. */
  corridors: Corridor[] | null;
}

// ── Assets ───────────────────────────────────────────────────────────────
export interface AssetStat {
  code: AssetCode;
  volumeUsd: number;
  count: number;
  previousVolumeUsd: number | null;
  previousCount: number | null;
  /** Completed volume per bucket, oldest first. */
  series: SeriesPoint[];
}

export interface AssetOverview {
  range: Range;
  generatedAt: ISODate;
  bucket: 'hour' | 'day' | 'week';
  assets: AssetStat[];
}

// ── Analytics ────────────────────────────────────────────────────────────
export interface RetentionCohort {
  /** Start of the signup week. */
  cohort: ISODate;
  size: number;
  /** Share of the cohort active in week 0, 1, 2…; null for weeks not reached yet. */
  retained: Array<number | null>;
}

export interface UserAnalytics {
  range: Range;
  generatedAt: ISODate;
  bucket: 'hour' | 'day' | 'week';
  newUsers: SeriesPoint[];
  activeUsers: SeriesPoint[];
  /** Total accounts at the end of each bucket. */
  totalUsers: SeriesPoint[];
  /** null when the backend does not compute retention. */
  retention: RetentionCohort[] | null;
}

// ── Activity ─────────────────────────────────────────────────────────────
export type ActivityCategory = 'users' | 'transactions' | 'connectors' | 'security' | 'system';

export type ActivityKind =
  | 'user.registered'
  | 'user.onboarded'
  | 'transaction.completed'
  | 'transaction.failed'
  | 'cashout.completed'
  | 'connector.activated'
  | 'connector.deactivated'
  | 'admin.signed_in'
  | 'security.alert'
  | 'system.degraded'
  | 'system.resolved';

export interface ActivitySubject {
  type: 'user' | 'transaction' | 'connector' | 'admin' | 'service';
  id: string;
  label: string;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  category: ActivityCategory;
  at: ISODate;
  severity: 'info' | 'notice' | 'warning' | 'critical';
  subject?: ActivitySubject | undefined;
  /** Optional facts the line can mention. */
  amountUsd?: number | undefined;
  asset?: AssetCode | undefined;
  country?: CountryCode | undefined;
  detail?: string | undefined;
}

export interface ActivityQuery {
  category?: ActivityCategory | undefined;
  cursor?: string | undefined;
  limit: number;
}

// ── System health ────────────────────────────────────────────────────────
export type ServiceStatus = 'operational' | 'degraded' | 'down';
export type ServiceId = 'api' | 'auth' | 'wallets' | 'transfers' | 'payments' | 'cashout' | 'connectors' | 'notifications';

export interface ServiceHealth {
  id: ServiceId;
  status: ServiceStatus;
  /** Percent, last 30 days. */
  uptime30d: number | null;
  latencyP95Ms: number | null;
  checkedAt: ISODate;
  /** One entry per day, last 30 days, oldest first: the worst status that day. */
  history: Array<{ date: ISODate; status: ServiceStatus | 'no_data' }>;
  message?: string | undefined;
}

export interface Incident {
  id: string;
  serviceId: ServiceId;
  status: ServiceStatus;
  title: string;
  startedAt: ISODate;
  resolvedAt: ISODate | null;
}

export interface SystemHealth {
  /** The worst status across services. */
  status: ServiceStatus;
  checkedAt: ISODate;
  services: ServiceHealth[];
  incidents: Incident[];
}

// ── Security ─────────────────────────────────────────────────────────────
export interface AdminSessionRecord {
  id: string;
  adminName: string;
  role: Role;
  device: string;
  location: string | null;
  /** Masked by the server, e.g. "185.23.x.x". */
  ipMasked: string;
  startedAt: ISODate;
  lastSeenAt: ISODate;
  current: boolean;
}

export interface SignInAttempt {
  id: string;
  at: ISODate;
  /** Masked by the server, e.g. "l•••@shaheen.money". */
  account: string;
  ipMasked: string;
  location: string | null;
  outcome: 'success' | 'failure';
  reason?: 'invalid_credentials' | 'not_authorized' | 'rate_limited' | 'mfa_failed' | 'no_second_factor' | undefined;
}

export interface SecurityEvent {
  id: string;
  at: ISODate;
  kind: 'session.revoked' | 'role.changed' | 'mfa.failed' | 'account.locked' | 'export.created' | 'new_device' | 'message.sent' | 'money.sent' | 'refund.issued';
  severity: 'info' | 'notice' | 'warning' | 'critical';
  actor: string | null;
  detail: string | null;
}

export interface SecurityOverview {
  generatedAt: ISODate;
  /** 'instance' when the log is kept per server instance (no shared store): it may be incomplete. */
  storage?: 'shared' | 'instance' | undefined;
  activeSessions: AdminSessionRecord[];
  failedSignIns24h: number;
  failedSignInsPrevious24h: number | null;
  adminSignIns7d: number;
  recentSignIns: SignInAttempt[];
  failedAttempts: SignInAttempt[];
  events: SecurityEvent[];
}

// ── Search and export ────────────────────────────────────────────────────
export interface SearchResults {
  users: Array<Pick<AdminUser, 'id' | 'name' | 'email' | 'country' | 'status'>>;
  transactions: Array<Pick<Transaction, 'id' | 'type' | 'status' | 'amount' | 'asset' | 'createdAt'>>;
  connectors: Array<Pick<Connector, 'id' | 'name' | 'city' | 'country' | 'status'>>;
}

export type ExportKind = 'users' | 'transactions' | 'connectors' | 'analytics';

// ── Actions (administrators only) ─────────────────────────────────────────

/** How a message reaches people: inside the app, by SMS, or as a push notification. */
export type Channel = 'in_app' | 'sms' | 'push';
export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania';

/** Who receives a message: chosen users, or everyone in some countries or continents. */
export type Audience =
  | { kind: 'users'; userIds: string[] }
  | { kind: 'countries'; countries: CountryCode[] }
  | { kind: 'continents'; continents: Continent[] };

export interface MessageRequest {
  channel: Channel;
  audience: Audience;
  /** In-app and push only (required for push). */
  title?: string | undefined;
  body: string;
}

/** The administrator who acted, passed to the data source with every action. */
export interface ActionActor {
  id: string;
  name: string;
}

export interface MessageResult {
  id: string;
  /** People it was sent to (after the app removes those it cannot reach). */
  recipients: number;
  sentAt: ISODate;
}

/** The company's master wallet, which money sent from the console comes from. */
export interface MasterWallet {
  generatedAt: ISODate;
  balances: Array<{ asset: AssetCode; amount: Decimal; usdValue: Decimal }>;
}

export interface MoneyTransferRequest {
  userId: string;
  asset: AssetCode;
  amount: Decimal;
  note?: string | undefined;
  /** The same key twice is refused: a retried request never pays twice. */
  idempotencyKey: string;
}

export interface RefundRequest {
  transactionId: string;
  /** Leave out for the full amount. */
  amount?: Decimal | undefined;
  reason: string;
  idempotencyKey: string;
}

export interface MoneyResult {
  /** The new transaction's ID. */
  transactionId: string;
  status: 'completed' | 'pending';
  createdAt: ISODate;
}

/** One action, as the Actions page lists it (from the audit log). */
export interface ActionRecord {
  id: string;
  at: ISODate;
  kind: 'message' | 'money' | 'refund';
  actor: string | null;
  detail: string;
}

export interface ExportFile {
  filename: string;
  blob: Blob;
  rows: number;
}
