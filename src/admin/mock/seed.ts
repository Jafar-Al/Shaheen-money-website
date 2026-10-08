/**
 * MOCK DATA — the deterministic generator every mock module draws from.
 *
 * Nothing in src/admin/mock is real. It exists so every screen of the
 * console works, with plausible shapes and volumes, before the Shaheen
 * admin API is connected. The same seed always produces the same users,
 * transactions and Connectors (so a link to a user survives a reload);
 * times are laid out relative to the moment the page loads, so "2 min ago"
 * stays true.
 *
 * Reuses the site's own seeded generator (src/lib/feather.ts).
 */
import { rng } from '../../lib/feather';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** "Now" for the whole mock world, to the minute. */
export const NOW = Math.floor(Date.now() / MIN) * MIN;
/** Start of today, local time: day buckets line up with the admin's calendar. */
export const TODAY = (() => {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

/** How far back the mock world goes. */
export const HISTORY_DAYS = 420;

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export interface Stream {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  weighted: <T>(entries: ReadonlyArray<readonly [T, number]>) => T;
  chance: (p: number) => boolean;
  /** A log-normal amount around `median`, spread `sigma`. */
  lognormal: (median: number, sigma: number) => number;
  id: (prefix: string, length: number) => string;
}

export function stream(seed: string): Stream {
  const next = rng(`shaheen-ops:${seed}`);
  const s: Stream = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    weighted: (entries) => {
      const total = entries.reduce((n, [, w]) => n + w, 0);
      let r = next() * total;
      for (const [value, w] of entries) {
        r -= w;
        if (r <= 0) return value;
      }
      return entries[entries.length - 1]![0];
    },
    chance: (p) => next() < p,
    lognormal: (median, sigma) => {
      // Box–Muller on two draws.
      const u = Math.max(next(), 1e-9);
      const v = next();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return median * Math.exp(sigma * z);
    },
    id: (prefix, length) => {
      let out = '';
      for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(next() * ALPHABET.length)];
      return `${prefix}_${out}`;
    },
  };
  return s;
}

export const iso = (ms: number) => new Date(ms).toISOString();

/** Busier in the evening (Amman time is close enough for the shape). */
export const HOUR_WEIGHTS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 24 }, (_, h) => [
  h,
  h < 6 ? 0.25 : h < 9 ? 0.7 : h < 17 ? 1 : h < 22 ? 1.45 : 0.6,
]);

/** The lightest possible "memo": compute once, on first use. */
export function once<T>(make: () => T): () => T {
  let value: T | undefined;
  let done = false;
  return () => {
    if (!done) {
      value = make();
      done = true;
    }
    return value as T;
  };
}
