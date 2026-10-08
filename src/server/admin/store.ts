/**
 * A small key-value store for the console's security state: failed sign-in
 * counters, open sessions (so one can be ended), used second-factor codes,
 * and the audit log.
 *
 * With Upstash Redis configured (UPSTASH_REDIS_REST_URL + _TOKEN, the same
 * store the site's forms already use), it is shared by every serverless
 * instance: lockouts hold everywhere, a revoked session is revoked
 * everywhere, and the Security page shows the whole log. Without it, each
 * instance keeps its own memory: sign-in and sessions still work (session
 * cookies are signed and stand on their own), but the counters and the log
 * are per instance. ADMIN_AUTH_INTEGRATION.md recommends Upstash.
 */
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from 'astro:env/server';

type Cmd = Array<string | number>;

export const isShared = () => !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

async function redis(commands: Cmd[]): Promise<Array<{ result?: unknown; error?: string }>> {
  const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`Upstash ${response.status}`);
  return (await response.json()) as Array<{ result?: unknown }>;
}

// ── Per-instance fallback ────────────────────────────────────────────────
const mem = new Map<string, { value: string | number | string[]; expires: number }>();
function live(key: string) {
  const e = mem.get(key);
  if (e && e.expires && e.expires <= Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e;
}
const until = (ttl?: number) => (ttl ? Date.now() + ttl * 1000 : 0);

/** Adds one and returns the count; the window starts with the first. */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (isShared()) {
    try {
      const [r] = await redis([
        ['INCR', key],
        ['EXPIRE', key, ttlSeconds, 'NX'],
      ]);
      return Number(r?.result ?? 0);
    } catch {
      /* fall through to memory */
    }
  }
  const e = live(key);
  const next = (typeof e?.value === 'number' ? e.value : 0) + 1;
  mem.set(key, { value: next, expires: e?.expires || until(ttlSeconds) });
  return next;
}

export async function getNumber(key: string): Promise<number> {
  if (isShared()) {
    try {
      const [r] = await redis([['GET', key]]);
      return Number(r?.result ?? 0);
    } catch {
      /* fall through */
    }
  }
  const e = live(key);
  return typeof e?.value === 'number' ? e.value : 0;
}

/** Seconds until the key expires, or 0. */
export async function ttl(key: string): Promise<number> {
  if (isShared()) {
    try {
      const [r] = await redis([['TTL', key]]);
      return Math.max(0, Number(r?.result ?? 0));
    } catch {
      /* fall through */
    }
  }
  const e = live(key);
  return e?.expires ? Math.max(0, Math.ceil((e.expires - Date.now()) / 1000)) : 0;
}

export async function get(key: string): Promise<string | null> {
  if (isShared()) {
    try {
      const [r] = await redis([['GET', key]]);
      return typeof r?.result === 'string' ? r.result : null;
    } catch {
      /* fall through */
    }
  }
  const e = live(key);
  return typeof e?.value === 'string' ? e.value : null;
}

export async function getMany(keys: string[]): Promise<Array<string | null>> {
  if (!keys.length) return [];
  if (isShared()) {
    try {
      const [r] = await redis([['MGET', ...keys]]);
      return Array.isArray(r?.result) ? (r.result as Array<string | null>) : keys.map(() => null);
    } catch {
      /* fall through */
    }
  }
  return keys.map((k) => {
    const e = live(k);
    return typeof e?.value === 'string' ? e.value : null;
  });
}

/** Sets a value; `onlyIfAbsent` makes it a one-time claim (returns false if it existed). */
export async function set(key: string, value: string, ttlSeconds: number, onlyIfAbsent = false): Promise<boolean> {
  if (isShared()) {
    try {
      const [r] = await redis([['SET', key, value, 'EX', ttlSeconds, ...(onlyIfAbsent ? ['NX'] : [])]]);
      return r?.result === 'OK';
    } catch {
      /* fall through */
    }
  }
  if (onlyIfAbsent && live(key)) return false;
  mem.set(key, { value, expires: until(ttlSeconds) });
  return true;
}

export async function del(...keys: string[]): Promise<void> {
  if (isShared()) {
    try {
      await redis([['DEL', ...keys]]);
      return;
    } catch {
      /* fall through */
    }
  }
  for (const k of keys) mem.delete(k);
}

/** Newest first, capped at `max` entries. */
export async function push(key: string, value: string, max: number): Promise<void> {
  if (isShared()) {
    try {
      await redis([
        ['LPUSH', key, value],
        ['LTRIM', key, 0, max - 1],
      ]);
      return;
    } catch {
      /* fall through */
    }
  }
  const e = live(key);
  const list = Array.isArray(e?.value) ? e.value : [];
  mem.set(key, { value: [value, ...list].slice(0, max), expires: 0 });
}

export async function list(key: string, count: number): Promise<string[]> {
  if (isShared()) {
    try {
      const [r] = await redis([['LRANGE', key, 0, count - 1]]);
      return Array.isArray(r?.result) ? (r.result as string[]) : [];
    } catch {
      /* fall through */
    }
  }
  const e = live(key);
  return Array.isArray(e?.value) ? e.value.slice(0, count) : [];
}
