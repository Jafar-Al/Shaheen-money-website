import { createHash } from 'node:crypto';
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from 'astro:env/server';

/**
 * Fixed-window limit per client and form (audit L.5 #6): 5 submissions per
 * 10 minutes. With Upstash Redis configured the limit is shared across all
 * serverless instances; without it, each instance counts on its own, which
 * still stops a single noisy client. IPs are hashed before use as keys, so
 * no raw address is stored anywhere.
 */
const LIMIT = 5;
const WINDOW_SECONDS = 600;
const memory = new Map<string, { count: number; resetAt: number }>();

const keyFor = (bucket: string, ip: string) =>
  `rl:${bucket}:${createHash('sha256').update(ip).digest('hex').slice(0, 24)}`;

export async function allow(bucket: string, ip: string): Promise<boolean> {
  const key = keyFor(bucket, ip);

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(WINDOW_SECONDS), 'NX'],
        ]),
        signal: AbortSignal.timeout(2000),
      });
      const [incr] = (await response.json()) as Array<{ result?: number }>;
      if (typeof incr?.result === 'number') return incr.result <= LIMIT;
    } catch {
      // Store unreachable: fall back to the per-instance counter below.
    }
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
}
