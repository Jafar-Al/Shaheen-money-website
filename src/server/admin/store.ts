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
 * are per instance: acceptable for the demo only. Real staff on a deployment
 * require Upstash (settings.sharedStoreRequired).
 *
 * Fail closed: when Upstash is configured but does not answer, every call
 * throws StoreUnavailableError (the API answers 503) instead of quietly
 * falling back to this instance's memory, which would weaken lockouts,
 * revocation and one-time codes exactly when the store is under strain.
 */
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from 'astro:env/server';

type Cmd = Array<string | number>;

export const isShared = () => !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

/** The shared store was configured but did not answer: refuse rather than guess. */
export class StoreUnavailableError extends Error {
  constructor() {
    super('The security store did not answer.');
    this.name = 'StoreUnavailableError';
  }
}

async function redis(commands: Cmd[]): Promise<Array<{ result?: unknown; error?: string }>> {
  const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new StoreUnavailableError();
  return (await response.json()) as Array<{ result?: unknown }>;
}

/** One Upstash call; any failure is a StoreUnavailableError (fail closed). */
async function shared(commands: Cmd[]): Promise<Array<{ result?: unknown; error?: string }>> {
  try {
    return await redis(commands);
  } catch {
    throw new StoreUnavailableError();
  }
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

/** Writes to memory, dropping the oldest entries past a cap so a flood of keys cannot exhaust it. */
const MEM_MAX = 10_000;
function put(key: string, entry: { value: string | number | string[]; expires: number }): void {
  if (!mem.has(key) && mem.size >= MEM_MAX) {
    let drop = Math.ceil(MEM_MAX / 10);
    for (const k of mem.keys()) {
      mem.delete(k);
      if (--drop <= 0) break;
    }
  }
  mem.set(key, entry);
}

/** Adds one and returns the count; the window starts with the first. */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (isShared()) {
    const [r] = await shared([
      ['INCR', key],
      ['EXPIRE', key, ttlSeconds, 'NX'],
    ]);
    return Number(r?.result ?? 0);
  }
  const e = live(key);
  const next = (typeof e?.value === 'number' ? e.value : 0) + 1;
  put(key, { value: next, expires: e?.expires || until(ttlSeconds) });
  return next;
}

export async function getNumber(key: string): Promise<number> {
  if (isShared()) {
    const [r] = await shared([['GET', key]]);
    return Number(r?.result ?? 0);
  }
  const e = live(key);
  return typeof e?.value === 'number' ? e.value : 0;
}

/** Seconds until the key expires, or 0. */
export async function ttl(key: string): Promise<number> {
  if (isShared()) {
    const [r] = await shared([['TTL', key]]);
    return Math.max(0, Number(r?.result ?? 0));
  }
  const e = live(key);
  return e?.expires ? Math.max(0, Math.ceil((e.expires - Date.now()) / 1000)) : 0;
}

export async function get(key: string): Promise<string | null> {
  if (isShared()) {
    const [r] = await shared([['GET', key]]);
    return typeof r?.result === 'string' ? r.result : null;
  }
  const e = live(key);
  return typeof e?.value === 'string' ? e.value : null;
}

export async function getMany(keys: string[]): Promise<Array<string | null>> {
  if (!keys.length) return [];
  if (isShared()) {
    const [r] = await shared([['MGET', ...keys]]);
    return Array.isArray(r?.result) ? (r.result as Array<string | null>) : keys.map(() => null);
  }
  return keys.map((k) => {
    const e = live(k);
    return typeof e?.value === 'string' ? e.value : null;
  });
}

/** Sets a value; `onlyIfAbsent` makes it a one-time claim (returns false if it existed). */
export async function set(key: string, value: string, ttlSeconds: number, onlyIfAbsent = false): Promise<boolean> {
  if (isShared()) {
    const [r] = await shared([['SET', key, value, 'EX', ttlSeconds, ...(onlyIfAbsent ? ['NX'] : [])]]);
    return r?.result === 'OK';
  }
  if (onlyIfAbsent && live(key)) return false;
  put(key, { value, expires: until(ttlSeconds) });
  return true;
}

export async function del(...keys: string[]): Promise<void> {
  if (isShared()) {
    await shared([['DEL', ...keys]]);
    return;
  }
  for (const k of keys) mem.delete(k);
}

/** Newest first, capped at `max` entries. */
export async function push(key: string, value: string, max: number): Promise<void> {
  if (isShared()) {
    await shared([
      ['LPUSH', key, value],
      ['LTRIM', key, 0, max - 1],
    ]);
    return;
  }
  const e = live(key);
  const list = Array.isArray(e?.value) ? e.value : [];
  put(key, { value: [value, ...list].slice(0, max), expires: 0 });
}

export async function list(key: string, count: number): Promise<string[]> {
  if (isShared()) {
    const [r] = await shared([['LRANGE', key, 0, count - 1]]);
    return Array.isArray(r?.result) ? (r.result as string[]) : [];
  }
  const e = live(key);
  return Array.isArray(e?.value) ? e.value.slice(0, count) : [];
}
