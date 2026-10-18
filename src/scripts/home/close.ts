/**
 * FinalCta.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { initParallax } from '../../lib/motion/pointer';
import { afterFirstPaint } from '../../lib/motion/level';
const close = document.querySelector<HTMLElement>('[data-close]');
if (close) afterFirstPaint(() => initParallax(close));
