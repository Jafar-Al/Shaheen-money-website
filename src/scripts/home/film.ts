/**
 * Film.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 *
 * The film plays (silent, looping) only while at least 40% of it is on
 * screen, and only when the visitor has not asked for less motion: reduced
 * motion and Data Saver / low-power devices keep the poster frame until the
 * visitor presses play. A visitor who pauses it keeps it paused. Without
 * this script the poster stays (and the button stays hidden): nothing
 * moves, nothing is lost.
 */
import { afterFirstPaint, motionLevel } from '../../lib/motion/level';

const film = document.querySelector<HTMLElement>('[data-film]');
const video = film?.querySelector('video');
const toggle = film?.querySelector<HTMLButtonElement>('[data-film-toggle]');

if (film && video && toggle) {
  toggle.hidden = false;
  let chosenPause = false;

  const sync = () => {
    const playing = !video.paused;
    film.dataset.state = playing ? 'playing' : 'paused';
    toggle.setAttribute('aria-label', (playing ? toggle.dataset.labelPause : toggle.dataset.labelPlay) ?? '');
  };
  const play = () => {
    void video.play().catch(() => {});
  };

  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  toggle.addEventListener('click', () => {
    if (video.paused) {
      chosenPause = false;
      play();
    } else {
      chosenPause = true;
      video.pause();
    }
  });

  if (motionLevel() === 'full' && 'IntersectionObserver' in window) {
    afterFirstPaint(() => {
      new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) {
            if (!chosenPause) play();
          } else {
            video.pause();
          }
        },
        { threshold: 0.4 },
      ).observe(film);
    });
  }
  sync();
}

export {};
