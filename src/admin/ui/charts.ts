/**
 * The console's charts, drawn as SVG in the brand's marks: hairline,
 * recessive grids; a 2px line with a 10% wash; columns at most 24px wide
 * with a 2px surface gap and a 2px rounded data end; an end dot with a 2px
 * surface ring. One series per chart, in the accent (amber when the series
 * is physical cash): when there is more to compare, the console uses small
 * multiples, never a second axis.
 *
 * Interactive by default: a crosshair that snaps to the nearest bucket and
 * a tooltip with every value at that point, on pointer and on keyboard
 * (←/→, Home/End). Never the only way to a value: every chart has a
 * "View as table" twin (ChartFrame.astro).
 */
import { h, need, s, setVar, clear } from './dom';
import { tick, weekday, dayMonth, time } from '../lib/format';

export interface TimePoint {
  t: string;
  v: number;
}

export interface Extra {
  label: string;
  values: number[];
  format: (v: number) => string;
}

export interface TimeChartOptions {
  kind: 'area' | 'line' | 'columns';
  bucket: 'hour' | 'day' | 'week';
  /** Series name, for the tooltip and the table. */
  label: string;
  format: (v: number) => string;
  /** Compact form for the axis, e.g. $12K. */
  axis?: ((v: number) => string) | undefined;
  /** Physical cash: the series in amber. */
  cash?: boolean | undefined;
  /** Shared top of scale, for small multiples that must compare. */
  yMax?: number | undefined;
  /** Rows the tooltip and table also show, not plotted. */
  extra?: Extra[] | undefined;
  /** Accessible summary of the whole chart. */
  summary?: string | undefined;
}

const M = { top: 10, end: 8, bottom: 26, start: 52 };

/** A clean top of scale and four ticks: 0, 1/4 … */
export function niceScale(max: number): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw)!;
  const top = step * 4;
  return { top, ticks: [0, step, step * 2, step * 3, top] };
}

function when(iso: string, bucket: TimeChartOptions['bucket']): string {
  if (bucket === 'hour') return `${dayMonth(iso)} · ${time(iso)}`;
  if (bucket === 'week') return `Week of ${dayMonth(iso)}`;
  return weekday(iso);
}

export class TimeChart {
  private readonly plot: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly tip: HTMLElement;
  private readonly table: HTMLTableElement | null;
  private points: TimePoint[] = [];
  private opts: TimeChartOptions | null = null;
  private index = -1;
  private geometry: { x: (i: number) => number; y: (v: number) => number; band: number } | null = null;
  private overlay: SVGGElement | null = null;
  private frame = 0;

  constructor(host: HTMLElement) {
    this.plot = need('.ops-chart-plot', host);
    this.svg = need<SVGSVGElement>('svg', this.plot);
    this.tip = need('.ops-tip', this.plot);
    this.table = host.querySelector('table');

    new ResizeObserver(() => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.draw());
    }).observe(this.plot);

    this.plot.addEventListener('pointermove', (e) => this.pointAt(e.clientX));
    this.plot.addEventListener('pointerleave', () => this.hide());
    this.plot.addEventListener('focus', () => this.show(this.index >= 0 ? this.index : this.points.length - 1));
    this.plot.addEventListener('blur', () => this.hide());
    this.plot.addEventListener('keydown', (e) => {
      if (!this.points.length) return;
      const last = this.points.length - 1;
      const next =
        e.key === 'ArrowRight' ? Math.min(last, this.index + 1) : e.key === 'ArrowLeft' ? Math.max(0, this.index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
      if (e.key === 'Escape') this.hide();
      if (next === null) return;
      e.preventDefault();
      this.show(next);
    });
  }

  render(points: TimePoint[], opts: TimeChartOptions): void {
    this.points = points;
    this.opts = opts;
    this.plot.classList.toggle('is-cash', !!opts.cash);
    this.plot.setAttribute('aria-label', opts.summary ?? `${opts.label}, ${points.length} points. Use the arrow keys to read each value.`);
    this.draw();
    this.fillTable();
  }

  private draw(): void {
    const opts = this.opts;
    if (!opts) return;
    const W = this.plot.clientWidth;
    const H = this.plot.clientHeight;
    if (!W || !H) return;
    const svg = this.svg;
    clear(svg);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pts = this.points;
    const n = pts.length;
    const max = opts.yMax ?? Math.max(0, ...pts.map((p) => p.v));
    const { top, ticks } = niceScale(max);
    const plotW = W - M.start - M.end;
    const plotH = H - M.top - M.bottom;
    const columns = opts.kind === 'columns';
    const band = n ? plotW / n : plotW;
    const x = (i: number) => M.start + (columns ? band * (i + 0.5) : n > 1 ? (plotW * i) / (n - 1) : plotW / 2);
    const y = (v: number) => M.top + plotH - (Math.max(0, v) / top) * plotH;
    this.geometry = { x, y, band };
    const axis = opts.axis ?? opts.format;

    const grid = s('g');
    ticks.forEach((t, i) => {
      const yy = Math.round(y(t)) + 0.5;
      grid.append(s('line', { class: i === 0 ? 'ch-base' : 'ch-grid', x1: M.start, x2: W - M.end, y1: yy, y2: yy }));
      grid.append(s('text', { class: 'ch-tick', x: M.start - 10, y: yy + 3.5, 'text-anchor': 'end' }, axis(t)));
    });
    // About five dates along the bottom, never crowded.
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 96))));
    for (let i = 0; i < n; i += every) {
      const anchor = i === 0 && !columns ? 'start' : 'middle';
      grid.append(s('text', { class: 'ch-tick', x: x(i), y: H - 6, 'text-anchor': anchor }, tick(pts[i]!.t, opts.bucket)));
    }
    svg.append(grid);

    if (n) {
      if (columns) {
        const w = Math.max(1, Math.min(24, band - 2));
        const g = s('g');
        pts.forEach((p, i) => {
          const x0 = x(i) - w / 2;
          const y0 = y(p.v);
          const hgt = M.top + plotH - y0;
          if (hgt <= 0) return;
          const r = Math.min(2, w / 2, hgt);
          // Square at the baseline, a 2px rounded data end.
          const d = `M${x0} ${M.top + plotH}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}H${x0 + w - r}Q${x0 + w} ${y0} ${x0 + w} ${y0 + r}V${M.top + plotH}Z`;
          g.append(s('path', { class: i === n - 1 ? 'ch-bar is-now' : 'ch-bar', d, 'data-i': i }));
        });
        svg.append(g);
      } else {
        const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
        if (opts.kind === 'area') {
          svg.append(s('path', { class: 'ch-area', d: `${line}L${x(n - 1).toFixed(1)} ${M.top + plotH}L${x(0).toFixed(1)} ${M.top + plotH}Z` }));
        }
        svg.append(s('path', { class: 'ch-line', d: line }));
        svg.append(s('circle', { class: 'ch-dot', cx: x(n - 1), cy: y(pts[n - 1]!.v), r: 4 }));
      }
    }
    this.overlay = s('g', { 'aria-hidden': 'true' });
    svg.append(this.overlay);
    if (this.index >= 0 && this.tip.hasAttribute('data-show')) this.show(this.index);
  }

  private pointAt(clientX: number): void {
    if (!this.geometry || !this.points.length) return;
    const rect = this.plot.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    let dist = Infinity;
    this.points.forEach((_, i) => {
      const d = Math.abs(this.geometry!.x(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    this.show(best);
  }

  private show(i: number): void {
    const opts = this.opts;
    const g = this.geometry;
    if (!opts || !g || !this.overlay || i < 0 || i >= this.points.length) return;
    this.index = i;
    const p = this.points[i]!;
    const H = this.plot.clientHeight;
    clear(this.overlay);
    const xx = Math.round(g.x(i)) + 0.5;
    if (opts.kind === 'columns') {
      for (const bar of this.svg.querySelectorAll('.ch-bar')) bar.classList.toggle('is-hot', bar.getAttribute('data-i') === String(i));
    } else {
      this.overlay.append(s('line', { class: 'ch-cross', x1: xx, x2: xx, y1: M.top, y2: H - M.bottom }));
      this.overlay.append(s('circle', { class: 'ch-dot', cx: g.x(i), cy: g.y(p.v), r: 4 }));
    }

    this.tip.replaceChildren(
      h('span', { class: 'ops-tip-when micro' }, when(p.t, opts.bucket)),
      h('span', { class: 'ops-tip-row' }, h('span', {}, h('i', { class: 'ops-tip-key' }), opts.label), h('b', {}, opts.format(p.v))),
      ...(opts.extra ?? []).map((ex) => h('span', { class: 'ops-tip-row' }, h('span', {}, ex.label), h('b', {}, ex.format(ex.values[i] ?? 0)))),
    );
    this.tip.toggleAttribute('data-show', true);
    const W = this.plot.clientWidth;
    const tw = this.tip.offsetWidth;
    const left = g.x(i) + 14 + tw > W ? g.x(i) - 14 - tw : g.x(i) + 14;
    // CSSOM, not a style attribute: allowed by the CSP.
    this.tip.style.translate = `${Math.max(0, left)}px ${M.top}px`;
  }

  private hide(): void {
    this.tip.removeAttribute('data-show');
    if (this.overlay) clear(this.overlay);
    for (const bar of this.svg.querySelectorAll('.is-hot')) bar.classList.remove('is-hot');
  }

  private fillTable(): void {
    const opts = this.opts;
    if (!this.table || !opts) return;
    const head = h('tr', {}, h('th', { scope: 'col' }, 'Period'), h('th', { scope: 'col', class: 'is-num' }, opts.label), ...(opts.extra ?? []).map((e) => h('th', { scope: 'col', class: 'is-num' }, e.label)));
    const rows = this.points.map((p, i) =>
      h('tr', {}, h('td', {}, when(p.t, opts.bucket)), h('td', { class: 'is-num' }, opts.format(p.v)), ...(opts.extra ?? []).map((e) => h('td', { class: 'is-num' }, e.format(e.values[i] ?? 0)))),
    );
    const caption = this.table.querySelector('caption');
    this.table.replaceChildren(...(caption ? [caption] : []), h('thead', {}, head), h('tbody', {}, ...rows));
  }
}

/** A twelve-point line under a headline figure: shape, not values. */
export function sparkline(svg: SVGSVGElement, values: number[]): void {
  clear(svg);
  const rect = svg.getBoundingClientRect();
  const W = rect.width || 72;
  const H = rect.height || 24;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');
  if (values.length < 2) return;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) => 2 + ((W - 4) * i) / (values.length - 1);
  const y = (v: number) => H - 3 - ((v - min) / span) * (H - 6);
  svg.append(s('path', { d: values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('') }));
  svg.append(s('circle', { cx: x(values.length - 1), cy: y(values[values.length - 1]!), r: 3 }));
}

export interface MeterSegment {
  tone: string;
  value: number;
}

/** One 100% bar, a 2px surface gap between segments; the legend carries the words. */
export function meter(el: HTMLElement, segments: MeterSegment[]): void {
  const total = segments.reduce((n, x) => n + x.value, 0);
  el.replaceChildren(
    ...segments
      .filter((x) => x.value > 0)
      .map((x) => {
        const span = h('span', { 'data-tone': x.tone });
        setVar(span, '--w', total ? x.value / total : 0);
        return span;
      }),
  );
}
