/**
 * How much motion this visitor gets, decided once before first paint by the
 * inline script in BaseLayout.astro and read here from <html data-motion>:
 *
 *   full     everything: scenes, packets, parallax, magnetic buttons
 *   lite     save-data, ≤2 GB memory or ≤4 cores: reveals and scene states
 *            only; no ambient packets, no parallax, no pointer effects
 *   reduced  prefers-reduced-motion: final states, 150ms fades only
 *
 * The media query is re-read here as well, because a visitor can change the
 * setting while the page is open.
 */
export type MotionLevel = 'full' | 'lite' | 'reduced';

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

export function motionLevel(): MotionLevel {
  if (reducedQuery.matches) return 'reduced';
  const level = document.documentElement.dataset.motion;
  return level === 'lite' || level === 'reduced' ? level : 'full';
}

/** Pointer effects need a precise pointer that can hover, and full motion. */
export function finePointer(): boolean {
  return motionLevel() === 'full' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Phones never pin or scrub: every scene becomes a stack that reveals in place. */
export function scrubbing(): boolean {
  return motionLevel() !== 'reduced' && matchMedia('(min-width: 64rem)').matches;
}

export function onMotionChange(callback: () => void): void {
  reducedQuery.addEventListener('change', callback);
}

/**
 * Runs `fn` once the first frame is on screen. Motion set-up reads layout
 * (what is in view, how tall a track is); done earlier it holds up the first
 * paint, and with it the headline, the largest paint on most pages. A frame
 * callback runs just before a frame is drawn; the task it queues, after.
 */
export function afterFirstPaint(fn: () => void): void {
  requestAnimationFrame(() => setTimeout(fn, 0));
}
