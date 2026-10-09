import { ADMIN_BASE } from '../config/admin';

export { ADMIN_BASE };

/**
 * The browser always talks to this site's own /api/admin (src/pages/api/
 * admin/[...path].ts). Which data stands behind it, the Shaheen app's
 * database or generated demo data, is decided on the server
 * (ADMIN_DATA_SOURCE) and reported with the session (AdminSession.dataSource).
 */
export const API_PREFIX = '/api/admin';

/** Routes inside the console, built from the one base path. */
export const routes = {
  signIn: `${ADMIN_BASE}/sign-in`,
  commandCenter: `${ADMIN_BASE}/`,
  users: `${ADMIN_BASE}/users`,
  transactions: `${ADMIN_BASE}/transactions`,
  connectors: `${ADMIN_BASE}/connectors`,
  network: `${ADMIN_BASE}/network`,
  money: `${ADMIN_BASE}/money-movement`,
  assets: `${ADMIN_BASE}/assets`,
  analytics: `${ADMIN_BASE}/analytics`,
  activity: `${ADMIN_BASE}/activity`,
  health: `${ADMIN_BASE}/system-health`,
  security: `${ADMIN_BASE}/security`,
  account: `${ADMIN_BASE}/account`,
  actions: `${ADMIN_BASE}/actions`,
} as const;

export type RouteKey = keyof typeof routes;

/** How long the console waits on one API request before showing its error state. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** localStorage keys: preferences only, never data or credentials. */
export const STORAGE = {
  temperature: 'shaheen-ops:temperature',
  density: 'shaheen-ops:density',
  sidebar: 'shaheen-ops:sidebar',
} as const;
