/**
 * The console's only fetch wrapper. Every request to the Shaheen admin API
 * goes through `request`, which:
 *
 *  · sends the session cookie (credentials: 'same-origin'): the session is
 *    an httpOnly, Secure, SameSite=Strict cookie the page cannot read, so
 *    there is no token in this code to steal;
 *  · marks every request with X-Requested-With, which the API requires
 *    (with Fetch Metadata and an Origin check) against cross-site requests;
 *  · gives up after REQUEST_TIMEOUT_MS, and honours the caller's abort;
 *  · on 401, asks the auth layer to refresh the session once and retries;
 *    if that fails, the console goes back to sign-in;
 *  · turns every failure into an ApiError the screens know how to show.
 */
import { API_PREFIX, REQUEST_TIMEOUT_MS } from '../../config';
import { ApiError } from '../errors';

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  query?: Query | undefined;
  body?: unknown;
  signal?: AbortSignal | undefined;
  /** 'json' (default), or 'raw' for the Response itself (exports: body and headers). */
  as?: 'json' | 'raw';
  /** Internal: this request is the retry after a refresh. */
  retried?: boolean;
}

let refreshSession: (() => Promise<boolean>) | null = null;
let onSessionLost: (() => void) | null = null;

/** Wired by services/auth.ts, so this module does not import it (no cycle). */
export function configureSessionHandlers(handlers: { refresh: () => Promise<boolean>; lost: () => void }): void {
  refreshSession = handlers.refresh;
  onSessionLost = handlers.lost;
}

export function buildUrl(path: string, query?: Query): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return `${API_PREFIX}${path}${s ? `?${s}` : ''}`;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
  const relay = () => controller.abort('aborted');
  opts.signal?.addEventListener('abort', relay, { once: true });

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: opts.as === 'raw' ? 'text/csv, application/json' : 'application/json',
        'X-Requested-With': 'shaheen-ops',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
      signal: controller.signal,
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiError('aborted');
    if (controller.signal.aborted) throw new ApiError('timeout');
    throw new ApiError('network');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', relay);
  }

  if (res.status === 401) {
    if (!opts.retried && refreshSession && (await refreshSession())) return request<T>(path, { ...opts, retried: true });
    onSessionLost?.();
    throw new ApiError('unauthorized', 401);
  }
  if (!res.ok) {
    let body: { code?: string; message?: string } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* the status is enough */
    }
    if (body.code === 'not_connected') throw new ApiError('not_connected', res.status, body.message);
    // A refused action (or input) says why: the page shows the server's own words.
    if (body.code && body.message && (res.status === 409 || res.status === 422 || res.status === 429 || (res.status === 400 && body.code !== 'bad_request'))) {
      const err = new ApiError('refused', res.status, body.message);
      err.reason = body.code;
      throw err;
    }
    if (res.status === 400) throw new ApiError('bad_request', 400);
    if (res.status === 403) throw new ApiError('forbidden', 403, body.message);
    if (res.status === 404) throw new ApiError('not_found', 404);
    throw new ApiError('unavailable', res.status);
  }

  if (opts.as === 'raw') return res as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('bad_response', res.status);
  }
}
