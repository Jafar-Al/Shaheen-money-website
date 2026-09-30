/**
 * Reveals [data-reveal] elements as they scroll into view.
 *
 * Built so that content can never be left invisible, which is the failure
 * mode every scroll-reveal has and the reason most of them are a bad idea:
 *
 *  1. **The hidden state is per-element, not global.** Only an element this
 *     script has actually started observing gets `data-reveal-pending`, and
 *     the CSS hides nothing else. If the script is blocked, throws, or
 *     never loads, every element renders normally.
 *  2. **Anything already on screen is never hidden.** It is marked revealed
 *     before it can flicker, so the first thing a visitor sees never fades.
 *  3. **There is a dead man's switch.** If an observer callback never fires
 *     — a browser quirk, a print or screenshot context, a page restored
 *     from the back/forward cache mid-scroll — everything still pending is
 *     revealed after a few seconds. Late is recoverable; invisible is not.
 *
 * Transform and opacity only, so this cannot move layout: the homepage
 * measures CLS 0 and has to stay there. Visitors who prefer reduced motion
 * get no observer and no hidden state at all.
 */
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];

const reveal = (el: HTMLElement) => {
  delete el.dataset.revealPending;
  el.dataset.revealed = '';
};

if (elements.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
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
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );

  for (const el of elements) {
    // Already on screen: show it now rather than animating it in.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      el.dataset.revealed = '';
      continue;
    }
    el.dataset.revealPending = '';
    pending.add(el);
    observer.observe(el);
  }

  // Dead man's switch: nothing stays hidden because an observer went quiet.
  setTimeout(() => {
    for (const el of pending) {
      reveal(el);
      observer.unobserve(el);
    }
    pending.clear();
  }, 4000);
} else {
  for (const el of elements) el.dataset.revealed = '';
}
