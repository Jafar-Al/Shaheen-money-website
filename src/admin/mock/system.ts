/**
 * MOCK DATA — service health. Shaped like a status endpoint fed by real
 * health checks; nothing here is measured. Two past incidents give the
 * history something to show; the "degraded" scenario (Account → Mock data)
 * adds a live one.
 */
import type { Incident, ServiceHealth, ServiceId, ServiceStatus, SystemHealth } from '../types/admin';
import { DAY, MIN, NOW, TODAY, iso, stream } from './seed';

const SERVICES: ReadonlyArray<{ id: ServiceId; latency: number }> = [
  { id: 'api', latency: 142 },
  { id: 'auth', latency: 96 },
  { id: 'wallets', latency: 188 },
  { id: 'transfers', latency: 231 },
  { id: 'payments', latency: 205 },
  { id: 'cashout', latency: 264 },
  { id: 'connectors', latency: 173 },
  { id: 'notifications', latency: 318 },
];

const PAST: Incident[] = [
  {
    id: 'inc_7Q2M',
    serviceId: 'notifications',
    status: 'degraded',
    title: 'Push notifications delayed for some Android devices',
    startedAt: iso(TODAY - 6 * DAY + 14 * 60 * MIN),
    resolvedAt: iso(TODAY - 6 * DAY + 14 * 60 * MIN + 42 * MIN),
  },
  {
    id: 'inc_3K8D',
    serviceId: 'cashout',
    status: 'degraded',
    title: 'Cash-out codes slow to confirm in Egypt',
    startedAt: iso(TODAY - 19 * DAY + 11 * 60 * MIN),
    resolvedAt: iso(TODAY - 19 * DAY + 11 * 60 * MIN + 95 * MIN),
  },
];

const LIVE: Incident = {
  id: 'inc_LIVE',
  serviceId: 'notifications',
  status: 'degraded',
  title: 'Push notifications delayed',
  startedAt: iso(NOW - 23 * MIN),
  resolvedAt: null,
};

const rank: Record<ServiceStatus, number> = { operational: 0, degraded: 1, down: 2 };

export function systemHealth(degraded = false): SystemHealth {
  const r = stream(`health:${Math.floor(NOW / MIN)}`);
  const incidents = degraded ? [LIVE, ...PAST] : PAST;
  const services: ServiceHealth[] = SERVICES.map(({ id, latency }) => {
    const mine = incidents.filter((i) => i.serviceId === id);
    const live = mine.find((i) => !i.resolvedAt);
    const downtime = mine.reduce((n, i) => n + ((i.resolvedAt ? Date.parse(i.resolvedAt) : NOW) - Date.parse(i.startedAt)), 0);
    const history = Array.from({ length: 30 }, (_, k) => {
      const day = TODAY - (29 - k) * DAY;
      const hit = mine.find((i) => Date.parse(i.startedAt) < day + DAY && (i.resolvedAt ? Date.parse(i.resolvedAt) : NOW) >= day);
      return { date: iso(day), status: (hit ? hit.status : 'operational') as ServiceStatus };
    });
    return {
      id,
      status: live ? live.status : 'operational',
      // Degraded time counts against uptime at half weight, the usual status-page convention.
      uptime30d: Math.max(0, 100 - (downtime * 0.5 * 100) / (30 * DAY)),
      latencyP95Ms: Math.round(latency * (live ? 3.4 : 0.92 + r.next() * 0.16)),
      checkedAt: iso(NOW - r.int(5, 50) * 1000),
      history,
      message: live?.title,
    };
  });
  const worst = services.reduce<ServiceStatus>((w, s) => (rank[s.status] > rank[w] ? s.status : w), 'operational');
  return { status: worst, checkedAt: iso(NOW), services, incidents };
}
