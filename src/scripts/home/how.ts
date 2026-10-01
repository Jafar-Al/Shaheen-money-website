/**
 * HowItWorks.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
import { scene } from '../../lib/motion/scenes';
import { afterFirstPaint, fitsPinned, scrubbing } from '../../lib/motion/level';
import { countUp } from '../../lib/motion/count';

const track = document.querySelector<HTMLElement>('[data-how]');
const stage = track?.querySelector<HTMLElement>('.how-scene');
if (track && stage) afterFirstPaint(() => {
  if (!scrubbing() || !fitsPinned(stage)) return;
  track.dataset.scene = '';
  track.dataset.step = '0';
  const amount = track.querySelector<HTMLElement>('[data-how-balance] [data-shard-amount]');
  // What the balance reads at each step (the copy's example amounts).
  const figures = ['1,240.00', '1,240.00', '1,176.50', '976.50'];
  if (amount) amount.textContent = figures[0]!;
  let step = 0;
  scene(track, 'pin', (p) => {
    const next = Math.min(3, Math.floor(p * 4.4));
    if (next === step) return;
    const from = Number((figures[step] ?? '0').replaceAll(',', ''));
    step = next;
    track.dataset.step = String(step);
    if (amount && figures[step] !== amount.textContent) {
      amount.dataset.count = figures[step]!;
      void countUp(amount, from, 500);
    }
  });
});
