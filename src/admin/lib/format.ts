import type {
  ConnectorStatus,
  Decimal,
  FlowType,
  Range,
  ServiceStatus,
  TransactionStatus,
  UserStatus,
  WalletStatus,
} from '../types/admin';

/**
 * How the console writes numbers, money, time and states. Western digits,
 * en-US grouping, as on the public site (src/lib/format.ts). Figures are set
 * in Geist Mono by the components; these functions only produce the text.
 */
const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', opts);
const compactFmt = nf({ notation: 'compact', maximumFractionDigits: 1 });
const compactUsd = nf({ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const wholeUsd = nf({ style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const centsUsd = nf({ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = nf({ maximumFractionDigits: 0 });

export function num(n: number, { compact = false } = {}): string {
  return compact && Math.abs(n) >= 10_000 ? compactFmt.format(n) : intFmt.format(n);
}

/** $1.24M for headline figures, $12,480 for mid-size, $250.00 for a single record. */
export function usd(n: number, { compact = false, cents = false } = {}): string {
  if (compact && Math.abs(n) >= 100_000) return compactUsd.format(n);
  return (cents ? centsUsd : wholeUsd).format(n);
}

/** A record's decimal amount with its asset: "250.00 USDC". */
export function amount(value: Decimal, asset: string): string {
  const n = Number(value);
  return `${Number.isFinite(n) ? centsUsd.format(n).replace('$', '') : value} ${asset}`;
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export interface Delta {
  /** Percent change, or null when there is nothing to compare with. */
  pct: number | null;
  dir: 'up' | 'down' | 'flat';
}

export function delta(value: number, previous: number | null | undefined): Delta {
  if (previous === null || previous === undefined || previous === 0) return { pct: null, dir: 'flat' };
  const p = ((value - previous) / Math.abs(previous)) * 100;
  if (Math.abs(p) < 0.05) return { pct: 0, dir: 'flat' };
  return { pct: p, dir: p > 0 ? 'up' : 'down' };
}

/** "↑ 4.2%" / "↓ 1.0%" / "0.0%". The arrows are in the subset fonts. */
export function deltaText(d: Delta): string {
  if (d.pct === null) return 'No comparison';
  const arrow = d.dir === 'up' ? '↑ ' : d.dir === 'down' ? '↓ ' : '';
  return `${arrow}${Math.abs(d.pct).toFixed(1)}%`;
}

// ── Time ─────────────────────────────────────────────────────────────────
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayMonthFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export const date = (iso: string) => dateFmt.format(new Date(iso));
export const dateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const time = (iso: string) => timeFmt.format(new Date(iso));
export const dayMonth = (iso: string) => dayMonthFmt.format(new Date(iso));
export const weekday = (iso: string) => weekdayFmt.format(new Date(iso));

/** "Just now", "12 min ago", "3 h ago", "Yesterday", "4 days ago", then a date. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86_400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date(iso);
}

/** Axis tick text for a bucket start. */
export function tick(iso: string, bucket: 'hour' | 'day' | 'week'): string {
  return bucket === 'hour' ? time(iso) : dayMonth(iso);
}

// ── Ranges ───────────────────────────────────────────────────────────────
export const RANGE_LABEL: Record<Range, string> = { '24h': '24H', '7d': '7D', '30d': '30D', '90d': '90D', '1y': '1Y' };

const RANGE_WORDS: Record<Range, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '12 months',
};

export const rangeWords = (r: Range) => RANGE_WORDS[r];
export const comparisonLabel = (r: Range) => `vs previous ${RANGE_WORDS[r]}`;

// ── States and kinds ─────────────────────────────────────────────────────
export const FLOW_LABEL: Record<FlowType, string> = {
  receive: 'Receive',
  send: 'Send',
  payment: 'Payment',
  cash_out: 'Cash out',
};

export const TXN_STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending verification',
  suspended: 'Suspended',
};

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = {
  active: 'Active',
  not_created: 'Not created',
  restricted: 'Restricted',
};

export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
};

/**
 * Every state maps to one of five tones (src/admin/styles/admin.css): good
 * (the accent), warn (amber, a triangle), alert (a diamond), quiet (a hollow
 * ring) and muted (a dash). A tone always travels with its word; colour
 * never carries a state alone. A sixth, cash, is not a state: it marks
 * physical cash, in amber, as on the site.
 */
export type Tone = 'good' | 'warn' | 'alert' | 'quiet' | 'muted' | 'cash';

export const TONE: {
  txn: Record<TransactionStatus, Tone>;
  user: Record<UserStatus, Tone>;
  wallet: Record<WalletStatus, Tone>;
  connector: Record<ConnectorStatus, Tone>;
  service: Record<ServiceStatus, Tone>;
} = {
  txn: { completed: 'good', pending: 'quiet', failed: 'alert', cancelled: 'muted' },
  user: { active: 'good', inactive: 'muted', pending: 'quiet', suspended: 'alert' },
  wallet: { active: 'good', not_created: 'muted', restricted: 'warn' },
  connector: { active: 'good', inactive: 'muted', pending: 'quiet' },
  service: { operational: 'good', degraded: 'warn', down: 'alert' },
};

export const ASSET_NAME: Record<string, string> = {
  USDC: 'USD Coin',
  USDT: 'Tether USD',
  EUROC: 'Euro Coin',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/** What each monitored service is, in the console's words. */
export const SERVICE_META: Record<string, { name: string; description: string }> = {
  api: { name: 'API', description: 'Every request from the app and from this console.' },
  auth: { name: 'Authentication', description: 'Sign-in and sessions, for users and for staff.' },
  wallets: { name: 'Wallet services', description: 'Wallet creation and balances.' },
  transfers: { name: 'Transfer services', description: 'Sending and receiving between wallets.' },
  payments: { name: 'Payment services', description: 'Paying a shop from a balance.' },
  cashout: { name: 'Cash-out services', description: 'Cash-out codes and their confirmation.' },
  connectors: { name: 'Connector network', description: 'Connector apps and their availability.' },
  notifications: { name: 'Notifications', description: 'Push notifications and emails.' },
};
