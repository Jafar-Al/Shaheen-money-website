/**
 * Paged, sortable tables (src/components/admin/DataTable.astro). The server
 * pages, sorts and filters; this module keeps the header's sort state
 * (aria-sort), renders the rows it is given and draws the pager.
 *
 * A row opens its record when clicked anywhere, but the record's link in
 * the first cell is the real control: it is focusable, opens in a new tab
 * with a modifier key, and is what assistive technology announces.
 */
import type { Page, SortDir } from '../types/admin';
import { num } from '../lib/format';
import { $$, h, need } from './dom';

export interface Column<T> {
  label: string;
  numeric?: boolean;
  cell: (row: T) => Node | string;
}

export interface TableHandle<T> {
  setRows: (page: Page<T>, columns: Array<Column<T>>, href?: (row: T) => string) => void;
  setSort: (key: string, dir: SortDir) => void;
  onSort: (fn: (key: string, dir: SortDir) => void) => void;
  onPage: (fn: (page: number) => void) => void;
  onOpen: (fn: (href: string, e: MouseEvent) => void) => void;
}

export function dataTable<T>(name: string, root: ParentNode = document): TableHandle<T> {
  const host = need(`[data-table="${name}"]`, root);
  const tbody = need('tbody', host);
  const pager = need('[data-pager]', host);
  const sortListeners: Array<(k: string, d: SortDir) => void> = [];
  const pageListeners: Array<(p: number) => void> = [];
  const openListeners: Array<(href: string, e: MouseEvent) => void> = [];

  const setSort = (key: string, dir: SortDir) => {
    for (const th of $$<HTMLTableCellElement>('th[data-sort-key]', host)) {
      th.setAttribute('aria-sort', th.dataset.sortKey === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
    }
  };

  for (const th of $$<HTMLTableCellElement>('th[data-sort-key]', host)) {
    th.querySelector('button')?.addEventListener('click', () => {
      const key = th.dataset.sortKey!;
      const current = th.getAttribute('aria-sort');
      const dir: SortDir = current === 'descending' ? 'asc' : current === 'ascending' ? 'desc' : ((th.dataset.sortFirst as SortDir) ?? 'desc');
      setSort(key, dir);
      for (const fn of sortListeners) fn(key, dir);
    });
  }

  tbody.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLTableRowElement>('tr[data-href]');
    if (!row) return;
    // Let real controls inside a row (links with modifiers, copy buttons) do their own thing.
    const link = target.closest('a');
    if (link && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return;
    if (target.closest('button') && !link) return;
    e.preventDefault();
    for (const fn of openListeners) fn(row.dataset.href!, e);
  });

  const drawPager = (page: Page<T>) => {
    const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
    const from = page.total ? (page.page - 1) * page.pageSize + 1 : 0;
    const to = Math.min(page.total, page.page * page.pageSize);
    const go = (p: number) => () => {
      for (const fn of pageListeners) fn(p);
      host.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    const btn = (label: string, p: number, opts: { current?: boolean; disabled?: boolean; aria?: string } = {}) => {
      const b = h('button', { type: 'button', class: 'ops-pager-btn', 'aria-current': opts.current ? 'page' : null, 'aria-label': opts.aria ?? `Page ${p}`, disabled: !!opts.disabled }, label);
      if (!opts.current && !opts.disabled) b.addEventListener('click', go(p));
      return b;
    };
    // First, last, and two either side of the current page.
    const set = new Set([1, pages, page.page - 1, page.page, page.page + 1].filter((p) => p >= 1 && p <= pages));
    const list = [...set].sort((a, b) => a - b);
    const items: Node[] = [btn('←', page.page - 1, { disabled: page.page <= 1, aria: 'Previous page' })];
    list.forEach((p, i) => {
      if (i && p - list[i - 1]! > 1) items.push(h('span', { class: 'ops-pager-gap', 'aria-hidden': 'true' }, '…'));
      items.push(btn(String(p), p, { current: p === page.page }));
    });
    items.push(btn('→', page.page + 1, { disabled: page.page >= pages, aria: 'Next page' }));
    pager.replaceChildren(
      h('p', { class: 'ops-pager-info micro', 'aria-live': 'polite' }, page.total ? `${num(from)}–${num(to)} of ${num(page.total)}` : 'No results'),
      h('div', { class: 'ops-pager-pages' }, ...(pages > 1 ? items : [])),
    );
  };

  return {
    setRows(page, columns, href) {
      tbody.replaceChildren(
        ...page.items.map((row) =>
          h(
            'tr',
            { 'data-href': href?.(row) ?? null },
            ...columns.map((c) => h('td', { class: c.numeric ? 'is-num' : null, 'data-label': c.label }, c.cell(row))),
          ),
        ),
      );
      drawPager(page);
    },
    setSort,
    onSort: (fn) => sortListeners.push(fn),
    onPage: (fn) => pageListeners.push(fn),
    onOpen: (fn) => openListeners.push(fn),
  };
}
