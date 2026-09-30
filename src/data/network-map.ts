/**
 * Cities and corridors drawn on the homepage globe.
 *
 * These are EXAMPLE corridors that show what Shaheen connects: where people
 * earn and where their families live. The caption under the globe says so,
 * and points to /coverage for where the service is actually available.
 * Keep this list to corridors you serve or intend to serve; adding a city
 * (for example Damascus or Baghdad) is a business and compliance decision,
 * so it is left out by default.
 *
 * Coordinates are city centres (WGS84, 2 decimals). `label` places the name
 * relative to the dot in screen space: n, s, e, w, ne, nw, se, sw.
 * `minor` labels are hidden on small screens, where the cluster around the
 * eastern Mediterranean is too dense to name every city legibly.
 */
import type { Localized } from './types';

export interface City {
  name: Localized;
  lon: number;
  lat: number;
  label: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  minor?: boolean;
}

export const cities = {
  toronto: { name: { en: 'Toronto', ar: 'تورونتو' }, lon: -79.38, lat: 43.65, label: 'ne' },
  newYork: { name: { en: 'New York', ar: 'نيويورك' }, lon: -74.01, lat: 40.71, label: 'se' },
  saoPaulo: { name: { en: 'São Paulo', ar: 'ساو باولو' }, lon: -46.63, lat: -23.55, label: 'se' },
  london: { name: { en: 'London', ar: 'لندن' }, lon: -0.13, lat: 51.51, label: 'nw' },
  paris: { name: { en: 'Paris', ar: 'باريس' }, lon: 2.35, lat: 48.86, label: 'sw', minor: true },
  berlin: { name: { en: 'Berlin', ar: 'برلين' }, lon: 13.4, lat: 52.52, label: 'ne' },
  istanbul: { name: { en: 'Istanbul', ar: 'إسطنبول' }, lon: 28.98, lat: 41.01, label: 'n', minor: true },
  cairo: { name: { en: 'Cairo', ar: 'القاهرة' }, lon: 31.24, lat: 30.04, label: 'sw' },
  beirut: { name: { en: 'Beirut', ar: 'بيروت' }, lon: 35.5, lat: 33.89, label: 'nw', minor: true },
  amman: { name: { en: 'Amman', ar: 'عمّان' }, lon: 35.93, lat: 31.95, label: 'e' },
  riyadh: { name: { en: 'Riyadh', ar: 'الرياض' }, lon: 46.68, lat: 24.71, label: 's', minor: true },
  dubai: { name: { en: 'Dubai', ar: 'دبي' }, lon: 55.27, lat: 25.2, label: 'n' },
  nairobi: { name: { en: 'Nairobi', ar: 'نيروبي' }, lon: 36.82, lat: -1.29, label: 'e' },
  mumbai: { name: { en: 'Mumbai', ar: 'مومباي' }, lon: 72.88, lat: 19.08, label: 'n' },
} satisfies Record<string, City>;

export type CityKey = keyof typeof cities;

/**
 * Earner → family. Drawn in this order.
 *
 * Only pairs of cities already on the map: a new city is a business and
 * compliance claim, a new line between two existing ones is not.
 */
export const corridors: Array<[CityKey, CityKey]> = [
  ['toronto', 'amman'],
  ['newYork', 'beirut'],
  ['newYork', 'cairo'],
  ['saoPaulo', 'beirut'],
  ['london', 'cairo'],
  ['paris', 'amman'],
  ['berlin', 'istanbul'],
  ['berlin', 'beirut'],
  ['london', 'nairobi'],
  ['riyadh', 'cairo'],
  ['riyadh', 'amman'],
  ['dubai', 'amman'],
  ['dubai', 'mumbai'],
  ['dubai', 'nairobi'],
];

/**
 * The five routes the hero's falcon arrives on: each feather of the mark is
 * drawn out along the great circle from one of these cities to Amman. Only
 * cities already on the map (a new line between two of them is not a
 * coverage claim); captioned "Example corridors" wherever they are drawn.
 */
export const heroCorridors = ['toronto', 'newYork', 'london', 'paris', 'berlin'] as const satisfies readonly CityKey[];

/** Where the globe faces: between the Atlantic and the Gulf. */
export const globeCenter = { lon: 5, lat: 28 };
