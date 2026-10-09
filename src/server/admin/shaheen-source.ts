/**
 * ════════════════════════════════════════════════════════════════════════
 *  THE ONE FILE TO CONNECT: the Shaheen app's database → the console.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Replace each `notConnected()` with a query against the Shaheen app's
 * database (or its internal API) that returns the shape named in the
 * function's type. Nothing else in the console needs to change: sign-in,
 * sessions, second factor, permissions, masking, exports and the audit log
 * are already handled around this file (src/pages/api/admin/[...path].ts).
 *
 *  · Field meanings and how each figure is computed:  ADMIN_DATA_REQUIREMENTS.md
 *  · The exact types:                                  src/admin/types/admin.ts
 *  · A complete working example of every function:     src/admin/mock/source.ts
 *    (the demo source, on generated data)
 *
 * Database credentials go in server environment variables (Vercel →
 * Environment Variables) and are read here; never in a PUBLIC_ variable.
 *
 * ── SECURITY RULES FOR THIS FILE (read before writing any query) ─────────
 *
 *  1. Parameterised queries only. Every value that comes from a request
 *     (search, IDs, cursors, filters) is a bound parameter: $1, ?, or your
 *     driver's placeholder. Never build SQL by joining strings or template
 *     literals with request values, not even "just for the search box".
 *  2. Sort and filter keys arrive already checked against fixed lists
 *     (router.ts), but still map them to column names through a fixed object
 *     here, e.g. { joinedAt: 'created_at' }[query.sort]. Never put a request
 *     value into a column name, table name or ORDER BY directly.
 *  3. A read-only database user. The console only reads: connect with a user
 *     that has SELECT on the tables it needs and nothing else (no INSERT,
 *     UPDATE, DELETE, DDL). If this file is ever compromised, it can change
 *     nothing.
 *  4. Encrypted connection (TLS) to the database, credentials in server
 *     environment variables only (never PUBLIC_, never in this file, never
 *     committed). Rotate them if they are ever pasted anywhere.
 *  5. Never return secrets: passwords or their hashes, private keys, seed or
 *     recovery phrases, session or API tokens, 2FA secrets, full card or bank
 *     numbers, government ID numbers. Select the columns you need by name;
 *     never SELECT *.
 *  6. Return emails in full; the router masks them per role. Match a search
 *     against emails only when query.matchEmail (or options.matchEmail) is
 *     true: otherwise a role that sees masked emails could recover them by
 *     searching a letter at a time.
 *  7. Page, filter and sort in the database (LIMIT/OFFSET or keyset), with a
 *     statement timeout, so no request can make the database scan everything.
 *  8. Do not log query values that contain personal data, and do not put
 *     database error text into thrown messages: throw SourceUnavailableError
 *     (the console says "try again"), log the detail server-side only.
 *
 * Asking an AI assistant to write this file? Paste these eight rules into the
 * prompt and check its result against them line by line.
 *
 * When every function below reads the real data, set `connected` to true.
 * From that deploy on, the demo is gone for good: no generated figures and
 * no demo accounts, whatever ADMIN_DEMO or ADMIN_DATA_SOURCE say
 * (src/server/admin/mode.ts). Until then a deployment with ADMIN_DEMO=true
 * shows generated data, stamped "Mock data" on every screen.
 */
import type { AdminDataSource } from './data-source';
import { NotConnectedError } from './errors';

/**
 * Set to true when every function in this file reads the Shaheen app's
 * database. It switches the demo off everywhere: real data and the
 * ADMIN_ACCOUNTS staff accounts only.
 */
export const connected: boolean = false;

const notConnected = (): never => {
  throw new NotConnectedError();
};

export const shaheenSource: AdminDataSource = {
  // Command Center
  getDashboardStats: async (_range) => notConnected(),
  getMoneyMovement: async (_range) => notConnected(),

  // Users
  getUserSummary: async () => notConnected(),
  getUsers: async (_query) => notConnected(),
  getUserById: async (_id) => notConnected(),

  // Transactions
  getTransactions: async (_query) => notConnected(),
  getTransactionById: async (_id) => notConnected(),
  getTransactionAnalytics: async (_range, _type) => notConnected(),

  // Connectors
  getConnectorSummary: async () => notConnected(),
  getConnectors: async (_query) => notConnected(),
  getConnectorById: async (_id) => notConnected(),

  // Network, assets, analytics
  getGlobalNetwork: async (_range) => notConnected(),
  getAssets: async (_range) => notConnected(),
  getUserAnalytics: async (_range) => notConnected(),

  // Activity and health
  getActivity: async (_query) => notConnected(),
  getSystemHealth: async () => notConnected(),

  // The command palette
  search: async (_query) => notConnected(),
};
