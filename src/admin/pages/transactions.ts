/**
 * 04 · Transactions: analytics for the period, then the ledger itself.
 * ?user= narrows the ledger to one user (linked from the user drawer).
 */
import { getTransactions, getUserById } from '../services/adminApi';
import type { FlowType, Range, SortDir, Transaction, TransactionQuery, TransactionSortKey, TransactionStatus } from '../types/admin';
import { FLOW_LABEL, TONE, TXN_STATUS_LABEL, amount, dateTime, time, date, usd } from '../lib/format';
import { debounce, h, need } from '../ui/dom';
import { load, region } from '../ui/region';
import { badge, corridor } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot, exportButton } from '../ui/shell';
import { dataTable } from '../ui/table';
import { oneOf, param, setParams } from '../ui/url';
import { txnBlock } from './blocks';
import { drawerFromUrl, openFromRow, openTransaction, txnHref } from './records';

const RANGES = ['24h', '7d', '30d', '90d', '1y'] as const;
const TYPES = ['', 'receive', 'send', 'payment', 'cash_out'] as const;
const STATUSES = ['', 'completed', 'pending', 'failed', 'cancelled'] as const;
const SORTS = ['createdAt', 'usdValue', 'status', 'type'] as const;

function txnCell(t: Transaction): HTMLElement {
  return h(
    'span',
    { class: 'ops-who' },
    h('span', { class: 'ops-disc ops-disc-sq', 'aria-hidden': 'true' }, t.type === 'cash_out' ? 'CO' : FLOW_LABEL[t.type].slice(0, 2).toUpperCase()),
    h('span', {}, h('a', { class: 'ops-who-name', href: txnHref(t.id) }, FLOW_LABEL[t.type]), h('span', { class: 'ops-sub num' }, t.id)),
  );
}

function amountCell(t: Transaction): HTMLElement {
  return h('span', { class: 'ops-amt', title: `${usd(Number(t.usdValue), { cents: true })}` }, amount(t.amount, t.asset).replace(` ${t.asset}`, ''), h('small', {}, t.asset));
}

function partiesCell(t: Transaction): HTMLElement {
  return h('span', { class: 'ops-who-two' }, h('span', { class: 'ops-who-name' }, t.from.name), h('span', { class: 'ops-sub' }, `→ ${t.to.name}`));
}

void boot('transactions:read', () => {
  let range: Range = oneOf(param('range'), RANGES, '30d');
  const q: TransactionQuery = {
    page: Math.max(1, Number(param('page')) || 1),
    pageSize: 25,
    search: param('q') ?? undefined,
    type: (oneOf(param('type'), TYPES, '') || undefined) as FlowType | undefined,
    status: (oneOf(param('status'), STATUSES, '') || undefined) as TransactionStatus | undefined,
    userId: param('user') ?? undefined,
    sort: oneOf(param('sort'), SORTS, 'createdAt') as TransactionSortKey,
    dir: oneOf(param('dir'), ['asc', 'desc'] as const, 'desc') as SortDir,
    range,
  };
  const seg = segmented('range');
  seg.set(range, false);
  const analytics = txnBlock('txn');
  const table = dataTable<Transaction>('txns');
  const rows = region('txns-rows');
  const search = need<HTMLInputElement>('[data-search]');
  const typeSel = need<HTMLSelectElement>('[data-type]');
  const statusSel = need<HTMLSelectElement>('[data-status]');
  const clearUser = need<HTMLButtonElement>('[data-clear-user]');
  const note = need('[data-filter-note]');
  search.value = q.search ?? '';
  typeSel.value = q.type ?? '';
  statusSel.value = q.status ?? '';
  table.setSort(q.sort!, q.dir!);

  const showUserFilter = () => {
    clearUser.hidden = !q.userId;
    note.hidden = !q.userId;
    if (q.userId) {
      note.textContent = `Only transactions of user ${q.userId}.`;
      getUserById(q.userId)
        .then((u) => (note.textContent = `Only ${u.name}’s transactions (${u.id}).`))
        .catch(() => undefined);
    }
  };

  const loadRows = () => {
    setParams({
      range: range === '30d' ? null : range,
      q: q.search,
      type: q.type,
      status: q.status,
      user: q.userId,
      sort: q.sort === 'createdAt' ? null : q.sort,
      dir: q.dir === 'desc' ? null : q.dir,
      page: q.page > 1 ? q.page : null,
    });
    void load(
      rows,
      (signal) => getTransactions(q, { signal }),
      (page) => {
        q.page = page.page;
        table.setRows(
          page,
          [
            { label: 'Transaction', cell: txnCell },
            { label: 'Amount', numeric: true, cell: amountCell },
            { label: 'From → To', cell: partiesCell },
            { label: 'Corridor', cell: (t) => corridor(t.corridor.from, t.corridor.to) },
            { label: 'Status', cell: (t) => badge(TONE.txn[t.status], TXN_STATUS_LABEL[t.status]) },
            { label: 'Created', cell: (t) => h('span', { title: dateTime(t.createdAt) }, `${date(t.createdAt)} · ${time(t.createdAt)}`) },
          ],
          (t) => txnHref(t.id),
        );
        return page.items.length > 0;
      },
    );
  };

  const reload = (next: Range) => {
    range = next;
    q.range = next;
    q.page = 1;
    analytics.load(range);
    loadRows();
  };
  seg.onChange((v) => reload(v as Range));
  search.addEventListener(
    'input',
    debounce(() => {
      q.search = search.value.trim() || undefined;
      q.page = 1;
      loadRows();
    }, 250),
  );
  typeSel.addEventListener('change', () => {
    q.type = (typeSel.value || undefined) as FlowType | undefined;
    q.page = 1;
    loadRows();
  });
  statusSel.addEventListener('change', () => {
    q.status = (statusSel.value || undefined) as TransactionStatus | undefined;
    q.page = 1;
    loadRows();
  });
  clearUser.addEventListener('click', () => {
    q.userId = undefined;
    q.page = 1;
    showUserFilter();
    loadRows();
  });
  table.onSort((key, dir) => {
    q.sort = key as TransactionSortKey;
    q.dir = dir;
    q.page = 1;
    loadRows();
  });
  table.onPage((p) => {
    q.page = p;
    loadRows();
  });
  table.onOpen(openFromRow);

  exportButton('transactions', 'transactions:export', () => {
    const f: Record<string, string> = { range };
    if (q.search) f.search = q.search;
    if (q.type) f.type = q.type;
    if (q.status) f.status = q.status;
    if (q.userId) f.userId = q.userId;
    return f;
  });


  showUserFilter();
  analytics.load(range);
  loadRows();
  drawerFromUrl('txn', openTransaction);
});
