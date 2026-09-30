/**
 * Scroll-linked scenes without a library.
 *
 * Native scrolling throughout (no scroll-jacking, no smooth-scroll layer).
 * An IntersectionObserver wakes a scene when it comes near the viewport;
 * while any scene is awake, one passive scroll listener schedules one
 * requestAnimationFrame per frame, which reads every awake scene's rect and
 * then writes a single custom property on each: --p, from 0 to 1.
 *
 * CSS does the rest (transforms, colour mixes, dash offsets), so the whole
 * engine is a couple of kilobytes where a tweening library would be sixty.
 *
 * Modes:
 *   pin    the scene is a tall track with a sticky stage inside; --p runs
 *          from the track's top reaching the viewport top to its bottom
 *          reaching the viewport bottom
 *   pass   --p runs from the element's top entering at the bottom of the
 *          viewport to its bottom leaving at the top
 *   enter  --p runs from the top entering at the bottom to the top reaching
 *          the top (the element arriving)
 *   exit   --p runs from the top at the viewport top to the bottom there
 *          (the element leaving, e.g. the hero scrolling away)
 */
export type SceneMode = 'pin' | 'pass' | 'enter' | 'exit';

interface Scene {
  el: HTMLElement;
  mode: SceneMode;
  awake: boolean;
  last: number;
  listeners: Array<(p: number) => void>;
}

const scenes = new Map<HTMLElement, Scene>();
let frame = 0;
let listening = false;

function progress(scene: Scene): number {
  const rect = scene.el.getBoundingClientRect();
  const vh = window.innerHeight;
  let p: number;
  switch (scene.mode) {
    case 'pin':
      p = -rect.top / Math.max(1, rect.height - vh);
      break;
    case 'pass':
      p = (vh - rect.top) / (rect.height + vh);
      break;
    case 'enter':
      p = (vh - rect.top) / vh;
      break;
    case 'exit':
      p = -rect.top / Math.max(1, rect.height);
      break;
  }
  return Math.min(1, Math.max(0, p));
}

function tick(): void {
  frame = 0;
  // Read everything first, then write, so the frame never thrashes layout.
  const updates: Array<[Scene, number]> = [];
  for (const scene of scenes.values()) if (scene.awake) updates.push([scene, progress(scene)]);
  for (const [scene, p] of updates) {
    if (Math.abs(p - scene.last) < 0.0005) continue;
    scene.last = p;
    scene.el.style.setProperty('--p', p.toFixed(4));
    for (const listener of scene.listeners) listener(p);
  }
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(tick);
};

const observer =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const scene = scenes.get(entry.target as HTMLElement);
            if (scene) scene.awake = entry.isIntersecting;
          }
          schedule();
        },
        { rootMargin: '25% 0px 25% 0px' },
      )
    : null;

/**
 * Registers a scene. Returns a function that removes it. The listener runs
 * on every change of progress, after --p has been written.
 */
export function scene(el: HTMLElement, mode: SceneMode, listener?: (p: number) => void): () => void {
  const existing = scenes.get(el);
  if (existing) {
    if (listener) existing.listeners.push(listener);
  } else {
    scenes.set(el, { el, mode, awake: !observer, last: -1, listeners: listener ? [listener] : [] });
    observer?.observe(el);
  }
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  schedule();
  return () => {
    observer?.unobserve(el);
    scenes.delete(el);
    el.style.removeProperty('--p');
  };
}
