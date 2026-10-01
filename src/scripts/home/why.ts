/**
 * WhyShaheen.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { scene } from '../../lib/motion/scenes';
import { onReveal } from '../../lib/motion/reveal';
import { afterFirstPaint, motionLevel, scrubbing } from '../../lib/motion/level';

// Scrubbed on a desktop; on a phone, and for reduced motion, it fills
// once as it lands (or is simply full).
const ruler = document.querySelector<HTMLElement>('[data-why-ruler]');
const bar = ruler?.querySelector<SVGElement>('.ruler-over');
if (ruler && bar && motionLevel() !== 'reduced') afterFirstPaint(() => {
  if (scrubbing()) {
    scene(ruler, 'enter', (p) => {
      const fill = Math.min(1, Math.max(0, (p - 0.35) / 0.45));
      bar.style.setProperty('--fill', fill.toFixed(3));
    });
  } else {
    bar.style.setProperty('--fill', '0');
    bar.style.transition = 'scale 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s';
    onReveal(ruler, () => bar.style.setProperty('--fill', '1'));
  }
});
