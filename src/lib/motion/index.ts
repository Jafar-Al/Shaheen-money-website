/**
 * The site's motion system, started once per page from BaseLayout.
 *
 *   Draw         hairlines stroke themselves in (reveal.ts + [data-draw])
 *   Land         groups arrive 12–16px + fade, children in order (reveal.ts)
 *   Flip         digital → paper, cash-out and download only (components)
 *   Print        receipt rows, one by one, stepped (Pricing)
 *   Packet       one 12px signal dash on a route, hero and network only
 *   Temperature  night → paper, scrubbed on scroll (scenes.ts + CashOut)
 *
 * Ambient loops ([data-ambient]) pause whenever they are off screen or the
 * tab is hidden, so an idle page costs nothing.
 */
import { initReveal } from './reveal';
import { initCounts } from './count';
import { initMagnetic } from './pointer';
import { afterFirstPaint } from './level';

function initAmbient(): void {
  const ambient = [...document.querySelectorAll<HTMLElement>('[data-ambient]')];
  if (!ambient.length || !('IntersectionObserver' in window)) return;
  const visible = new Set<HTMLElement>();
  const sync = () => {
    for (const el of ambient) {
      el.toggleAttribute('data-paused', document.hidden || !visible.has(el));
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (entry.isIntersecting) visible.add(el);
      else visible.delete(el);
    }
    sync();
  });
  for (const el of ambient) observer.observe(el);
  document.addEventListener('visibilitychange', sync);
}

// After the first frame: everything above reads layout.
afterFirstPaint(() => {
  initReveal();
  initCounts();
  initMagnetic();
  initAmbient();
});
