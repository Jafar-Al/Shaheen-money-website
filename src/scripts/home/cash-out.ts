/**
 * CashOut.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { scene } from '../../lib/motion/scenes';
import { afterFirstPaint, fitsPinned, motionLevel, scrubbing } from '../../lib/motion/level';

const shift = document.querySelector<HTMLElement>('[data-co-shift]');
const card = shift?.querySelector<HTMLElement>('[data-co-card]');
const stage = shift?.querySelector<HTMLElement>('.co-sticky');
if (shift && card && stage && motionLevel() !== 'reduced') afterFirstPaint(() => {
  card.classList.add('is-armed');
  shift.style.setProperty('--t', '0');
  if (scrubbing() && fitsPinned(stage)) {
    shift.dataset.scene = '';
    scene(shift, 'pin', (p) => {
      // Night holds, turns over the middle of the track, then Paper holds.
      const t = Math.min(1, Math.max(0, (p - 0.18) / 0.5));
      shift.style.setProperty('--t', t.toFixed(3));
      shift.dataset.temp = t > 0.5 ? 'paper' : 'night';
      if (t > 0.45) card.classList.add('is-flipped');
    });
  } else if ('IntersectionObserver' in window) {
    // No pin, no scrub: the slip turns over once when it is well in view,
    // and the page warms to Paper behind it.
    shift.dataset.fade = '';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        card.classList.add('is-flipped');
        shift.style.setProperty('--t', '1');
        shift.dataset.temp = 'paper';
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(card);
  }
});
