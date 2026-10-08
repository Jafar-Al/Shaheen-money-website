/**
 * Pieces more than one page shows: the money route, transaction analytics,
 * the activity feed, the service list. Each takes API data and fills
 * server-rendered markup (src/components/admin); none holds data of its own.
 */
import { routes } from '../config';
import { getActivity, getMoneyMovement, getTransactionAnalytics } from '../services/adminApi';
import { hasPermission } from '../services/auth';
import type { ActivityEvent, FlowType, MoneyMovement, Range, ServiceHealth, SystemHealth } from '../types/admin';
import {
  FLOW_LABEL,
  SERVICE_META,
  SERVICE_STATUS_LABEL,
  TONE,
  ago,
  comparisonLabel,
  dayMonth,
  num,
  pct,
  rangeWords,
  time,
  usd,
  weekday,
  type Tone,
} from '../lib/format';
import { countryName } from '../lib/geo';
import { TimeChart, meter, sparkline } from '../ui/charts';
import { figure, h, need } from '../ui/dom';
import { load, region } from '../ui/region';
import { badge, deltaEl } from '../ui/render';
import { segmented } from '../ui/segmented';

// ── Money movement ───────────────────────────────────────────────────────
export function fillFlow(root: HTMLElement, mm: MoneyMovement): boolean {
  const cmp = comparisonLabel(mm.range);
  const types: FlowType[] = ['receive', 'send', 'payment', 'cash_out'];
  for (const type of types) {
    const st = mm.stages[type];
    const li = need(`[data-stage="${type}"]`, root);
    figure(need('[data-value]', li), usd(st.volumeUsd, { compact: true }));
    need('[data-count]', li).textContent = `${num(st.count)} transactions`;
    need('[data-delta]', li).replaceChildren(deltaEl(st.volumeUsd, st.previousVolumeUsd, cmp));
    sparkline(need<SVGSVGElement>('[data-spark]', li), st.series);
  }
  const store = need('[data-stage="store"]', root);
  const s = mm.store;
  figure(need('[data-value]', store), s.walletBalanceUsd !== null ? usd(s.walletBalanceUsd, { compact: true }) : num(s.fundedWallets));
  need('[data-count]', store).textContent = `${num(s.fundedWallets)} funded wallets`;
  need('[data-delta]', store).replaceChildren(deltaEl(s.fundedWallets, s.previousFundedWallets, cmp));
  need('[data-spark]', store).replaceChildren();
  return types.some((t) => mm.stages[t].count > 0) || s.fundedWallets > 0;
}

export function flowBlock(name: string): { load: (range: Range) => void; last: () => MoneyMovement | null } {
  const r = region(name);
  let last: MoneyMovement | null = null;
  return {
    load: (range) =>
      void load(
        r,
        (signal) => getMoneyMovement(range, { signal }),
        (mm) => {
          last = mm;
          return fillFlow(r.content, mm);
        },
      ),
    last: () => last,
  };
}

// ── Transaction analytics ────────────────────────────────────────────────
export function txnBlock(id: string, initialType: FlowType | 'all' = 'all'): { load: (range: Range) => void; type: () => FlowType | 'all' } {
  const r = region(`${id}-data`);
  const chart = new TimeChart(need(`[data-chart="${id}-chart"]`));
  const seg = segmented(`${id}-type`);
  seg.set(initialType, false);
  let range: Range = '30d';

  const run = () => {
    const type = seg.value() as FlowType | 'all';
    void load(
      r,
      (signal) => getTransactionAnalytics(range, type, { signal }),
      (a) => {
        const root = r.content;
        const t = a.totals;
        const cash = type === 'cash_out';
        const label = type === 'all' ? 'Completed volume' : `${FLOW_LABEL[type]} volume`;
        need('[data-chart-title]', root).textContent = label;
        need('[data-chart-meta]', root).textContent = `Per ${a.bucket} · last ${rangeWords(range)}`;
        chart.render(
          a.series.map((p) => ({ t: p.t, v: p.volumeUsd })),
          {
            kind: 'area',
            bucket: a.bucket,
            label,
            cash,
            format: (v) => usd(v),
            axis: (v) => usd(v, { compact: true }).replace('.00', ''),
            extra: [
              { label: 'Transactions', values: a.series.map((p) => p.count), format: (v) => num(v) },
              { label: 'Failed', values: a.series.map((p) => p.failed), format: (v) => num(v) },
            ],
            summary: `${label} over the last ${rangeWords(range)}: ${usd(t.volumeUsd)} in total. Use the arrow keys to read each ${a.bucket}, or open the table.`,
          },
        );
        figure(need('[data-total]', root), num(t.count));
        need('[data-total-delta]', root).replaceChildren(deltaEl(t.count, t.previousCount, comparisonLabel(range)));
        meter(need('[data-meter]', root), [
          { tone: 'good', value: t.completed },
          { tone: 'quiet', value: t.pending },
          { tone: 'alert', value: t.failed },
          { tone: 'muted', value: t.cancelled },
        ]);
        for (const key of ['completed', 'pending', 'failed', 'cancelled'] as const) {
          const row = need(`[data-row="${key}"]`, root);
          need('[data-count]', row).textContent = num(t[key]);
          need('[data-share]', row).textContent = t.count ? pct((t[key] / t.count) * 100) : '—';
        }
        need('[data-volume]', root).textContent = usd(t.volumeUsd);
        need('[data-volume-delta]', root).replaceChildren(deltaEl(t.volumeUsd, t.previousVolumeUsd, comparisonLabel(range)));
        return t.count > 0;
      },
    );
  };
  seg.onChange(run);
  return {
    load: (next) => {
      range = next;
      run();
    },
    type: () => seg.value() as FlowType | 'all',
  };
}

// ── Activity ─────────────────────────────────────────────────────────────
function eventTone(e: ActivityEvent): Tone {
  switch (e.kind) {
    case 'transaction.failed':
      return 'alert';
    case 'security.alert':
      return e.severity === 'critical' ? 'alert' : e.severity === 'warning' ? 'warn' : 'quiet';
    case 'system.degraded':
      return 'warn';
    case 'connector.deactivated':
      return 'muted';
    case 'user.registered':
    case 'admin.signed_in':
      return 'quiet';
    default:
      return 'good';
  }
}

function subjectLink(e: ActivityEvent): Node | string {
  const s = e.subject;
  if (!s) return '';
  const href =
    s.type === 'user' && hasPermission('users:read')
      ? `${routes.users}?user=${encodeURIComponent(s.id)}`
      : s.type === 'transaction' && hasPermission('transactions:read')
        ? `${routes.transactions}?txn=${encodeURIComponent(s.id)}`
        : s.type === 'connector' && hasPermission('connectors:read')
          ? `${routes.connectors}?connector=${encodeURIComponent(s.id)}`
          : null;
  return href ? h('a', { href, class: s.type === 'transaction' ? 'ops-mono' : null }, s.label) : s.label;
}

function eventLine(e: ActivityEvent): Array<Node | string> {
  const amt = e.amountUsd !== undefined ? usd(e.amountUsd, { cents: false }) : '';
  const subj = subjectLink(e);
  switch (e.kind) {
    case 'user.registered':
      return [subj, ' signed up', e.country ? ` in ${countryName(e.country)}` : '', '.'];
    case 'user.onboarded':
      return [subj, ' finished onboarding.'];
    case 'transaction.completed':
      return [`A ${amt} transfer completed: `, subj, '.'];
    case 'transaction.failed':
      return [`A ${amt} transaction failed: `, subj, '.'];
    case 'cashout.completed':
      return [`Cash-out of ${amt} completed`, e.detail ? ` at ${e.detail}` : '', ': ', subj, '.'];
    case 'connector.activated':
      return [subj, ' became an active Connector.'];
    case 'connector.deactivated':
      return [subj, ' stopped handing out cash (inactive).'];
    case 'admin.signed_in':
      return [`${e.subject?.label ?? 'An admin'} signed in to operations.`];
    case 'security.alert':
      return [e.detail ?? 'Security event.'];
    case 'system.degraded':
      return ['Degraded: ', e.subject?.label ?? 'a service', '.'];
    case 'system.resolved':
      return ['Resolved: ', e.subject?.label ?? 'a service', '.'];
    default:
      return [String(e.kind)];
  }
}

const CATEGORY_LABEL: Record<string, string> = { users: 'Users', transactions: 'Transactions', connectors: 'Connectors', security: 'Security', system: 'System' };

export function feedItem(e: ActivityEvent, compact = false): HTMLElement {
  const meta = [CATEGORY_LABEL[e.category] ?? e.category];
  if (e.kind === 'transaction.failed' && e.detail) meta.push(e.detail);
  if (e.kind === 'admin.signed_in' && e.detail) meta.push(e.detail);
  if (e.asset) meta.push(e.asset);
  return h(
    'li',
    { class: 'ops-feed-item', 'data-tone': eventTone(e) },
    h('time', { class: 'ops-feed-time', datetime: e.at, title: new Date(e.at).toLocaleString('en-GB') }, compact ? ago(e.at) : time(e.at)),
    h('span', { class: 'ops-feed-mark', 'aria-hidden': 'true' }, h('span', { class: 'ops-dot' })),
    h('span', { class: 'ops-feed-body' }, h('span', { class: 'ops-feed-text' }, ...eventLine(e)), h('span', { class: 'ops-feed-meta' }, ...meta.map((m) => h('span', {}, m)))),
  );
}

/** A day-grouped timeline (Activity page) or a flat recent list (Command Center). */
export function renderFeed(root: HTMLElement, events: ActivityEvent[], opts: { compact?: boolean; append?: boolean } = {}): void {
  if (opts.compact) {
    root.replaceChildren(h('ol', { class: 'ops-feed ops-feed-compact' }, ...events.map((e) => feedItem(e, true))));
    return;
  }
  if (!opts.append) root.replaceChildren();
  for (const e of events) {
    const day = new Date(e.at).toDateString();
    let list = root.querySelector<HTMLOListElement>(`ol[data-day="${day}"]`);
    if (!list) {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86_400_000).toDateString();
      const label = day === today ? `Today · ${dayMonth(e.at)}` : day === yesterday ? `Yesterday · ${dayMonth(e.at)}` : weekday(e.at);
      root.append(h('h3', { class: 'ops-feed-day label' }, label));
      list = h('ol', { class: 'ops-feed', 'data-day': day });
      root.append(list);
    }
    list.append(feedItem(e));
  }
}

export function recentActivity(name: string, limit = 8): { load: () => void } {
  const r = region(name);
  return {
    load: () =>
      void load(
        r,
        (signal) => getActivity({ limit }, { signal }),
        (page) => {
          renderFeed(r.content, page.items, { compact: true });
          return page.items.length > 0;
        },
      ),
  };
}

// ── Services ─────────────────────────────────────────────────────────────
export function serviceRow(s: ServiceHealth, opts: { history?: boolean } = {}): HTMLElement {
  const meta = SERVICE_META[s.id] ?? { name: s.id, description: '' };
  const tone = TONE.service[s.status];
  const row = h(
    'li',
    { class: 'ops-svc ops-ledger-row no-n', 'data-service': s.id },
    h(
      'span',
      { class: 'ops-ledger-main' },
      h('span', { class: 'ops-ledger-title' }, meta.name),
      opts.history ? h('span', { class: 'ops-sub' }, s.message ?? meta.description) : s.message ? h('span', { class: 'ops-sub' }, s.message) : null,
    ),
    h(
      'span',
      { class: 'ops-ledger-end' },
      badge(tone, SERVICE_STATUS_LABEL[s.status]),
      h('small', {}, [s.uptime30d !== null ? `${s.uptime30d.toFixed(2)}% · 30D` : null, s.latencyP95Ms !== null ? `p95 ${num(s.latencyP95Ms)} ms` : null].filter(Boolean).join(' · ')),
    ),
  );
  if (opts.history) {
    const bars = h('span', { class: 'ops-uptime', role: 'img', 'aria-label': `${meta.name}: last 30 days` });
    for (const d of s.history) {
      const tone = d.status === 'no_data' ? 'muted' : TONE.service[d.status];
      const label = `${dayMonth(d.date)}: ${d.status === 'no_data' ? 'No data' : SERVICE_STATUS_LABEL[d.status]}`;
      bars.append(h('span', { 'data-tone': tone, title: label }));
    }
    row.append(h('span', { class: 'ops-svc-history' }, bars, h('span', { class: 'ops-svc-scale micro' }, h('span', {}, '30 days ago'), h('span', {}, 'Today'))));
  }
  return row;
}

export function overallLabel(h: SystemHealth): string {
  return h.status === 'operational' ? 'All systems operational' : h.status === 'degraded' ? 'Some systems degraded' : 'Service disruption';
}

/** Keeps a "checked 2 min ago" line honest; call the returned function when new data lands. */
export function freshness(el: HTMLElement, iso: () => string | null): () => void {
  const tick = () => {
    const at = iso();
    el.textContent = at ? `Updated ${ago(at).toLowerCase()} · ${time(at)}` : '';
  };
  tick();
  setInterval(tick, 15_000);
  return tick;
}

