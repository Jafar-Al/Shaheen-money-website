/**
 * Land: [data-reveal] groups arrive as they scroll into view, their
 * [data-reveal-child] items one after another (--i sets the order).
 *
 * Built so content can never be left invisible, which is the failure mode
 * every scroll-reveal has:
 *
 *  1. The hidden state is per element. Only an element this script has
 *     started observing gets `data-reveal-pending`; the CSS hides nothing
 *     else. No script, a thrown error, a print: everything renders.
 *  2. Anything already on screen is never hidden, so the first thing a
 *     visitor sees never fades.
 *  3. A dead man's switch reveals whatever is still pending after four
 *     seconds, in case an observer goes quiet (bfcache restores, some
 *     screenshot and print contexts).
 *
 * Transform and opacity only, so nothing around a revealing element moves.
 * Other modules can wait for a group with `onReveal(el, callback)`.
 */
import { motionLevel } from './level';

const listeners = new WeakMap<Element, Array<() => void>>();

export function onReveal(el: Element, callback: () => void): void {
  if ((el as HTMLElement).dataset.revealed !== undefined) {
    callback();
    return;
  }
  listeners.set(el, [...(listeners.get(el) ?? []), callback]);
}

function reveal(el: HTMLElement): void {
  delete el.dataset.revealPending;
  el.dataset.revealed = '';
  for (const callback of listeners.get(el) ?? []) callback();
  listeners.delete(el);
}

export function initReveal(root: ParentNode = document): void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed]):not([data-reveal-pending])')];
  // Stagger order for children that did not set their own.
  for (const el of elements) {
    el.querySelectorAll<HTMLElement>('[data-reveal-child]').forEach((child, i) => {
      if (!child.style.getPropertyValue('--i')) child.style.setProperty('--i', String(i));
    });
  }

  if (!elements.length) return;
  if (motionLevel() === 'reduced' || !('IntersectionObserver' in window)) {
    for (const el of elements) reveal(el);
    return;
  }

  const pending = new Set<HTMLElement>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        reveal(el);
        pending.delete(el);
        observer.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );

  for (const el of elements) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      reveal(el);
      continue;
    }
    el.dataset.revealPending = '';
    pending.add(el);
    observer.observe(el);
  }

  // Anything that should be visible by now but is not, is revealed: in view
  // after four seconds, after a restore from the back/forward cache, and
  // everything before printing.
  const rescue = (all: boolean) => {
    for (const el of pending) {
      if (!all && el.getBoundingClientRect().top > window.innerHeight) continue;
      reveal(el);
      observer.unobserve(el);
      pending.delete(el);
    }
  };
  setTimeout(() => rescue(false), 4000);
  window.addEventListener('pageshow', () => rescue(false));
  window.addEventListener('beforeprint', () => rescue(true));
}
