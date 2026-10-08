/**
 * Draws the network onto the map NetworkMap.astro rendered: a node per
 * country (its area follows users), an amber ring where there are active
 * Connectors, and a great-circle hairline per corridor (its weight follows
 * volume). One packet runs one corridor at a time, only with full motion
 * and only while the page is visible. Hover or focus anything for its
 * figures; the tables beside the map hold the same figures without a
 * pointer.
 */
import { geoEqualEarth, geoInterpolate, type GeoProjection } from 'd3-geo';
import type { Corridor, CountryStat, GlobalNetwork, Range } from '../types/admin';
import { COUNTRIES, countryName } from '../lib/geo';
import { comparisonLabel, delta, deltaText, num, usd } from '../lib/format';
import { motionLevel } from '../../lib/motion/level';
import { clear, h, need, s, setVar } from '../ui/dom';
import { corridor as corridorEl, deltaEl } from '../ui/render';

export class MapView {
  private readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly tip: HTMLElement;
  private readonly projection: GeoProjection;
  private readonly W: number;
  private packetTimer: ReturnType<typeof setTimeout> | undefined;
  private arcs: Array<{ d: string; length: number }> = [];

  constructor(el: HTMLElement) {
    this.el = el;
    this.svg = need<SVGSVGElement>('svg', el);
    this.tip = need('.ops-tip', el);
    this.W = Number(el.dataset.w);
    this.projection = geoEqualEarth()
      .rotate([Number(el.dataset.rotate), 0])
      .scale(Number(el.dataset.scale))
      .translate([Number(el.dataset.tx), Number(el.dataset.ty)]);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stopPackets() : this.startPackets()));
  }

  private at(lon: number, lat: number): [number, number] {
    return this.projection([lon, lat]) as [number, number];
  }

  render(net: GlobalNetwork, opts: { corridors?: number; labels?: number } = {}): void {
    const arcsG = need<SVGGElement>('[data-arcs]', this.svg);
    const nodesG = need<SVGGElement>('[data-nodes]', this.svg);
    const labelsG = need<SVGGElement>('[data-labels]', this.svg);
    [arcsG, nodesG, labelsG].forEach(clear);
    this.stopPackets();

    const corridors = (net.corridors ?? []).filter((c) => COUNTRIES[c.from] && COUNTRIES[c.to]).slice(0, opts.corridors ?? 10);
    const maxVol = Math.max(1, ...corridors.map((c) => c.volumeUsd));
    this.arcs = [];
    corridors.forEach((c, i) => {
      const a = COUNTRIES[c.from]!;
      const b = COUNTRIES[c.to]!;
      const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
      const pts = Array.from({ length: 49 }, (_, k) => this.at(...interp(k / 48)));
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
      let length = 0;
      for (let k = 1; k < pts.length; k++) length += Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]);
      this.arcs.push({ d, length });
      const width = 0.8 + 2.6 * Math.sqrt(c.volumeUsd / maxVol);
      const g = s('g', {
        class: 'map-arc-g',
        tabindex: 0,
        role: 'img',
        'aria-label': `${countryName(c.from)} to ${countryName(c.to)}: ${usd(c.volumeUsd)}, ${num(c.count)} transfers`,
        'data-key': `${c.from}>${c.to}`,
      });
      g.append(s('path', { class: 'map-arc', d, 'stroke-width': width.toFixed(2), 'data-i': i }), s('path', { class: 'map-arc-hit', d }));
      const show = () => this.tipFor(pts[24]!, [h('span', { class: 'ops-tip-when micro' }, `${c.from} → ${c.to}`), this.row(`${countryName(c.from)} → ${countryName(c.to)}`, usd(c.volumeUsd)), this.row('Transfers', num(c.count)), this.row('Change', deltaText(delta(c.volumeUsd, c.previousVolumeUsd)))], `${c.from}>${c.to}`);
      g.addEventListener('pointerenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => this.hideTip());
      g.addEventListener('blur', () => this.hideTip());
      arcsG.append(g);
    });

    const countries = net.countries.filter((c) => COUNTRIES[c.code] && (c.users > 0 || c.volumeUsd > 0));
    const maxUsers = Math.max(1, ...countries.map((c) => c.users));
    const byVolume = [...countries].sort((a, b) => b.volumeUsd - a.volumeUsd);
    const labelled = new Set(byVolume.slice(0, opts.labels ?? 8).map((c) => c.code));
    const placed: Array<[number, number, number, number]> = [];
    for (const c of [...countries].sort((a, b) => b.users - a.users)) {
      const ref = COUNTRIES[c.code]!;
      const [x, y] = this.at(ref.lon, ref.lat);
      const r = 2.5 + 7 * Math.sqrt(c.users / maxUsers);
      const g = s('g', { class: 'map-node-g', tabindex: 0, role: 'img', 'aria-label': this.countryText(c), 'data-key': c.code });
      if (c.connectors > 0) g.append(s('circle', { class: 'map-node-ring has-connectors', cx: x, cy: y, r: r + 4 }));
      g.append(s('circle', { class: 'map-node', cx: x, cy: y, r }), s('circle', { class: 'map-node-hit', cx: x, cy: y, r: Math.max(12, r + 6) }));
      const show = () =>
        this.tipFor([x, y], [h('span', { class: 'ops-tip-when micro' }, `${c.code} · ${ref.city}`), this.row(countryName(c.code), usd(c.volumeUsd)), this.row('Users', num(c.users)), this.row('Active Connectors', num(c.connectors))], c.code);
      g.addEventListener('pointerenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => this.hideTip());
      g.addEventListener('blur', () => this.hideTip());
      nodesG.append(g);

      if (labelled.has(c.code)) {
        const text = ref.city.toUpperCase();
        const w = text.length * 7.2;
        // To the right of the dot, unless that would collide or leave the map.
        const candidates: Array<[number, number, 'start' | 'end']> = [
          [x + r + 7, y + 4, 'start'],
          [x - r - 7, y + 4, 'end'],
          [x + r + 5, y - r - 4, 'start'],
          [x + r + 5, y + r + 12, 'start'],
        ];
        for (const [lx, ly, anchor] of candidates) {
          const box: [number, number, number, number] = [anchor === 'start' ? lx : lx - w, ly - 10, w, 13];
          const clash = placed.some((p) => box[0] < p[0] + p[2] && box[0] + box[2] > p[0] && box[1] < p[1] + p[3] && box[1] + box[3] > p[1]);
          if (!clash && box[0] > 4 && box[0] + w < this.W - 4) {
            placed.push(box);
            labelsG.append(s('text', { class: 'map-label', x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': anchor }, text));
            break;
          }
        }
      }
    }
    this.startPackets();
  }

  private countryText(c: CountryStat): string {
    return `${countryName(c.code)}: ${num(c.users)} users, ${num(c.connectors)} active Connectors, ${usd(c.volumeUsd)} volume`;
  }

  private row(label: string, value: string): HTMLElement {
    return h('span', { class: 'ops-tip-row' }, h('span', {}, label), h('b', {}, value));
  }

  private tipFor([x, y]: [number, number], children: HTMLElement[], key: string): void {
    this.tip.replaceChildren(...children);
    this.tip.toggleAttribute('data-show', true);
    this.el.dataset.focus = key;
    for (const g of this.svg.querySelectorAll('[data-key]')) g.querySelector('.map-arc')?.classList.toggle('is-hot', (g.getAttribute('data-key') ?? '').includes(key));
    const scale = this.el.clientWidth / this.W;
    const tw = this.tip.offsetWidth;
    const px = x * scale;
    const left = px + 16 + tw > this.el.clientWidth ? px - 16 - tw : px + 16;
    this.tip.style.translate = `${Math.max(4, left)}px ${Math.max(4, y * scale - 24)}px`;
  }

  private hideTip(): void {
    this.tip.removeAttribute('data-show');
    delete this.el.dataset.focus;
  }

  private stopPackets(): void {
    clearTimeout(this.packetTimer);
    clear(need('[data-packets]', this.svg));
  }

  private startPackets(): void {
    if (motionLevel() !== 'full' || !this.arcs.length || document.hidden) return;
    const layer = need<SVGGElement>('[data-packets]', this.svg);
    let i = 0;
    const next = () => {
      // Busier corridors carry the packet more often: walk the top half twice.
      const pool = this.arcs.length;
      const arc = this.arcs[i % pool]!;
      i = (i + 1) % (pool + Math.ceil(pool / 2));
      const p = s('path', { class: 'map-packet', d: arc.d, pathLength: 1000, 'stroke-dasharray': `${((16 / Math.max(arc.length, 1)) * 1000).toFixed(2)} 1000` });
      layer.append(p);
      requestAnimationFrame(() => p.classList.add('is-running'));
      p.addEventListener('animationend', () => p.remove(), { once: true });
      this.packetTimer = setTimeout(next, 3000);
    };
    this.packetTimer = setTimeout(next, 600);
  }
}

/** The ranked corridor ledger beside the map. */
export function renderCorridors(root: HTMLElement, corridors: Corridor[], range: Range, limit = 8): boolean {
  const top = corridors.slice(0, limit);
  const max = Math.max(1, ...top.map((c) => c.volumeUsd));
  root.replaceChildren(
    h(
      'ol',
      { class: 'ops-ledger' },
      ...top.map((c, i) => {
        const bar = h('i');
        setVar(bar, '--w', c.volumeUsd / max);
        return h(
          'li',
          { class: 'ops-ledger-row' },
          h('span', { class: 'ops-ledger-n' }, String(i + 1).padStart(2, '0')),
          h(
            'span',
            { class: 'ops-ledger-main' },
            h('span', { class: 'ops-ledger-title' }, corridorEl(c.from, c.to), h('span', { class: 'ops-sub' }, `${countryName(c.from)} to ${countryName(c.to)}`)),
            h('span', { class: 'ops-share' }, bar),
          ),
          h('span', { class: 'ops-ledger-end' }, usd(c.volumeUsd, { compact: true }), h('small', {}, `${num(c.count)} transfers`), deltaEl(c.volumeUsd, c.previousVolumeUsd, comparisonLabel(range))),
        );
      }),
    ),
  );
  return top.length > 0;
}
