/**
 * Build-time globe geometry (nothing here ships to the browser).
 *
 * Real geography: Natural Earth 1:110m land and country borders (public
 * domain, via world-atlas) in an orthographic projection, so continents,
 * cities and routes sit exactly where they are. Routes follow great circles,
 * the shortest path a real flight or transfer "travels".
 */
import { geoDistance, geoGraticule, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import countries110 from 'world-atlas/countries-110m.json';
import { cities, corridors, globeCenter, type City, type CityKey } from '../data/network-map';
import type { Locale } from '../i18n/config';

export const GLOBE_SIZE = 1000;
const RADIUS = 470;

const projection = geoOrthographic()
  .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
  .scale(RADIUS)
  .rotate([-globeCenter.lon, -globeCenter.lat])
  .clipAngle(90)
  // Adaptive resampling threshold, in projected pixels. The figure renders
  // at roughly 600px wide from a 1000px viewBox, so 0.8 here is still finer
  // than a device pixel and costs a third of the path data 0.3 did.
  .precision(0.8);

const path = geoPath(projection).digits(1);
const centre: [number, number] = [globeCenter.lon, globeCenter.lat];

const landTopo = land110 as unknown as Topology<{ land: GeometryCollection }>;
const countriesTopo = countries110 as unknown as Topology<{ countries: GeometryCollection }>;

export interface GlobeCity {
  key: CityKey;
  x: number;
  y: number;
  name: string;
  label: City['label'];
  minor: boolean;
}

export interface GlobeGeometry {
  sphere: string;
  graticule: string;
  land: string;
  borders: string;
  routes: string[];
  cities: GlobeCity[];
}

const cache = new Map<Locale, GlobeGeometry>();

export function globeGeometry(locale: Locale): GlobeGeometry {
  const hit = cache.get(locale);
  if (hit) return hit;

  const visible = (lon: number, lat: number) => geoDistance([lon, lat], centre) < Math.PI / 2 - 0.05;

  const used = new Set(corridors.flat());
  const cityPoints: GlobeCity[] = [...used]
    .filter((key) => visible(cities[key].lon, cities[key].lat))
    .map((key) => {
      const c = cities[key];
      const [x, y] = projection([c.lon, c.lat])!;
      const minor = 'minor' in c && c.minor === true;
      return { key, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, name: c.name[locale], label: c.label, minor };
    });

  const geometry: GlobeGeometry = {
    sphere: path({ type: 'Sphere' }) ?? '',
    graticule: path(geoGraticule10()) ?? '',
    land: path(feature(landTopo, landTopo.objects.land)) ?? '',
    borders: path(mesh(countriesTopo, countriesTopo.objects.countries, (a, b) => a !== b)) ?? '',
    routes: corridors.map(([a, b]) =>
      path({
        type: 'LineString',
        coordinates: [
          [cities[a].lon, cities[a].lat],
          [cities[b].lon, cities[b].lat],
        ],
      }) ?? '',
    ),
    cities: cityPoints,
  };
  cache.set(locale, geometry);
  return geometry;
}

/* ── Hero backdrop ──────────────────────────────────────────────────────
 *
 * The same planet and the same corridors as the network globe, seen from
 * much closer: the sphere's centre sits far below the frame, so only the
 * northern limb curves across the lower third like a horizon seen from
 * orbit, with the corridors arcing between lit cities on it.
 *
 * What is returned, and why each piece exists:
 *   limb        the sphere outline, used for the horizon rim light
 *   atmosphere  centre and radius of the sphere, so the page can paint a
 *               glow ring concentric with it (a gradient, not a blur
 *               filter: gradients composite on the GPU for free, a blur
 *               over a 1600x900 area does not)
 *   graticule   meridians and parallels, the faintest layer
 *   land        Natural Earth land silhouette
 *   routes      great circles between the corridor cities
 *   cities      where those corridors start and end, clipped to the frame
 *
 * Everything is computed at build time; the browser receives path data,
 * no script, and nothing here animates.
 */
export const HERO_W = 1600;
export const HERO_H = 900;
const HERO_R = 1560;
const HERO_CX = HERO_W * 0.46;
// The planet sits high enough that the atmosphere's glow ring passes
// behind the falcon rather than under the headline: the mark gets a halo
// it did not have to be drawn, and the sky above it stops being empty.
const HERO_CY = HERO_H + HERO_R * 0.6;

export interface HeroGeometry {
  limb: string;
  atmosphere: { cx: number; cy: number; r: number };
  graticule: string;
  land: string;
  routes: string[];
  cities: Array<{ x: number; y: number }>;
}

/**
 * The limb crosses about two thirds of the way down: the falcon and the
 * headline get clean sky, and the geography reads as ground rather than as
 * a pattern behind type.
 *
 * The rotation is not arbitrary. With the sphere's centre this far below
 * the frame, only points between about 52 and 90 degrees from the
 * projection centre fall inside the viewBox, so the centre is placed in
 * the southern Indian Ocean: that band then lands on Europe, the Middle
 * East, North and East Africa and India, and eleven of the fourteen
 * corridor cities are actually in shot. Move it and the corridors leave
 * the frame.
 */
const HERO_CENTRE: [number, number] = [30, -25];

const heroProjection = geoOrthographic()
  .translate([HERO_CX, HERO_CY])
  .scale(HERO_R)
  .rotate([-HERO_CENTRE[0], -HERO_CENTRE[1]])
  .clipAngle(90)
  // Nothing in this layer is drawn above 7% opacity, so the silhouette can
  // be resampled coarsely and rounded to whole pixels. Together with the
  // 20-degree graticule below, that is most of the document's weight.
  .precision(2);

const heroPath = geoPath(heroProjection).digits(0);

let heroCache: HeroGeometry | undefined;

export function heroGeometry(): HeroGeometry {
  if (heroCache) return heroCache;

  // A city is drawn only if it is on the near hemisphere AND lands inside
  // the frame with room for its glow; the projection is far larger than the
  // viewBox, so most of the world falls outside it.
  const margin = 40;
  const points: Array<{ x: number; y: number }> = [];
  for (const key of new Set(corridors.flat())) {
    const c = cities[key];
    if (geoDistance([c.lon, c.lat], HERO_CENTRE) >= Math.PI / 2 - 0.02) continue;
    const projected = heroProjection([c.lon, c.lat]);
    if (!projected) continue;
    const [x, y] = projected;
    if (x < -margin || x > HERO_W + margin || y < -margin || y > HERO_H + margin) continue;
    points.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  heroCache = {
    limb: heroPath({ type: 'Sphere' }) ?? '',
    atmosphere: { cx: HERO_CX, cy: HERO_CY, r: HERO_R },
    graticule: heroPath(geoGraticule().step([20, 20])()) ?? '',
    land: heroPath(feature(landTopo, landTopo.objects.land)) ?? '',
    routes: corridors.map(
      ([a, b]) =>
        heroPath({
          type: 'LineString',
          coordinates: [
            [cities[a].lon, cities[a].lat],
            [cities[b].lon, cities[b].lat],
          ],
        }) ?? '',
    ),
    cities: points,
  };
  return heroCache;
}
