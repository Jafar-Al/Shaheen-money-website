import { capitals, cities } from '../../data/network-map';
import type { CountryCode } from '../types/admin';

/**
 * Reference data, not mock data: how the console names a country and where
 * it puts the country's marker on the map. The API sends ISO codes only.
 *
 * Marker positions reuse the city centres the public site already draws
 * (src/data/network-map.ts), so the console's map and the site's atlas put
 * Amman in the same place. A country the backend reports that is not listed
 * here still appears in every table; it simply has no marker until a line
 * is added below.
 */
export interface CountryRef {
  name: string;
  /** Where the marker sits: the main city the network serves there. */
  city: string;
  lon: number;
  lat: number;
  region: Region;
}

export type Region = 'Levant' | 'Gulf' | 'North Africa' | 'Europe' | 'North America' | 'Other';

const at = (c: { lon: number; lat: number; name: { en: string } }) => ({ lon: c.lon, lat: c.lat, city: c.name.en });

export const COUNTRIES: Record<string, CountryRef> = {
  JO: { name: 'Jordan', region: 'Levant', ...at(cities.amman) },
  LB: { name: 'Lebanon', region: 'Levant', ...at(cities.beirut) },
  EG: { name: 'Egypt', region: 'North Africa', ...at(cities.cairo) },
  AE: { name: 'United Arab Emirates', region: 'Gulf', ...at(cities.dubai) },
  SA: { name: 'Saudi Arabia', region: 'Gulf', ...at(cities.riyadh) },
  QA: { name: 'Qatar', region: 'Gulf', ...at(capitals.doha) },
  TR: { name: 'Türkiye', region: 'Europe', ...at(cities.istanbul) },
  GB: { name: 'United Kingdom', region: 'Europe', ...at(cities.london) },
  DE: { name: 'Germany', region: 'Europe', ...at(cities.berlin) },
  FR: { name: 'France', region: 'Europe', ...at(cities.paris) },
  US: { name: 'United States', region: 'North America', ...at(cities.newYork) },
  CA: { name: 'Canada', region: 'North America', ...at(cities.toronto) },
};

export function countryName(code: CountryCode): string {
  return COUNTRIES[code]?.name ?? code;
}

export function regionOf(code: CountryCode): Region {
  return COUNTRIES[code]?.region ?? 'Other';
}
