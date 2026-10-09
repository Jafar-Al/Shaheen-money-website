/**
 * The three records the drawer can open: a user, a transaction (printed as
 * the site's receipt slip), a Connector. Shared by the pages that list them;
 * this module has no side effects of its own.
 */
import { routes } from '../config';
import { getConnectorById, getTransactionById, getTransactions, getUserById } from '../services/adminApi';
import { hasPermission } from '../services/auth';
import type { AdminUserDetail, ConnectorDetail, Transaction } from '../types/admin';
import {
  CONNECTOR_STATUS_LABEL,
  FLOW_LABEL,
  TONE,
  TXN_STATUS_LABEL,
  USER_STATUS_LABEL,
  WALLET_STATUS_LABEL,
  ago,
  amount,
  date,
  dateTime,
  initials,
  num,
  usd,
} from '../lib/format';
import { countryName } from '../lib/geo';
import { TimeChart } from '../ui/charts';
import { $, h, need, s } from '../ui/dom';
import { drawer } from '../ui/drawer';
import { badge, copyButton, corridor, country, dl } from '../ui/render';

export const userHref = (id: string) => `${routes.users}?user=${encodeURIComponent(id)}`;
export const txnHref = (id: string) => `${routes.transactions}?txn=${encodeURIComponent(id)}`;
export const connectorHref = (id: string) => `${routes.connectors}?connector=${encodeURIComponent(id)}`;

/** replaceChildren, leaving out the sections a record does not have. */
const fill = (el: Element, ...items: Array<Node | null>) => el.replaceChildren(...items.filter((x): x is Node => x !== null));

const section = (label: string, ...children: Array<Node | null>) => h('section', { class: 'ops-drawer-sec' }, h('span', { class: 'label' }, label), ...children);

/** A short list of transactions inside a record. */
export function miniTxnList(list: Transaction[], perspective?: string): HTMLElement {
  if (!list.length) return h('p', { class: 'ops-sub' }, 'No transactions yet.');
  return h(
    'ul',
    { class: 'ops-ledger' },
    ...list.map((t) => {
      const incoming = perspective && t.to.id === perspective;
      const title = `${FLOW_LABEL[t.type]} · ${incoming ? `from ${t.from.name}` : `to ${t.to.name}`}`;
      return h(
        'li',
        { class: 'ops-ledger-row no-n' },
        h(
          'span',
          { class: 'ops-ledger-main' },
          hasPermission('transactions:read') ? h('a', { class: 'ops-ledger-title ops-who-name', href: txnHref(t.id) }, title) : h('span', { class: 'ops-ledger-title' }, title),
          h('span', { class: 'ops-sub num' }, `${t.id} · ${dateTime(t.createdAt)}`),
        ),
        h('span', { class: 'ops-ledger-end' }, amount(t.amount, t.asset), badge(TONE.txn[t.status], TXN_STATUS_LABEL[t.status])),
      );
    }),
  );
}

/** Shortcuts from a record to the Actions page (administrators only), already filled in. */
function quickActions(links: Array<[string, string] | null>): HTMLElement | null {
  const present = links.filter((l): l is [string, string] => !!l);
  return present.length ? h('p', { class: 'ops-head-tools ops-quick' }, ...present.map(([label, href]) => h('a', { class: 'ops-btn', href }, label))) : null;
}

function head(name: string, sub: string, square = false): HTMLElement {
  return h(
    'div',
    { class: 'ops-drawer-top' },
    h('span', { class: `ops-disc${square ? ' ops-disc-sq' : ''}`, 'aria-hidden': 'true' }, initials(name)),
    h('div', {}, h('h2', { class: 'ops-drawer-title', id: 'drawer-title' }, name), h('p', { class: 'ops-sub' }, sub)),
  );
}

// ── User ─────────────────────────────────────────────────────────────────
function renderUser(u: AdminUserDetail, content: HTMLElement, recent: Transaction[] | null): void {
  fill(
    content,
    head(u.name, `${countryName(u.country)} · joined ${date(u.joinedAt)}`),
    h(
      'p',
      { class: 'ops-head-meta' },
      badge(TONE.user[u.status], USER_STATUS_LABEL[u.status]),
      u.walletStatus ? badge(TONE.wallet[u.walletStatus], `Wallet: ${WALLET_STATUS_LABEL[u.walletStatus]}`) : null,
    ),
    quickActions([
      hasPermission('messages:send') ? ['Message', `${routes.actions}?message=${encodeURIComponent(u.id)}#message`] : null,
      hasPermission('money:send') ? ['Send money', `${routes.actions}?to=${encodeURIComponent(u.id)}#money`] : null,
    ]),
    section(
      'Profile',
      dl([
        ['User ID', copyButton(u.id, 'user ID')],
        ['Email', u.email],
        ['Country', country(u.country)],
        ['Registered', dateTime(u.joinedAt)],
        ['Last activity', u.lastActiveAt ? `${ago(u.lastActiveAt)} · ${dateTime(u.lastActiveAt)}` : 'Never'],
      ]),
    ),
    section(
      'Account',
      dl([
        ['Account status', USER_STATUS_LABEL[u.status]],
        ['Wallet', u.walletStatus ? WALLET_STATUS_LABEL[u.walletStatus] : 'Not available'],
        ['Onboarding', u.onboarding ? (u.onboarding === 'complete' ? 'Complete' : 'In progress') : 'Not available'],
      ]),
    ),
    section(
      'Device',
      dl([
        ['App version', u.appVersion ?? 'Not available'],
        ['Device', u.device ?? 'Not available'],
        ['Platform', u.platform === 'ios' ? 'iOS' : u.platform === 'android' ? 'Android' : 'Not available'],
      ]),
    ),
    u.totals
      ? section(
          'Money',
          dl([
            ['Transactions', num(u.totals.transactions)],
            ['Completed volume', usd(u.totals.volumeUsd)],
          ]),
        )
      : null,
    recent
      ? section(
          'Recent transactions',
          miniTxnList(recent, u.id),
          h('p', { class: 'ops-sec-foot' }, h('a', { class: 'ops-link', href: `${routes.transactions}?user=${encodeURIComponent(u.id)}` }, 'All of this user’s transactions')),
        )
      : null,
    h('p', { class: 'ops-note' }, 'This record never includes passwords, private keys or session tokens: the API does not send them.'),
  );
}

export function openUser(id: string): void {
  drawer().open(
    'User',
    async (signal) => {
      const [u, recent] = await Promise.all([
        getUserById(id, { signal }),
        hasPermission('transactions:read') ? getTransactions({ page: 1, pageSize: 5, userId: id }, { signal }).then((p) => p.items) : Promise.resolve(null),
      ]);
      return { u, recent };
    },
    ({ u, recent }, content) => renderUser(u, content, recent),
  );
}

// ── Transaction: the receipt ─────────────────────────────────────────────
function party(p: Transaction['from']): Node {
  const label = `${p.name} · ${countryName(p.country)}`;
  if (p.kind === 'user' && p.id && hasPermission('users:read')) return h('a', { class: 'ops-who-name', href: userHref(p.id) }, label);
  if (p.kind === 'connector' && p.id && hasPermission('connectors:read')) return h('a', { class: 'ops-who-name', href: connectorHref(p.id) }, label);
  return h('span', {}, label, p.kind === 'external' ? h('span', { class: 'ops-sub' }, ' (outside Shaheen)') : null);
}

function renderTxn(t: Transaction, content: HTMLElement): void {
  const tpl = $<HTMLTemplateElement>('template[data-receipt]');
  const rows = dl([
    ['Type', FLOW_LABEL[t.type]],
    ['Status', badge(TONE.txn[t.status], TXN_STATUS_LABEL[t.status])],
    ['US dollar value', usd(Number(t.usdValue), { cents: true })],
    ['From', party(t.from)],
    ['To', party(t.to)],
    ['Corridor', corridor(t.corridor.from, t.corridor.to)],
    ['Created', dateTime(t.createdAt)],
    ['Completed', t.completedAt ? dateTime(t.completedAt) : null],
    ['Reason', t.failureReason ?? null],
    ['Reference', copyButton(t.id, 'transaction ID')],
  ]);
  const amountEl = h('p', { class: 'ops-receipt-amount num' }, Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }), h('small', {}, t.asset));
  let receipt: Node;
  if (tpl) {
    const frag = tpl.content.cloneNode(true) as DocumentFragment;
    const meta = frag.querySelector('.slip-meta');
    if (meta) meta.textContent = dateTime(t.createdAt);
    need('[data-receipt-body]', frag).replaceChildren(amountEl, rows);
    receipt = frag;
  } else {
    receipt = h('div', {}, amountEl, rows);
  }
  fill(
    content,
    h('h2', { class: 'ops-drawer-title', id: 'drawer-title' }, `${FLOW_LABEL[t.type]} of ${amount(t.amount, t.asset)}`),
    h('p', { class: 'ops-sub num' }, t.id),
    quickActions([hasPermission('refunds:issue') && t.status === 'completed' ? ['Refund', `${routes.actions}?refund=${encodeURIComponent(t.id)}#refund`] : null]),
    h('div', { class: 'ops-drawer-sec' }, receipt),
    t.status === 'failed' ? h('p', { class: 'ops-note ops-note-alert' }, t.failureReason ? `Failed: ${t.failureReason}.` : 'This transaction failed.') : null,
  );
}

export function openTransaction(id: string): void {
  drawer().open('Transaction', (signal) => getTransactionById(id, { signal }), renderTxn);
}

// ── Connector ────────────────────────────────────────────────────────────
function chartFrame(label: string): HTMLElement {
  return h(
    'figure',
    { class: 'ops-chart ops-chart-sm' },
    h(
      'div',
      { class: 'ops-chart-plot', tabindex: 0, role: 'group', 'aria-roledescription': 'chart', 'aria-label': label, dir: 'ltr' },
      s('svg', { class: 'ops-chart-svg', 'aria-hidden': 'true' }),
      h('div', { class: 'ops-tip', 'aria-hidden': 'true' }),
    ),
    h('details', { class: 'ops-chart-table' }, h('summary', { class: 'micro' }, 'View as table'), h('div', { class: 'ops-tablewrap' }, h('table', { class: 'ops-table' }, h('caption', { class: 'sr-only' }, label)))),
  );
}

function renderConnector(c: ConnectorDetail, content: HTMLElement, recent: Transaction[] | null): void {
  const count = c.transactionCount;
  const volume = Number(c.volumeUsd);
  const frame = chartFrame(`Cash-outs per day at ${c.name}, last 30 days`);
  fill(
    content,
    head(c.name, `${c.city}, ${countryName(c.country)}`, true),
    h('p', { class: 'ops-head-meta' }, badge(TONE.connector[c.status], CONNECTOR_STATUS_LABEL[c.status]), h('span', { class: 'micro' }, c.lastActiveAt ? `Last cash-out ${ago(c.lastActiveAt).toLowerCase()}` : 'No cash-outs yet')),
    section(
      'Last 30 days',
      dl([
        ['Cash-outs', num(count)],
        ['Volume', usd(volume)],
        ['Average cash-out', count ? usd(volume / count) : '—'],
      ]),
    ),
    section('Cash-outs per day', frame),
    section(
      'Profile',
      dl([
        ['Connector ID', copyButton(c.id, 'Connector ID')],
        ['City', c.city],
        ['Country', country(c.country)],
        ['Onboarded', c.onboardedAt ? date(c.onboardedAt) : 'Not available'],
        ['Last active', c.lastActiveAt ? dateTime(c.lastActiveAt) : 'Never'],
      ]),
    ),
    recent ? section('Recent cash-outs', miniTxnList(recent)) : null,
  );
  // Drawn once the frame is in the document and has a size.
  requestAnimationFrame(() => {
    const chart = new TimeChart(frame);
    chart.render(
      c.activity.map((d) => ({ t: d.date, v: d.count })),
      {
        kind: 'columns',
        bucket: 'day',
        label: 'Cash-outs',
        cash: true,
        format: (v) => num(v),
        extra: [{ label: 'Volume', values: c.activity.map((d) => d.volumeUsd), format: (v) => usd(v) }],
      },
    );
  });
}

export function openConnector(id: string): void {
  drawer().open(
    'Connector',
    async (signal) => {
      const [c, recent] = await Promise.all([
        getConnectorById(id, { signal }),
        hasPermission('transactions:read') ? getTransactions({ page: 1, pageSize: 6, connectorId: id }, { signal }).then((p) => p.items) : Promise.resolve(null),
      ]);
      return { c, recent };
    },
    ({ c, recent }, content) => renderConnector(c, content, recent),
  );
}

/** Opens the drawer for whatever ?user= / ?txn= / ?connector= the address names, and keeps it in step with Back. */
export function drawerFromUrl(key: 'user' | 'txn' | 'connector', open: (id: string) => void): void {
  const sync = () => {
    const id = new URLSearchParams(location.search).get(key);
    if (id) open(id);
    else if (drawer().isOpen()) drawer().close();
  };
  drawer().onClose(() => {
    const p = new URLSearchParams(location.search);
    if (p.has(key)) {
      p.delete(key);
      const qs = p.toString();
      history.pushState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
    }
  });
  addEventListener('popstate', sync);
  sync();
}

/** A row's link opens the record in place: the address changes, the list stays. */
export function openFromRow(href: string): void {
  const url = new URL(href, location.href);
  const p = new URLSearchParams(location.search);
  for (const [k, v] of url.searchParams) p.set(k, v);
  history.pushState(null, '', `${location.pathname}?${p.toString()}`);
  dispatchEvent(new PopStateEvent('popstate'));
}
