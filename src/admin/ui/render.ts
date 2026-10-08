/**
 * Shared pieces the screens build from data: a state badge, a change
 * against the previous period, a headline figure, a person or a shop.
 * Each mirrors a piece of the site's vocabulary (tones with words, mono
 * figures, the falcon disc) so the screens stay one family.
 */
import type { Metric, Range } from '../types/admin';
import { comparisonLabel, delta, deltaText, initials, num, usd, type Tone } from '../lib/format';
import { sparkline } from './charts';
import { figure, h, need } from './dom';
import { countryName } from '../lib/geo';

export function badge(tone: Tone, label: string, live = false): HTMLElement {
  return h('span', { class: 'ops-badge', 'data-tone': tone }, h('span', { class: `ops-dot${live ? ' ops-dot-live' : ''}`, 'aria-hidden': 'true' }), label);
}

/**
 * "↑ 4.2% vs previous 30 days". `better` says which way is good news: up
 * for volume and users, down for failures, neutral when neither is.
 */
export function deltaEl(value: number, previous: number | null | undefined, comparison: string, better: 'up' | 'down' | 'neutral' = 'up'): HTMLElement {
  const d = delta(value, previous);
  // Nothing to compare with: say nothing rather than "no comparison" six times.
  if (d.pct === null) return h('span', { class: 'ops-delta' });
  const tone: Tone | undefined =
    d.pct === null || d.dir === 'flat' || better === 'neutral' ? undefined : (d.dir === 'up') === (better === 'up') ? 'good' : 'alert';
  return h(
    'span',
    { class: 'ops-delta', 'data-tone': tone },
    h('b', {}, deltaText(d)),
    d.pct === null || !comparison ? null : h('span', {}, comparison),
  );
}

export const formatMetric = (m: Metric, compact = true) => (m.unit === 'usd' ? usd(m.value, { compact }) : num(m.value, { compact }));

/**
 * Fills a server-rendered metric cell ([data-metric] in MetricStrip.astro):
 * the figure, the change, the sparkline.
 */
export function fillMetric(cell: HTMLElement, m: Metric, range: Range | null, better: 'up' | 'down' | 'neutral' = 'up'): void {
  const text = formatMetric(m);
  figure(need('[data-value]', cell), text);
  cell.querySelector('[data-value]')!.setAttribute('aria-label', text);
  const d = need('[data-delta]', cell);
  // The comparison is said once, in the strip's heading; each cell carries only its change.
  d.replaceChildren(deltaEl(m.value, m.previous, '', better));
  d.title = range ? comparisonLabel(range) : 'vs previous period';
  const spark = cell.querySelector<SVGSVGElement>('svg[data-spark]');
  if (spark) {
    if (m.series?.length) sparkline(spark, m.series);
    else spark.replaceChildren();
  }
}

/** A person or a shop: initials in a disc, a name, a line under it. */
export function who(name: string, sub: string, opts: { href?: string; square?: boolean; subMono?: boolean } = {}): HTMLElement {
  return h(
    'span',
    { class: 'ops-who' },
    h('span', { class: `ops-disc${opts.square ? ' ops-disc-sq' : ''}`, 'aria-hidden': 'true' }, initials(name)),
    h(
      'span',
      {},
      opts.href ? h('a', { class: 'ops-who-name', href: opts.href }, name) : h('span', { class: 'ops-who-name' }, name),
      h('span', { class: `ops-sub${opts.subMono ? ' num' : ''}` }, sub),
    ),
  );
}

/** "JO  Jordan": the ISO code in mono, then the name. */
export function country(code: string, withName = true): HTMLElement {
  return h('span', { class: 'ops-cc' }, h('span', { class: 'ops-code' }, code), withName ? countryName(code) : null);
}

/** "JO → AE", geography in reading order of the corridor. */
export function corridor(from: string, to: string): HTMLElement {
  return h('span', { class: 'ops-cc', dir: 'ltr', title: `${countryName(from)} to ${countryName(to)}` }, h('span', { class: 'ops-code' }, from), h('span', { class: 'ops-arrow', 'aria-hidden': 'true' }, '→'), h('span', { class: 'ops-code' }, to));
}

export function copyButton(text: string, label = text): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'ops-copy', title: 'Copy to clipboard', 'aria-label': `Copy ${label}` }, text);
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      b.toggleAttribute('data-copied', true);
      setTimeout(() => b.removeAttribute('data-copied'), 1600);
    } catch {
      /* clipboard blocked: the text stays selectable */
    }
  });
  return b;
}

/** A definition list of label → value rows, the drawer's ledger. */
export function dl(rows: Array<[string, Node | string | null | undefined]>): HTMLElement {
  return h(
    'dl',
    { class: 'ops-dl' },
    ...rows.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v as Node | string))),
  );
}
