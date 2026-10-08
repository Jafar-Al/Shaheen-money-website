/**
 * 08 · Analytics. Four modules, each with its own request, states and
 * retry. Rates are computed here from the counts the API sends, so the
 * percentage and the count it comes from can never disagree.
 */
import { getAssets, getGlobalNetwork, getTransactionAnalytics, getUserAnalytics } from '../services/adminApi';
import type { Range, RetentionCohort } from '../types/admin';
import { ASSET_NAME, dayMonth, num, pct, usd } from '../lib/format';
import { regionOf } from '../lib/geo';
import { TimeChart } from '../ui/charts';
import { h, need, setVar } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { fillMetric } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot, exportButton } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';

const RANGES = ['7d', '30d', '90d', '1y'] as const;

function ledger(el: HTMLElement, rows: Array<{ label: string; sub?: string | undefined; value: number; text: string }>): void {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((n, r) => n + r.value, 0);
  el.replaceChildren(
    ...rows.map((r, i) => {
      const bar = h('i');
      setVar(bar, '--w', r.value / max);
      return h(
        'li',
        { class: 'ops-ledger-row' },
        h('span', { class: 'ops-ledger-n' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'ops-ledger-main' }, h('span', { class: 'ops-ledger-title' }, r.label, r.sub ? h('span', { class: 'ops-sub' }, r.sub) : null), h('span', { class: 'ops-share' }, bar)),
        h('span', { class: 'ops-ledger-end' }, r.text, h('small', {}, total ? `${pct((r.value / total) * 100)} of the total` : '')),
      );
    }),
  );
}

function retentionTable(cohorts: RetentionCohort[] | null): HTMLElement {
  if (!cohorts) return h('p', { class: 'ops-sub' }, 'Retention is not available from the API yet.');
  const weeks = Math.max(0, ...cohorts.map((c) => c.retained.length));
  return h(
    'table',
    { class: 'ops-heat' },
    h('caption', { class: 'sr-only' }, 'Weekly retention: the share of each signup week active in each following week'),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Signed up'), h('th', { scope: 'col' }, 'Users'), ...Array.from({ length: weeks }, (_, k) => h('th', { scope: 'col' }, `W${k}`)))),
    h(
      'tbody',
      {},
      ...cohorts.map((c) =>
        h(
          'tr',
          {},
          h('th', { scope: 'row' }, `Week of ${dayMonth(c.cohort)}`),
          h('td', { class: 'is-na' }, num(c.size)),
          ...c.retained.map((v) => {
            if (v === null) return h('td', { class: 'is-na', 'aria-label': 'Not reached yet' }, '·');
            const td = h('td', {}, pct(v * 100, 0));
            setVar(td, '--v', v.toFixed(3));
            return td;
          }),
        ),
      ),
    ),
  );
}

void boot('analytics:read', () => {
  let range: Range = oneOf(param('range'), RANGES, '90d');
  const seg = segmented('range');
  seg.set(range, false);
  const chart = (name: string) => new TimeChart(need(`[data-chart="${name}"]`));
  const c = {
    newUsers: chart('new-users'),
    activeUsers: chart('active-users'),
    totalUsers: chart('total-users'),
    count: chart('txn-count'),
    volume: chart('txn-volume'),
    success: chart('success-rate'),
    failure: chart('failure-rate'),
  };

  const run = () => {
    void load(
      region('users'),
      (signal) => getUserAnalytics(range, { signal }),
      (a) => {
        const pts = (s: typeof a.newUsers) => s.map((p) => ({ t: p.t, v: p.value }));
        c.newUsers.render(pts(a.newUsers), { kind: 'columns', bucket: a.bucket, label: 'New users', format: (v) => num(v) });
        c.activeUsers.render(pts(a.activeUsers), { kind: 'area', bucket: a.bucket, label: 'Active users', format: (v) => num(v), axis: (v) => num(v, { compact: true }) });
        c.totalUsers.render(pts(a.totalUsers), { kind: 'line', bucket: a.bucket, label: 'Total users', format: (v) => num(v), axis: (v) => num(v, { compact: true }) });
        need('[data-retention]').replaceChildren(retentionTable(a.retention));
        return a.totalUsers.some((p) => p.value > 0);
      },
    );

    void load(
      region('txns'),
      (signal) => getTransactionAnalytics(range, 'all', { signal }),
      (a) => {
        const s = a.series;
        const rate = (k: 'success' | 'failure') =>
          s.map((p) => {
            const done = p.count ? (k === 'failure' ? p.failed : p.completed) / p.count : 0;
            return { t: p.t, v: done * 100 };
          });
        c.count.render(s.map((p) => ({ t: p.t, v: p.count })), { kind: 'columns', bucket: a.bucket, label: 'Transactions', format: (v) => num(v) });
        c.volume.render(s.map((p) => ({ t: p.t, v: p.volumeUsd })), { kind: 'area', bucket: a.bucket, label: 'Completed volume', format: (v) => usd(v), axis: (v) => usd(v, { compact: true }) });
        c.success.render(rate('success'), {
          kind: 'line',
          bucket: a.bucket,
          label: 'Success rate',
          format: (v) => pct(v),
          yMax: 100,
          extra: [{ label: 'Completed', values: s.map((p) => p.completed), format: (v) => num(v) }],
        });
        c.failure.render(rate('failure'), {
          kind: 'line',
          bucket: a.bucket,
          label: 'Failure rate',
          format: (v) => pct(v),
          extra: [{ label: 'Failed', values: s.map((p) => p.failed), format: (v) => num(v) }],
        });
        return a.totals.count > 0;
      },
    );

    const net = shared(() => getGlobalNetwork(range));
    void load(
      region('network-figures'),
      net,
      (n) => {
        const m = (value: number) => ({ value, previous: null, unit: 'count' as const });
        fillMetric(need('[data-metric="countries"]'), m(n.countries.filter((x) => x.volumeUsd > 0).length), range);
        fillMetric(need('[data-metric="connectors"]'), m(n.countries.reduce((t, x) => t + x.connectors, 0)), range);
        fillMetric(need('[data-metric="corridors"]'), m(n.corridors?.length ?? 0), range);
        return n.countries.length > 0;
      },
    );
    void load(
      region('regions'),
      net,
      (n) => {
        const by = new Map<string, number>();
        for (const x of n.countries) by.set(regionOf(x.code), (by.get(regionOf(x.code)) ?? 0) + x.volumeUsd);
        const rows = [...by.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        ledger(need('[data-regions]'), rows.map(([label, value]) => ({ label, value, text: usd(value, { compact: true }) })));
        return rows.length > 0;
      },
    );

    void load(
      region('assets'),
      (signal) => getAssets(range, { signal }),
      (a) => {
        ledger(need('[data-asset-volume]'), a.assets.map((x) => ({ label: x.code, sub: ASSET_NAME[x.code], value: x.volumeUsd, text: usd(x.volumeUsd, { compact: true }) })));
        ledger(need('[data-asset-count]'), a.assets.map((x) => ({ label: x.code, sub: ASSET_NAME[x.code], value: x.count, text: num(x.count) })));
        return a.assets.some((x) => x.volumeUsd > 0);
      },
    );
  };

  seg.onChange((v) => {
    range = v as Range;
    setParams({ range: range === '90d' ? null : range });
    run();
  });
  exportButton('analytics', 'analytics:export', () => ({ range }));
  run();
});
