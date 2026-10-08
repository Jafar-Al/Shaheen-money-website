/**
 * DEMO ACCOUNTS — accepted by the server (src/server/admin/accounts.ts) only
 * while the demo is on: under `npm run dev` with no ADMIN_ACCOUNTS, or on a
 * showcase deployment with ADMIN_DEMO=true. Never once
 * src/server/admin/shaheen-source.ts is connected (mode.ts). One per role,
 * so each permission set can be tried; they see generated data only. Not
 * real people, not real credentials: the addresses are on the reserved
 * .test domain and the password is published with the demo. Real staff
 * accounts live in ADMIN_ACCOUNTS (`npm run admin:add`).
 *
 * The compliance account has a second factor, so the two-step sign-in can
 * be tried too: add the secret below to any authenticator app.
 * The USER account is there to show the refusal: an app user who finds the
 * console's address cannot use it.
 */
import type { AdminIdentity } from '../types/admin';

/** The demo password shared by every account here. Never a real one. */
export const MOCK_PASSWORD = 'feather-line-demo';

export const MOCK_ADMINS: ReadonlyArray<AdminIdentity & { totpSecret?: string }> = [
  { id: 'adm_01', name: 'Layla Haddad', email: 'admin@shaheen.test', role: 'ADMIN' },
  { id: 'adm_02', name: 'Omar Khalil', email: 'operations@shaheen.test', role: 'OPERATIONS' },
  { id: 'adm_03', name: 'Rania Saleh', email: 'compliance@shaheen.test', role: 'COMPLIANCE', totpSecret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' },
  { id: 'adm_04', name: 'Yousef Nasser', email: 'support@shaheen.test', role: 'SUPPORT' },
  { id: 'usr_demo', name: 'App User', email: 'app.user@shaheen.test', role: 'USER' },
];
