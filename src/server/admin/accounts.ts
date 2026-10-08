/**
 * Staff accounts for the operations console.
 *
 * Production: the ADMIN_ACCOUNTS environment variable, a JSON array written
 * by `npm run admin:add` on an administrator's own machine. It holds emails,
 * names, roles, scrypt password hashes and second-factor secrets; never a
 * password. Set it in Vercel → Environment Variables. To remove someone,
 * delete their entry; their sessions stop working on the next request.
 *
 * The demo accounts in src/admin/mock/admins.ts (one per role, a shared
 * published password) are added only while the demo is on: in development
 * with no ADMIN_ACCOUNTS, or on a deployment with ADMIN_DEMO=true, and
 * never once shaheen-source.ts is connected (src/server/admin/mode.ts).
 */
import { ADMIN_ACCOUNTS } from 'astro:env/server';
import type { Role } from '../../admin/types/admin';
import { hashPassword } from './crypto';
import { mode } from './settings';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** scrypt$N$r$p$salt$hash (src/server/admin/crypto.ts). */
  passwordHash: string;
  /** Base32 TOTP secret; absent when the account has no second factor. */
  totpSecret?: string | undefined;
  disabled?: boolean | undefined;
  /** A demo account: generated data only, and no second factor required. */
  demo?: boolean | undefined;
}

const ROLES: readonly Role[] = ['ADMIN', 'OPERATIONS', 'COMPLIANCE', 'SUPPORT', 'USER'];

function parse(raw: string): AdminAccount[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('[ops] ADMIN_ACCOUNTS is not valid JSON; no one can sign in.');
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: AdminAccount[] = [];
  for (const a of data as Array<Record<string, unknown>>) {
    const ok =
      typeof a.id === 'string' &&
      typeof a.name === 'string' &&
      typeof a.email === 'string' &&
      typeof a.passwordHash === 'string' &&
      a.passwordHash.startsWith('scrypt$') &&
      ROLES.includes(a.role as Role);
    if (!ok) {
      console.error('[ops] An ADMIN_ACCOUNTS entry is incomplete and was ignored.');
      continue;
    }
    out.push({
      id: a.id as string,
      name: a.name as string,
      email: (a.email as string).trim().toLowerCase(),
      role: a.role as Role,
      passwordHash: a.passwordHash as string,
      totpSecret: typeof a.totpSecret === 'string' && a.totpSecret ? a.totpSecret : undefined,
      disabled: a.disabled === true,
    });
  }
  return out;
}

let cache: { key: string; accounts: Promise<AdminAccount[]> } | undefined;

async function demoAccounts(): Promise<AdminAccount[]> {
  const { MOCK_ADMINS, MOCK_PASSWORD } = await import('../../admin/mock/admins');
  const passwordHash = await hashPassword(MOCK_PASSWORD);
  return MOCK_ADMINS.map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role, passwordHash, totpSecret: a.totpSecret, demo: true }));
}

async function load(raw: string, withDemo: boolean): Promise<AdminAccount[]> {
  const staff = raw.trim() ? parse(raw) : [];
  if (!withDemo) return staff;
  // A staff account keeps its email if a demo account has the same one.
  const taken = new Set(staff.map((a) => a.email));
  return [...staff, ...(await demoAccounts()).filter((a) => !taken.has(a.email))];
}

export function accounts(): Promise<AdminAccount[]> {
  const raw = ADMIN_ACCOUNTS ?? '';
  const withDemo = demoAccountsAccepted();
  const key = `${withDemo}:${raw}`;
  if (cache?.key !== key) cache = { key, accounts: load(raw, withDemo) };
  return cache.accounts;
}

/** Whether the demo accounts can sign in here (the sign-in page says so). */
export const demoAccountsAccepted = () => mode().demoAccounts;

export async function findByEmail(email: string): Promise<AdminAccount | undefined> {
  const e = email.trim().toLowerCase();
  return (await accounts()).find((a) => a.email === e && !a.disabled);
}

export async function findById(id: string): Promise<AdminAccount | undefined> {
  return (await accounts()).find((a) => a.id === id && !a.disabled);
}
