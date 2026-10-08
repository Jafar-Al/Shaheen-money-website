/**
 * Which figures the console shows and whether the demo accounts may sign in.
 * A pure function of its inputs (no environment reads), so the rules are
 * tested on their own: tests/admin-mode.spec.ts.
 *
 *  · Once shaheen-source.ts says the app's database is connected, there is
 *    no demo anywhere: real data and the accounts in ADMIN_ACCOUNTS only,
 *    whatever the environment variables say.
 *  · Before that, ADMIN_DEMO=true turns a deployment into a showcase:
 *    generated data, stamped "Mock data", and the demo accounts in
 *    src/admin/mock/admins.ts (for founders and partners to look around).
 *  · Development (`npm run dev`) with no accounts of its own behaves the same
 *    way, so the console works with nothing configured.
 *  · Anything else: the app's data, and the accounts in ADMIN_ACCOUNTS.
 */
export type SourceName = 'shaheen' | 'demo';

export interface ModeInput {
  /** `connected` in shaheen-source.ts. */
  connected: boolean;
  /** `astro dev`, not a deployment. */
  dev: boolean;
  /** ADMIN_DEMO */
  demo?: 'true' | 'false' | undefined;
  /** ADMIN_DATA_SOURCE */
  dataSource?: SourceName | undefined;
  /** ADMIN_ACCOUNTS holds at least one account. */
  hasAccounts: boolean;
}

export interface Mode {
  dataSource: SourceName;
  /** The demo accounts can sign in (they need no second factor). */
  demoAccounts: boolean;
}

export function resolveMode(i: ModeInput): Mode {
  if (i.connected) return { dataSource: 'shaheen', demoAccounts: false };
  if (i.demo === 'true') return { dataSource: 'demo', demoAccounts: true };
  return {
    dataSource: i.dataSource ?? (i.dev ? 'demo' : 'shaheen'),
    demoAccounts: i.dev && !i.hasAccounts && i.demo !== 'false',
  };
}
