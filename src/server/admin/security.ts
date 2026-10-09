/**
 * The Security page's data, from this server's own records: the audit log
 * (src/server/admin/audit.ts) and the open sessions. Nothing here comes
 * from the data source or is generated: in demo mode too, these are the
 * real sign-ins to this console.
 */
import type { AdminSessionRecord, SecurityEvent, SecurityOverview, SignInAttempt } from '../../admin/types/admin';
import { accounts } from './accounts';
import { recent, type AuditEvent } from './audit';
import { openSessions, type Client, type Current } from './session';
import { isShared } from './store';

const HOUR = 3_600_000;

function attempt(e: AuditEvent): SignInAttempt {
  return {
    id: e.id,
    at: e.at,
    account: e.account,
    ipMasked: e.ipMasked,
    location: e.location,
    outcome: e.kind === 'sign_in' ? 'success' : 'failure',
    reason: e.kind === 'mfa_failed' ? 'mfa_failed' : e.kind === 'locked' ? 'rate_limited' : (e.reason as SignInAttempt['reason']),
  };
}

const EVENT_KIND: Partial<Record<AuditEvent['kind'], SecurityEvent['kind']>> = {
  locked: 'account.locked',
  mfa_failed: 'mfa.failed',
  export: 'export.created',
  message_sent: 'message.sent',
  money_sent: 'money.sent',
  refund_issued: 'refund.issued',
  session_revoked: 'session.revoked',
};

export async function securityOverview(me: Current, who: Client): Promise<SecurityOverview> {
  const now = Date.now();
  const log = await recent(1000);
  const since = (ms: number) => (e: AuditEvent) => now - Date.parse(e.at) < ms;
  const failures = log.filter((e) => e.kind === 'sign_in_failed' || e.kind === 'mfa_failed');
  const signIns = log.filter((e) => e.kind === 'sign_in');

  const people = new Map((await accounts()).map((a) => [a.id, a]));
  const activeSessions: AdminSessionRecord[] = [];
  for (const s of await openSessions()) {
    const a = people.get(s.aid);
    if (!a) continue;
    activeSessions.push({
      id: s.sid,
      adminName: a.name,
      role: a.role,
      device: s.device,
      location: s.location,
      ipMasked: s.ipMasked,
      startedAt: s.startedAt,
      lastSeenAt: s.lastSeenAt,
      current: s.sid === me.claims.sid,
    });
  }
  // Without a shared store this instance may not know the caller's own session.
  if (!activeSessions.some((s) => s.current)) {
    activeSessions.unshift({
      id: me.claims.sid,
      adminName: me.account.name,
      role: me.account.role,
      ...who,
      startedAt: new Date(me.claims.iat).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      current: true,
    });
  }
  activeSessions.sort((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

  return {
    generatedAt: new Date(now).toISOString(),
    storage: isShared() ? 'shared' : 'instance',
    activeSessions,
    failedSignIns24h: failures.filter(since(24 * HOUR)).length,
    failedSignInsPrevious24h: failures.filter((e) => {
      const age = now - Date.parse(e.at);
      return age >= 24 * HOUR && age < 48 * HOUR;
    }).length,
    adminSignIns7d: signIns.filter(since(7 * 24 * HOUR)).length,
    recentSignIns: signIns.slice(0, 12).map(attempt),
    failedAttempts: [...failures, ...log.filter((e) => e.kind === 'locked')]
      .filter(since(24 * HOUR))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 20)
      .map(attempt),
    events: log
      .filter((e) => EVENT_KIND[e.kind])
      .slice(0, 40)
      .map((e) => ({
        id: e.id,
        at: e.at,
        kind: EVENT_KIND[e.kind]!,
        severity: e.kind === 'locked' || e.kind === 'mfa_failed' ? 'warning' : 'info',
        actor: e.actor,
        detail: e.detail ?? (e.kind === 'mfa_failed' ? `Second factor rejected for ${e.account}.` : null),
      })),
  };
}
