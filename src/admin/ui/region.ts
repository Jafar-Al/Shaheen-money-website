/**
 * Data regions: every block that shows API data is a [data-region] with
 * four states, all designed (src/components/admin/Region.astro):
 *
 *   loading     the skeleton, first load only
 *   refreshing  the last render held at reduced opacity while a filter
 *               reloads it: no skeleton flash, no layout jump
 *   ready       the content
 *   empty       nothing to show yet, said plainly
 *   error       what went wrong, its code, and a retry when retrying can help
 *
 * `load` runs one request for a region, cancels the previous one when a
 * filter changes mid-flight, and moves the region between those states.
 */
import { ApiError, isAbort } from '../services/errors';
import { need } from './dom';

export interface Region {
  el: HTMLElement;
  content: HTMLElement;
}

interface Internal {
  controller?: AbortController;
  rendered: boolean;
}
const internals = new WeakMap<HTMLElement, Internal>();

export function region(name: string, root: ParentNode = document): Region {
  const el = need(`[data-region="${name}"]`, root);
  return { el, content: need('[data-content]', el) };
}

function setState(r: Region, state: 'loading' | 'refreshing' | 'ready' | 'empty' | 'error'): void {
  r.el.dataset.state = state;
  r.el.setAttribute('aria-busy', String(state === 'loading' || state === 'refreshing'));
}

export function showEmpty(r: Region, title?: string, body?: string): void {
  if (title) need('[data-empty-title]', r.el).textContent = title;
  if (body !== undefined) need('[data-empty-body]', r.el).textContent = body;
  setState(r, 'empty');
}

export function showError(r: Region, err: unknown, retry?: () => void): void {
  const e = err instanceof ApiError ? err : new ApiError('unavailable', 0);
  // Not connected is not a failure: it is a step still to do, and says so.
  r.el.dataset.errorKind = e.code;
  const title = need('[data-error-title]', r.el);
  title.textContent = e.code === 'not_connected' ? 'Waiting for the Shaheen app’s data.' : (title.dataset.default ?? title.textContent);
  need('[data-error-body]', r.el).textContent =
    e.code === 'not_connected' ? 'This appears once the app’s database is connected to the console (src/server/admin/shaheen-source.ts).' : e.message;
  need('[data-error-code]', r.el).textContent = `Error · ${e.code.replace('_', ' ')}${e.status ? ` · ${e.status}` : ''}`;
  const button = need<HTMLButtonElement>('[data-retry]', r.el);
  button.hidden = !retry || !e.retryable;
  button.onclick = retry ? () => retry() : null;
  setState(r, 'error');
  if (!(err instanceof ApiError)) console.error(err);
}

/**
 * A table wider than its column scrolls sideways; keyboard users must be
 * able to reach that scroll too. A wrapper that overflows becomes a named,
 * focusable region; one that fits is left out of the tab order.
 */
export function markScrollables(root: ParentNode = document): void {
  for (const wrap of root.querySelectorAll<HTMLElement>('.ops-tablewrap')) {
    if (wrap.scrollWidth > wrap.clientWidth + 1) {
      wrap.tabIndex = 0;
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', wrap.querySelector('caption')?.textContent?.trim() || 'Table');
    } else if (wrap.hasAttribute('tabindex')) {
      wrap.removeAttribute('tabindex');
      wrap.removeAttribute('role');
      wrap.removeAttribute('aria-label');
    }
  }
}

let resizeFrame = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => markScrollables());
});

/**
 * Loads data into a region. `render` fills r.content and returns false when
 * there is nothing to show (the empty state).
 */
export async function load<T>(r: Region, fetcher: (signal: AbortSignal) => Promise<T>, render: (data: T) => boolean | void): Promise<void> {
  const state = internals.get(r.el) ?? { rendered: false };
  internals.set(r.el, state);
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  setState(r, state.rendered ? 'refreshing' : 'loading');
  try {
    const data = await fetcher(controller.signal);
    if (controller.signal.aborted) return;
    const shown = render(data);
    state.rendered = true;
    if (shown === false) showEmpty(r);
    else {
      setState(r, 'ready');
      markScrollables(r.el);
    }
  } catch (err) {
    if (isAbort(err) || controller.signal.aborted) return;
    state.rendered = false;
    showError(r, err, () => void load(r, fetcher, render));
  }
}

/**
 * One request shared by several regions (a summary that feeds both figures
 * and a chart). A failed request is dropped, so each region's Retry asks
 * again rather than replaying the failure.
 */
export function shared<T>(make: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => {
    if (!p) {
      const current = make();
      p = current;
      current.catch(() => {
        if (p === current) p = null;
      });
    }
    return p;
  };
}
