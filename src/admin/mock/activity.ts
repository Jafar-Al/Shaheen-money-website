/**
 * MOCK DATA — the activity feed, derived from the mock world's last seven
 * days (signups, notable transactions, Connector changes) and its
 * incidents. A real source reads these from the app's event log;
 * ADMIN_API_INTEGRATION.md lists the event kinds. Staff sign-ins are not
 * here: they are real, and the Security page reads them from the audit log.
 */
import type { ActivityEvent } from '../types/admin';
import { systemHealth } from './system';
import { world } from './world';
import { DAY, MIN, NOW, iso, stream } from './seed';

/** Large completed transfers make the feed; small ones would drown it. */
const NOTABLE_USD = 1_000;
const NOTABLE_CASHOUT_USD = 450;

export function activityEvents(degraded: boolean): ActivityEvent[] {
  const { users, txns, connectors } = world();
  const r = stream('activity');
  const since = NOW - 7 * DAY;
  const out: ActivityEvent[] = [];

  for (const u of users) {
    if (u.joinedMs < since) continue;
    out.push({
      id: `evt_reg_${u.id}`,
      kind: 'user.registered',
      category: 'users',
      at: u.joinedAt,
      severity: 'info',
      subject: { type: 'user', id: u.id, label: u.name },
      country: u.country,
    });
    if (u.onboarding === 'complete') {
      const at = u.joinedMs + r.int(6, 90) * MIN;
      if (at <= NOW)
        out.push({
          id: `evt_onb_${u.id}`,
          kind: 'user.onboarded',
          category: 'users',
          at: iso(at),
          severity: 'info',
          subject: { type: 'user', id: u.id, label: u.name },
        });
    }
  }

  for (let i = txns.length - 1; i >= 0 && txns[i]!.ms >= since; i--) {
    const t = txns[i]!;
    const base = { at: t.createdAt, subject: { type: 'transaction' as const, id: t.id, label: t.id }, amountUsd: t.usd, asset: t.asset };
    if (t.status === 'failed') {
      out.push({ ...base, id: `evt_fail_${t.id}`, kind: 'transaction.failed', category: 'transactions', severity: 'warning', detail: t.failureReason ?? undefined });
    } else if (t.status === 'completed' && t.type === 'cash_out' && t.usd >= NOTABLE_CASHOUT_USD) {
      out.push({ ...base, id: `evt_cash_${t.id}`, kind: 'cashout.completed', category: 'transactions', severity: 'info', detail: t.to.name, at: t.completedAt ?? t.createdAt });
    } else if (t.status === 'completed' && t.usd >= NOTABLE_USD) {
      out.push({ ...base, id: `evt_done_${t.id}`, kind: 'transaction.completed', category: 'transactions', severity: 'info', at: t.completedAt ?? t.createdAt });
    }
  }

  for (const c of connectors) {
    const subject = { type: 'connector' as const, id: c.id, label: c.name };
    const activated = c.onboardedMs + 2 * DAY;
    if (c.status !== 'pending' && activated >= since && activated <= NOW)
      out.push({ id: `evt_con_on_${c.id}`, kind: 'connector.activated', category: 'connectors', at: iso(activated), severity: 'notice', subject, country: c.country });
    if (c.status === 'inactive' && c.stoppedMs) {
      const off = c.stoppedMs + 30 * DAY;
      if (off >= since && off <= NOW)
        out.push({ id: `evt_con_off_${c.id}`, kind: 'connector.deactivated', category: 'connectors', at: iso(off), severity: 'notice', subject, country: c.country });
    }
  }

  for (const inc of systemHealth(degraded).incidents) {
    if (Date.parse(inc.startedAt) < since) continue;
    const subject = { type: 'service' as const, id: inc.serviceId, label: inc.title };
    out.push({ id: `evt_${inc.id}_start`, kind: 'system.degraded', category: 'system', at: inc.startedAt, severity: 'warning', subject });
    if (inc.resolvedAt) out.push({ id: `evt_${inc.id}_end`, kind: 'system.resolved', category: 'system', at: inc.resolvedAt, severity: 'notice', subject });
  }

  return out.filter((e) => Date.parse(e.at) <= NOW).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
