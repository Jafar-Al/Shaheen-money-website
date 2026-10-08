/**
 * 05 · Global Network. One request per period feeds the map, the corridor
 * ledger, the country table and the regions, so all four agree.
 */
import { getGlobalNetwork } from '../services/adminApi';
import type { CountryStat, GlobalNetwork, Range } from '../types/admin';
import { num, pct, usd } from '../lib/format';
import { regionOf } from '../lib/geo';
import { h, need, setVar } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { country } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';
import { MapView, renderCorridors } from './network-map';

const RANGES = ['7d', '30d', '90d', '1y'] as const;

function countryRow(c: CountryStat): HTMLElement {
  return h(
    'tr',
    {},
    h('td', { 'data-label': 'Country' }, country(c.code)),
    h('td', { class: 'is-num', 'data-label': 'Users' }, num(c.users)),
    h('td', { class: 'is-num', 'data-label': 'Connectors' }, num(c.connectors)),
    h('td', { class: 'is-num', 'data-label': 'Sent' }, usd(c.sentUsd, { compact: true })),
    h('td', { class: 'is-num', 'data-label': 'Received' }, usd(c.receivedUsd, { compact: true })),
    h('td', { class: 'is-num', 'data-label': 'Volume' }, usd(c.volumeUsd, { compact: true })),
  );
}

function regions(net: GlobalNetwork): boolean {
  const by = new Map<string, number>();
  for (const c of net.countries) by.set(regionOf(c.code), (by.get(regionOf(c.code)) ?? 0) + c.volumeUsd);
  const rows = [...by.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((n, [, v]) => n + v, 0);
  need('[data-regions]').replaceChildren(
    ...rows.map(([name, v], i) => {
      const bar = h('i');
      setVar(bar, '--w', total ? v / rows[0]![1] : 0);
      return h(
        'li',
        { class: 'ops-ledger-row' },
        h('span', { class: 'ops-ledger-n' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'ops-ledger-main' }, h('span', { class: 'ops-ledger-title' }, name), h('span', { class: 'ops-share' }, bar)),
        h('span', { class: 'ops-ledger-end' }, usd(v, { compact: true }), h('small', {}, `${pct((v / total) * 100)} of the total`)),
      );
    }),
  );
  return rows.length > 0;
}

void boot('network:read', () => {
  let range: Range = oneOf(param('range'), RANGES, '30d');
  const seg = segmented('range');
  seg.set(range, false);
  const map = new MapView(need('[data-map="map"]'));

  const run = () => {
    const net = shared(() => getGlobalNetwork(range));
    void load(region('map'), net, (n) => {
      map.render(n, { corridors: 14, labels: 12 });
      return n.countries.length > 0;
    });
    void load(region('corridors'), net, (n) => renderCorridors(need('[data-corridors]'), n.corridors ?? [], range, 10));
    void load(region('countries'), net, (n) => {
      need('[data-countries]').replaceChildren(...n.countries.map(countryRow));
      return n.countries.length > 0;
    });
    void load(region('regions'), net, regions);
  };
  seg.onChange((v) => {
    range = v as Range;
    setParams({ range: range === '30d' ? null : range });
    run();
  });
  run();
});
