/**
 * Hero.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { scene } from '../../lib/motion/scenes';
import { initParallax } from '../../lib/motion/pointer';
import { afterFirstPaint, motionLevel } from '../../lib/motion/level';

const hero = document.querySelector<HTMLElement>('[data-hero]');
// Set up after the headline has painted: the map leans with the pointer,
// and closes in on Amman as the hero scrolls away.
if (hero)
  afterFirstPaint(() => {
    initParallax(hero);
    if (motionLevel() !== 'reduced') scene(hero, 'exit', (p) => hero.toggleAttribute('data-zoom', p > 0.002));
  });
