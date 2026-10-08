/**
 * Filters, pages and open records live in the address bar, so a view can be
 * shared with a colleague, survives a reload, and works with Back.
 * Never anything sensitive: ids and filter values only.
 */
export function param(name: string): string | null {
  return new URLSearchParams(location.search).get(name);
}

export function params(): URLSearchParams {
  return new URLSearchParams(location.search);
}

/** Writes params (null removes one) without reloading. `push` adds a history entry. */
export function setParams(values: Record<string, string | number | null | undefined>, push = false): void {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined || v === '') p.delete(k);
    else p.set(k, String(v));
  }
  const qs = p.toString();
  const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (push) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
}

export function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
