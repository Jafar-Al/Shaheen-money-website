/**
 * The console's audit log: sign-ins and their failures, lockouts, second
 * factors refused, sign-outs and exports. Written on the server only, with
 * addresses and accounts already masked, so the log never holds a full IP
 * or a full email of someone who was refused. The Security page reads it.
 */
import { randomId } from './crypto';
import { list, push } from './store';

export type AuditKind =
  | 'sign_in'
  | 'sign_in_failed'
  | 'mfa_failed'
  | 'locked'
  | 'sign_out'
  | 'session_revoked'
  | 'export'
  | 'message_sent'
  | 'money_sent'
  | 'refund_issued';

export interface AuditEvent {
  id: string;
  at: string;
  kind: AuditKind;
  /** Masked account, e.g. "l•••@shaheen.money". */
  account: string;
  /** The admin's name, when the event is theirs (a sign-in, an export). */
  actor: string | null;
  ipMasked: string;
  location: string | null;
  device: string | null;
  reason?: string | undefined;
  detail?: string | undefined;
}

const KEY = 'ops:audit';
const MAX = 1000;

export const maskEmail = (email: string) => {
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}•••${email.slice(at)}` : '•••';
};

export async function record(e: Omit<AuditEvent, 'id' | 'at'>): Promise<void> {
  const event: AuditEvent = { id: `aud_${randomId(9)}`, at: new Date().toISOString(), ...e };
  // Also in the platform's logs (Vercel → Logs), where it outlives the list.
  console.info(`[ops-audit] ${JSON.stringify(event)}`);
  await push(KEY, JSON.stringify(event), MAX);
}

export async function recent(count = 300): Promise<AuditEvent[]> {
  const rows = await list(KEY, count);
  const out: AuditEvent[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r) as AuditEvent);
    } catch {
      /* skip a damaged row */
    }
  }
  return out;
}
