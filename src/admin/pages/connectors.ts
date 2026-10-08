/**
 * 03 · Connector Network. The summary, daily cash-outs, the busiest
 * Connectors and the full, filterable list; a Connector opens in the drawer
 * with its own 30 days.
 */
import { getConnectorSummary, getConnectors } from '../services/adminApi';
import type { Connector, ConnectorQuery, ConnectorSortKey, ConnectorStatus, Metric, SortDir } from '../types/admin';
import { CONNECTOR_STATUS_LABEL, TONE, ago, dateTime, num, usd } from '../lib/format';
import { countryName } from '../lib/geo';
import { TimeChart } from '../ui/charts';
import { debounce, h, need, setVar } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { badge, country, fillMetric, who } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot, exportButton } from '../ui/shell';
import { dataTable } from '../ui/table';
import { oneOf, param, setParams } from '../ui/url';
import { connectorHref, drawerFromUrl, openConnector, openFromRow } from './records';

const STATUSES = ['', 'active', 'inactive', 'pending'] as const;
const SORTS = ['name', 'country', 'city', 'status', 'transactionCount', 'volumeUsd', 'lastActiveAt'] as const;

const count = (value: number, previous: number | null = null): Metric => ({ value, previous, unit: 'count' });

void boot('connectors:read', () => {
  const q: ConnectorQuery = {
    page: Math.max(1, Number(param('page')) || 1),
    pageSize: 25,
    search: param('q') ?? undefined,
    status: (oneOf(param('status'), STATUSES, '') || undefined) as ConnectorStatus | undefined,
    country: param('country') ?? undefined,
    sort: oneOf(param('sort'), SORTS, 'volumeUsd') as ConnectorSortKey,
    dir: oneOf(param('dir'), ['asc', 'desc'] as const, 'desc') as SortDir,
  };
  const search = need<HTMLInputElement>('[data-search]');
  const countrySel = need<HTMLSelectElement>('[data-country]');
  const status = segmented('status');
  const table = dataTable<Connector>('connectors');
  const rows = region('connectors-rows');
  const chart = new TimeChart(need('[data-chart="activity"]'));
  search.value = q.search ?? '';
  status.set(q.status ?? '', false);
  table.setSort(q.sort!, q.dir!);
  const summary = shared(() => getConnectorSummary());

  void load(
    region('summary'),
    summary,
    (s) => {
      const set = (key: string, m: Metric, better: 'up' | 'down' | 'neutral' = 'neutral') => fillMetric(need(`[data-metric="${key}"]`), m, '30d', better);
      set('total', count(s.total));
      set('active', count(s.active));
      set('inactive', count(s.inactive));
      set('pending', count(s.pending));
      set('countries', count(s.countries.length));
      set('volume', { value: s.cashOut.volumeUsd, previous: s.cashOut.previousVolumeUsd, unit: 'usd' }, 'up');
      set('count', count(s.cashOut.count, s.cashOut.previousCount), 'up');
      countrySel.replaceChildren(h('option', { value: '' }, 'All countries'), ...s.countries.map((c) => h('option', { value: c }, countryName(c))));
      countrySel.value = q.country ?? '';
      return s.total > 0;
    },
  );

  void load(
    region('activity'),
    summary,
    (s) => {
      chart.render(
        s.activity.map((p) => ({ t: p.t, v: p.value })),
        { kind: 'columns', bucket: 'day', label: 'Cash-outs', cash: true, format: (v) => num(v) },
      );
      return s.activity.some((p) => p.value > 0);
    },
  );

  void load(
    region('top'),
    (signal) => getConnectors({ page: 1, pageSize: 5, sort: 'volumeUsd', dir: 'desc', status: 'active' }, { signal }),
    (page) => {
      const max = Math.max(1, ...page.items.map((c) => Number(c.volumeUsd)));
      need('[data-top]').replaceChildren(
        ...page.items.map((c, i) => {
          const bar = h('i');
          setVar(bar, '--w', Number(c.volumeUsd) / max);
          return h(
            'li',
            { class: 'ops-ledger-row is-cash' },
            h('span', { class: 'ops-ledger-n' }, String(i + 1).padStart(2, '0')),
            h(
              'span',
              { class: 'ops-ledger-main' },
              h('a', { class: 'ops-ledger-title ops-who-name', href: connectorHref(c.id) }, c.name),
              h('span', { class: 'ops-sub' }, `${c.city}, ${countryName(c.country)}`),
              h('span', { class: 'ops-share' }, bar),
            ),
            h('span', { class: 'ops-ledger-end' }, usd(Number(c.volumeUsd), { compact: true }), h('small', {}, `${num(c.transactionCount)} cash-outs`)),
          );
        }),
      );
      return page.items.length > 0;
    },
  );

  const loadRows = () => {
    setParams({
      q: q.search,
      status: q.status,
      country: q.country,
      sort: q.sort === 'volumeUsd' ? null : q.sort,
      dir: q.dir === 'desc' ? null : q.dir,
      page: q.page > 1 ? q.page : null,
    });
    void load(
      rows,
      (signal) => getConnectors(q, { signal }),
      (page) => {
        q.page = page.page;
        table.setRows(
          page,
          [
            { label: 'Connector', cell: (c) => who(c.name, c.id, { href: connectorHref(c.id), square: true, subMono: true }) },
            { label: 'Country', cell: (c) => country(c.country) },
            { label: 'City', cell: (c) => c.city },
            { label: 'Status', cell: (c) => badge(TONE.connector[c.status], CONNECTOR_STATUS_LABEL[c.status]) },
            { label: 'Cash-outs · 30D', numeric: true, cell: (c) => num(c.transactionCount) },
            { label: 'Volume · 30D', numeric: true, cell: (c) => usd(Number(c.volumeUsd)) },
            { label: 'Last active', cell: (c) => h('span', { title: c.lastActiveAt ? dateTime(c.lastActiveAt) : 'Never' }, ago(c.lastActiveAt)) },
          ],
          (c) => connectorHref(c.id),
        );
        return page.items.length > 0;
      },
    );
  };

  search.addEventListener(
    'input',
    debounce(() => {
      q.search = search.value.trim() || undefined;
      q.page = 1;
      loadRows();
    }, 250),
  );
  status.onChange((v) => {
    q.status = (v || undefined) as ConnectorStatus | undefined;
    q.page = 1;
    loadRows();
  });
  countrySel.addEventListener('change', () => {
    q.country = countrySel.value || undefined;
    q.page = 1;
    loadRows();
  });
  table.onSort((key, dir) => {
    q.sort = key as ConnectorSortKey;
    q.dir = dir;
    q.page = 1;
    loadRows();
  });
  table.onPage((p) => {
    q.page = p;
    loadRows();
  });
  table.onOpen(openFromRow);

  exportButton('connectors', 'connectors:export', () => {
    const f: Record<string, string> = {};
    if (q.search) f.search = q.search;
    if (q.status) f.status = q.status;
    if (q.country) f.country = q.country;
    return f;
  });

  loadRows();
  drawerFromUrl('connector', openConnector);
});
