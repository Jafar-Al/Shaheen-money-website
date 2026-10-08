/**
 * 07 · Assets. Share is computed here from the volumes the API sends, so
 * it always adds up to 100% of what is on screen.
 */
import { getAssets } from '../services/adminApi';
import type { AssetOverview, Range } from '../types/admin';
import { ASSET_NAME, num, pct, rangeWords, usd } from '../lib/format';
import { TimeChart, sparkline } from '../ui/charts';
import { h, need, s, setVar } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { deltaEl } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';

const RANGES = ['7d', '30d', '90d', '1y'] as const;

function table(a: AssetOverview): boolean {
  const total = a.assets.reduce((n, x) => n + x.volumeUsd, 0);
  const rows = a.assets.map((x) => {
    const bar = h('i');
    setVar(bar, '--w', total ? x.volumeUsd / total : 0);
    const spark = s('svg', { class: 'ops-spark', 'aria-hidden': 'true' });
    const row = h(
      'tr',
      {},
      h('td', { 'data-label': 'Asset' }, h('span', { class: 'ops-who' }, h('span', { class: 'ops-disc', 'aria-hidden': 'true' }, x.code.slice(0, 2)), h('span', {}, h('span', { class: 'ops-who-name' }, x.code), h('span', { class: 'ops-sub' }, ASSET_NAME[x.code] ?? x.code)))),
      h('td', { class: 'is-num', 'data-label': 'Volume' }, usd(x.volumeUsd)),
      h('td', { 'data-label': 'Share of volume' }, h('span', { class: 'ops-share-row' }, h('span', { class: 'ops-share' }, bar), h('span', { class: 'ops-mono' }, total ? pct((x.volumeUsd / total) * 100) : '—'))),
      h('td', { class: 'is-num', 'data-label': 'Transactions' }, num(x.count)),
      h('td', { class: 'is-num', 'data-label': 'Change' }, deltaEl(x.volumeUsd, x.previousVolumeUsd, '')),
      h('td', { 'data-label': 'Trend' }, spark),
    );
    const values = x.series.map((p) => p.value);
    requestAnimationFrame(() => sparkline(spark, values.length > 24 ? compress(values, 24) : values));
    return row;
  });
  need('[data-assets]').replaceChildren(...rows);
  return total > 0;
}

/** Fewer points for a sparkline: shape, not detail. */
function compress(values: number[], n: number): number[] {
  const size = Math.ceil(values.length / n);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
}

void boot('assets:read', () => {
  let range: Range = oneOf(param('range'), RANGES, '30d');
  const seg = segmented('range');
  seg.set(range, false);
  const charts = new Map(['USDC', 'USDT', 'EUROC'].map((code) => [code, new TimeChart(need(`[data-chart="asset-${code}"]`))]));

  const run = () => {
    const data = shared(() => getAssets(range));
    void load(region('assets'), data, table);
    void load(region('multiples'), data, (a) => {
      // One shared top of scale: the three charts compare directly.
      const yMax = Math.max(0, ...a.assets.flatMap((x) => x.series.map((p) => p.value)));
      for (const x of a.assets) {
        const chart = charts.get(x.code);
        if (!chart) continue;
        chart.render(
          x.series.map((p) => ({ t: p.t, v: p.value })),
          { kind: 'area', bucket: a.bucket, label: `${x.code} volume`, format: (v) => usd(v), axis: (v) => usd(v, { compact: true }), yMax },
        );
        need(`[data-multiple-total="${x.code}"]`).textContent = `${usd(x.volumeUsd, { compact: true })} in the last ${rangeWords(range)}`;
      }
      return a.assets.some((x) => x.volumeUsd > 0);
    });
  };
  seg.onChange((v) => {
    range = v as Range;
    setParams({ range: range === '30d' ? null : range });
    run();
  });
  run();
});
