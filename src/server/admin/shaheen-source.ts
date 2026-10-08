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
