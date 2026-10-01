/**
 * Hero.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { scene } from '../../lib/motion/scenes';
import { initParallax } from '../../lib/motion/pointer';
import { countUp } from '../../lib/motion/count';
import { afterFirstPaint, motionLevel } from '../../lib/motion/level';

const hero = document.querySelector<HTMLElement>('[data-hero]');
// Set up after the headline has painted. The app card is still waiting
// for its entrance then, so its balance can be reset unseen.
if (hero) afterFirstPaint(() => {
  initParallax(hero);
  if (motionLevel() !== 'reduced') scene(hero, 'exit', (p) => hero.toggleAttribute('data-zoom', p > 0.002));

  // The balance receives the +300.00 as the first packet lands.
  const amount = hero.querySelector<HTMLElement>('[data-shard-amount]');
  if (amount && motionLevel() !== 'reduced') {
    const final = amount.textContent?.trim() ?? '';
    amount.textContent = '940.00';
    window.setTimeout(async () => {
      amount.classList.add('is-flash');
      amount.dataset.count = final;
      await countUp(amount, 940, 650);
      window.setTimeout(() => amount.classList.remove('is-flash'), 240);
    }, 3400);
  }
});
