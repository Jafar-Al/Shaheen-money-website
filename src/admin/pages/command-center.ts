/**
 * 01 · Command Center. Every block loads on its own (a slow one never holds
 * up the rest) and the period control reloads them all against the same
 * window, so the numbers on the screen always agree with each other.
 */
import { getDashboardStats, getGlobalNetwork, getSystemHealth } from '../services/adminApi';
import { hasPermission } from '../services/auth';
import type { GlobalNetwork, Range, SystemHealth } from '../types/admin';
import { TONE, rangeWords } from '../lib/format';
import { $, need } from '../ui/dom';
import { load, region } from '../ui/region';
import { fillMetric } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';
import { flowBlock, overallLabel, recentActivity, serviceRow, txnBlock } from './blocks';
import { MapView, renderCorridors } from './network-map';

const RANGES = ['24h', '7d', '30d', '90d'] as const;

function greet(): void {
  const word = need('[data-headline] .emph');
  const hour = new Date().getHours();
  word.textContent = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
  const now = $('[data-now]');
  if (now) {
    const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const tick = () => (now.textContent = fmt.format(new Date()).replace(',', ' ·'));
    tick();
    setInterval(tick, 30_000);
  }
}

function showOverall(h: SystemHealth | null): void {
  const badge = $('[data-overall]');
  if (!badge) return;
  badge.dataset.tone = h ? TONE.service[h.status] : 'muted';
  need('[data-overall-text]', badge).textContent = h ? overallLabel(h) : 'Status unavailable';
  badge.querySelector('.ops-dot')?.classList.toggle('ops-dot-live', !!h);
}

void boot('console:access', () => {
  greet();
  const seg = segmented('range');
  let range: Range = oneOf(param('range'), RANGES, '30d');
  seg.set(range, false);

  const stats = region('stats');
  const flow = hasPermission('transactions:read') ? flowBlock('flow') : null;
  const txn = hasPermission('transactions:read') ? txnBlock('txn') : null;
  const canNetwork = hasPermission('network:read');
  const map = canNetwork ? new MapView(need('[data-map="map"]')) : null;
  const mapRegion = canNetwork ? region('map') : null;
  const corridors = canNetwork ? region('corridors') : null;

  // The map and the corridor list share one request per period; a failed one is not kept, so Retry asks again.
  let netCache: { key: Range; p: Promise<GlobalNetwork> } | null = null;
  const network = () => {
    if (!netCache || netCache.key !== range) {
      const p = getGlobalNetwork(range);
      netCache = { key: range, p };
      p.catch(() => {
        if (netCache?.p === p) netCache = null;
      });
    }
    return netCache.p;
  };

  const loadAll = () => {
    void load(
      stats,
      (signal) => getDashboardStats(range, { signal }),
      (s) => {
        const metrics = [
          ['totalUsers', 'up'],
          ['newUsers', 'up'],
          ['activeUsers', 'up'],
          ['transactionVolume', 'up'],
          ['activeCountries', 'up'],
          ['activeConnectors', 'up'],
        ] as const;
        for (const [key, better] of metrics) fillMetric(need(`[data-metric="${key}"]`), s[key], s.range, better);
        need('#metrics [data-lead]').textContent = `Each change compares with the previous ${rangeWords(s.range)}; each line traces the period.`;
        return s.totalUsers.value > 0 || s.transactionVolume.value > 0;
      },
    );
    flow?.load(range);
    txn?.load(range);
    if (map && mapRegion && corridors) {
      void load(mapRegion, network, (net) => {
        map.render(net, { corridors: 10, labels: 8 });
        return net.countries.length > 0;
      });
      void load(corridors, network, (net) => renderCorridors(need('[data-corridors]'), net.corridors ?? [], range, 6));
    }
  };

  seg.onChange((v) => {
    range = v as Range;
    setParams({ range: range === '30d' ? null : range });
    loadAll();
  });
  loadAll();

  if (hasPermission('activity:read')) recentActivity('activity', 8).load();

  if (hasPermission('system:read')) {
    const health = region('health');
    // The top bar's status pill asks for health too: use its answer when it comes first.
    addEventListener('ops:health', (e) => showOverall((e as CustomEvent<SystemHealth | null>).detail));
    void load(
      health,
      (signal) => getSystemHealth({ signal }),
      (h) => {
        showOverall(h);
        need('[data-services]').replaceChildren(...h.services.map((s) => serviceRow(s)));
        return h.services.length > 0;
      },
    );
  }
});
