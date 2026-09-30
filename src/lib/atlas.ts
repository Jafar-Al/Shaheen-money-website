/**
 * Build-time geometry for the hero atlas (only the resulting path data and
 * label positions reach the browser).
 *
 * The idea: the falcon lands on Amman, and every one of its feathers is a
 * route. The mark's five feather strokes all run from upper left to lower
 * right, and every origin city in the corridor data that sends to Amman
 * from the west (Toronto, New York, London, Paris, Berlin) lies north-west
 * of it: the great circles from those cities arrive at Amman inside a
 * 15° fan (bearings 314°–328°). So each feather is drawn out, from its tip,
 * along the real great circle it would have flown in on.
 *
 * Projection: Equal Earth, whose parallels are straight, so the engraved
 * hatching of the land runs along lines of latitude. Natural Earth 1:110m
 * land (public domain, via world-atlas); no country borders. Coordinates are
 * city centres from src/data/network-map.ts; nothing is hard-coded here.
 *
 * Two frames, because a phone is not a small desktop: `wide` (1600×1000)
 * for tablets and up, `tall` (400×860) for phones, each with its own
 * framing and its own falcon box. The falcon is HTML (FalconFlight.astro,
 * untouched) laid over the SVG; its box is given here in round percentages
 * of the frame, and the hero's CSS uses the same numbers. The component
 * asserts they agree, so the feather tips and the routes cannot drift apart.
 */
import { geoEqualEarth, geoGraticule, geoInterpolate, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import falconSvg from '../assets/brand/falcon.svg?raw';
import { cities, heroCorridors, type CityKey } from '../data/network-map';
import type { Locale } from '../i18n/config';

type Pt = [number, number];
export type FrameId = 'wide' | 'tall';

interface FrameSpec {
  w: number;
  h: number;
  /** The falcon's box, in percent of the frame (the hero CSS uses these). */
  falcon: { x: number; y: number; w: number };
  /** Projection: central meridian and scale. */
  centreLon: number;
  scale: number;
  /** Which of the hero corridors this frame draws. */
  corridors: readonly CityKey[];
  /** Cities that get a name (the rest are dots). */
  named: readonly CityKey[];
}

export const FRAMES: Record<FrameId, FrameSpec> = {
  wide: {
    w: 1600,
    h: 1000,
    falcon: { x: 50, y: 17, w: 15 },
    centreLon: 24,
    scale: 720,
    corridors: heroCorridors,
    named: ['london', 'paris', 'berlin', 'cairo', 'riyadh', 'dubai', 'nairobi', 'mumbai'],
  },
  tall: {
    w: 400,
    h: 860,
    falcon: { x: 30, y: 14, w: 46 },
    centreLon: 30,
    scale: 330,
    corridors: ['london', 'berlin', 'toronto'],
    named: ['london', 'berlin', 'cairo', 'riyadh', 'dubai'],
  },
};

/** The falcon mark's beak tip, in its own 240-unit box: it lands on Amman. */
const BEAK: Pt = [205, 226];
/** The mark's third stroke is the head and beak (FalconFlight.astro lists
 *  the strokes in the same order): it reaches Amman and carries no route. */
const BEAK_STROKE = 2;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function coords(lon: number, lat: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/** The mark's strokes: each one's trailing tip (upper left) and its direction there. */
function strokes() {
  const d = falconSvg.match(/ d="([^"]+)"/)?.[1] ?? '';
  const axis: Pt = [-0.66, -0.75];
  return d
    .split(/(?=M)/)
    .filter(Boolean)
    .map((sub) => {
      const nums = sub.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
      const score = (p: Pt) => p[0] * axis[0] + p[1] * axis[1];
      const tip = pts.reduce((a, b) => (score(b) > score(a) ? b : a));
      const base = pts.reduce((a, b) => (score(b) < score(a) ? b : a));
      const len = Math.hypot(tip[0] - base[0], tip[1] - base[1]);
      return { tip, dir: [(tip[0] - base[0]) / len, (tip[1] - base[1]) / len] as Pt };
    });
}

function bearingFromAmman(key: CityKey): number {
  const a = cities.amman;
  const c = cities[key];
  const [l1, p1, l2, p2] = [a.lon, a.lat, c.lon, c.lat].map((v) => (v * Math.PI) / 180) as [number, number, number, number];
  const y = Math.sin(l2 - l1) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface HeroRoute {
  key: CityKey;
  name: string;
  d: string;
  /** Length in frame units, for the packet's dash. */
  length: number;
  /** Where an off-frame route leaves the frame: the edge label goes here. */
  exit?: { x: number; y: number; anchor: 'start' | 'end' } | undefined;
}

export interface HeroCity {
  key: CityKey;
  x: number;
  y: number;
  name?: string | undefined;
  coords: string;
  label: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  route: boolean;
}

export interface HeroFrame {
  id: FrameId;
  w: number;
  h: number;
  land: string;
  graticule: string;
  routes: HeroRoute[];
  cities: HeroCity[];
  amman: { x: number; y: number; name: string; coords: string };
  falcon: FrameSpec['falcon'];
}

const cache = new Map<string, HeroFrame>();

export function heroFrame(id: FrameId, locale: Locale): HeroFrame {
  const hit = cache.get(`${id}:${locale}`);
  if (hit) return hit;
  const spec = FRAMES[id];
  const { w: W, h: H } = spec;

  // Falcon box in frame units; Amman is where its beak lands.
  const fb = { x: (spec.falcon.x / 100) * W, y: (spec.falcon.y / 100) * H, w: (spec.falcon.w / 100) * W };
  const A: Pt = [fb.x + (BEAK[0] / 240) * fb.w, fb.y + (BEAK[1] / 240) * fb.w];
  const fromFalcon = ([fx, fy]: Pt): Pt => [fb.x + (fx / 240) * fb.w, fb.y + (fy / 240) * fb.w];

  const projection = geoEqualEarth().rotate([-spec.centreLon, 0]).scale(spec.scale).translate([0, 0]).precision(0.6);
  const [ax, ay] = projection([cities.amman.lon, cities.amman.lat])!;
  projection.translate([A[0] - ax, A[1] - ay]);
  // Keep land well past the frame: the art is laid out to cover any aspect
  // ratio, and the scroll-out zoom pushes past the edges.
  projection.clipExtent([
    [-W * 0.6, -H * 0.5],
    [W * 1.6, H * 1.6],
  ]);
  const path = geoPath(projection).digits(1);
  const project = (lon: number, lat: number) => projection([lon, lat]) as Pt;

  // Feathers ordered across the fan (by where their tip sits across the
  // mark's axis), corridors by the bearing they arrive on: paired in that
  // order, no two routes cross.
  const feathers = strokes()
    .filter((_, i) => i !== BEAK_STROKE)
    .map((s) => ({ ...s, across: s.tip[0] * 0.75 - s.tip[1] * 0.66 }))
    .sort((a, b) => a.across - b.across);
  const byBearing = [...heroCorridors].sort((a, b) => bearingFromAmman(a) - bearingFromAmman(b));

  const routes: HeroRoute[] = byBearing
    .map((key, i) => ({ key, feather: feathers[i]! }))
    .filter(({ key }) => spec.corridors.includes(key))
    .map(({ key, feather }) => {
      const T = fromFalcon(feather.tip);
      const c = cities[key];
      const interpolate = geoInterpolate([cities.amman.lon, cities.amman.lat], [c.lon, c.lat]);
      const samples: Pt[] = Array.from({ length: 97 }, (_, k) => {
        const [lon, lat] = interpolate(k / 96);
        return project(lon, lat);
      });
      // Join the great circle clear of the falcon, with room for the
      // feather to turn into the route.
      const reach = Math.hypot(T[0] - A[0], T[1] - A[1]);
      let j = samples.findIndex((p) => Math.hypot(p[0] - A[0], p[1] - A[1]) > reach + fb.w * 0.3);
      if (j < 1) j = Math.min(6, samples.length - 2);
      const J = samples[j]!;
      const next = samples[j + 1]!;
      const gl = Math.hypot(next[0] - J[0], next[1] - J[1]) || 1;
      const g: Pt = [(next[0] - J[0]) / gl, (next[1] - J[1]) / gl];
      const span = Math.hypot(J[0] - T[0], J[1] - T[1]);
      const c1: Pt = [T[0] + feather.dir[0] * span * 0.5, T[1] + feather.dir[1] * span * 0.5];
      const c2: Pt = [J[0] - g[0] * span * 0.35, J[1] - g[1] * span * 0.35];
      const rest = samples.slice(j + 1);

      let length = 0;
      let prev = T;
      for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const m = 1 - t;
        const p: Pt = [
          m ** 3 * T[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * J[0],
          m ** 3 * T[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * J[1],
        ];
        length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
      }
      for (const p of rest) {
        length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
      }

      const end = samples[samples.length - 1]!;
      const inside = (p: Pt) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
      let exit: HeroRoute['exit'];
      if (!inside(end)) {
        const margin = W * 0.02;
        const out = samples.find((p) => p[0] < margin || p[1] < margin || p[0] > W - margin);
        if (out) {
          const x = Math.min(Math.max(out[0], margin), W - margin);
          exit = { x: r1(x), y: r1(Math.max(out[1], margin)), anchor: x < W / 2 ? 'start' : 'end' };
        }
      }

      return {
        key,
        name: c.name[locale],
        d:
          `M${r1(T[0])} ${r1(T[1])}C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(J[0])} ${r1(J[1])}` +
          rest.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join(''),
        length: Math.round(length),
        exit,
      };
    });

  // Network cities inside the frame and clear of the falcon.
  const pad = fb.w * 0.04;
  const underFalcon = ([x, y]: Pt) => x > fb.x - pad && x < fb.x + fb.w + pad && y > fb.y - pad && y < fb.y + fb.w + pad;
  const margin = W * 0.03;
  const shown: HeroCity[] = (Object.keys(cities) as CityKey[])
    .filter((key) => key !== 'amman')
    .map((key) => ({ key, p: project(cities[key].lon, cities[key].lat) }))
    .filter(({ p }) => p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin && !underFalcon(p))
    .map(({ key, p }) => {
      const c = cities[key];
      return {
        key,
        x: r1(p[0]),
        y: r1(p[1]),
        name: spec.named.includes(key) ? c.name[locale] : undefined,
        coords: coords(c.lon, c.lat),
        label: c.label,
        route: spec.corridors.includes(key),
      };
    });

  const landTopo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const frame: HeroFrame = {
    id,
    w: W,
    h: H,
    land: path(feature(landTopo, landTopo.objects.land)) ?? '',
    graticule: path(geoGraticule().step([15, 15]).extent([[-180, -75], [180.01, 80.01]])()) ?? '',
    routes,
    cities: shown,
    amman: { x: r1(A[0]), y: r1(A[1]), name: cities.amman.name[locale], coords: coords(cities.amman.lon, cities.amman.lat) },
    falcon: spec.falcon,
  };
  cache.set(`${id}:${locale}`, frame);
  return frame;
}
