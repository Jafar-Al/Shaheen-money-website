/**
 * Build-time engraved feathers (nothing here ships to the browser).
 *
 * A feather is drawn the way an engraver would cut it: a curved shaft (the
 * rachis) and a few hundred hairline barbs leaving it at an angle, curling
 * slightly toward the tip, with the vane's silhouette swelling and tapering
 * along its length and a few natural splits where barbs part. The same seed
 * always gives the same feather, so a page's art never changes between
 * builds and every blog post gets its own cover without an image file.
 */

/** mulberry32 on a string hash: small, fast, deterministic. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Pt = [number, number];

export interface FeatherSpec {
  /** Base of the shaft (where the quill would be). */
  from: Pt;
  /** Tip of the feather. */
  to: Pt;
  /** Sideways bow of the shaft, as a fraction of its length (+ bows left). */
  bow?: number;
  /** Vane width on each side, in viewBox units. */
  width: [number, number];
  /** Barbs per side. */
  barbs?: number;
  /** Angle of the barbs from the shaft, degrees. */
  angle?: number;
  /** How far the barbs curl toward the tip (fraction of their length). */
  curl?: number;
  seed: string;
}

export interface Feather {
  rachis: string;
  barbs: string;
  /** One barb, picked by the seed, for the accent colour. */
  accent: string;
  /** Where the accent barb ends, and the unit direction it is heading there. */
  accentTip: { at: Pt; dir: Pt } | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = ([x, y]: Pt) => `${r1(x)} ${r1(y)}`;

export function feather(spec: FeatherSpec): Feather {
  const rand = rng(spec.seed);
  const { from, to, width } = spec;
  const bow = spec.bow ?? 0.08;
  const count = spec.barbs ?? 90;
  const angle = ((spec.angle ?? 36) * Math.PI) / 180;
  const curl = spec.curl ?? 0.18;

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // Control point of the shaft's quadratic curve, bowed off the straight line.
  const ctrl: Pt = [from[0] + dx / 2 - uy * bow * len, from[1] + dy / 2 + ux * bow * len];

  const at = (t: number): Pt => {
    const m = 1 - t;
    return [m * m * from[0] + 2 * m * t * ctrl[0] + t * t * to[0], m * m * from[1] + 2 * m * t * ctrl[1] + t * t * to[1]];
  };
  const tangent = (t: number): Pt => {
    const x = 2 * (1 - t) * (ctrl[0] - from[0]) + 2 * t * (to[0] - ctrl[0]);
    const y = 2 * (1 - t) * (ctrl[1] - from[1]) + 2 * t * (to[1] - ctrl[1]);
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };

  // Where the vane parts: two or three splits, each a few barbs wide.
  const splits = Array.from({ length: 2 + Math.floor(rand() * 2) }, () => ({
    at: 0.25 + rand() * 0.6,
    side: rand() < 0.5 ? 0 : 1,
    span: 0.018 + rand() * 0.03,
  }));

  const t0 = 0.08;
  const t1 = 0.992;
  const barbs: string[] = [];
  const accentSide = rand() < 0.5 ? 0 : 1;
  const accentIndex = Math.floor(count * (0.35 + rand() * 0.3));
  let accent = '';
  let accentTip: Feather['accentTip'] = null;

  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const t = t0 + u * (t1 - t0);
      // Vane silhouette: rounded at the base, widest in the lower middle,
      // tapering to a point at the tip.
      const swell = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.25 * u);
      const jitter = 1 + (rand() - 0.5) * 0.06;
      const split = splits.find((s) => s.side === side && Math.abs(t - s.at) < s.span);
      const a = angle + (split ? 0.22 + rand() * 0.12 : (rand() - 0.5) * 0.03);
      const reach = Math.max(0, width[side]! * swell * jitter);
      if (reach < 1.2) continue;
      const barbLen = reach / Math.sin(a);

      const p = at(t);
      const [tx, ty] = tangent(t);
      // Normal to the shaft, on this side.
      const nx = -ty * sign;
      const ny = tx * sign;
      const dirX = Math.cos(a) * tx + Math.sin(a) * nx;
      const dirY = Math.cos(a) * ty + Math.sin(a) * ny;
      const end: Pt = [p[0] + dirX * barbLen, p[1] + dirY * barbLen];
      const c: Pt = [p[0] + dirX * barbLen * 0.55 + tx * barbLen * curl, p[1] + dirY * barbLen * 0.55 + ty * barbLen * curl];
      const d = `M${fmt(p)}Q${fmt(c)} ${fmt(end)}`;
      if (side === accentSide && i === accentIndex) {
        accent = d;
        const l = Math.hypot(end[0] - c[0], end[1] - c[1]) || 1;
        accentTip = { at: end, dir: [(end[0] - c[0]) / l, (end[1] - c[1]) / l] };
      } else barbs.push(d);
    }
  }

  return {
    rachis: `M${fmt(from)}Q${fmt(ctrl)} ${fmt(to)}`,
    barbs: barbs.join(''),
    accent,
    accentTip,
  };
}
