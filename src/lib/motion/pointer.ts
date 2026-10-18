/**
 * Pointer effects, only for a precise pointer that can hover and only at
 * full motion (see level.ts). Touch devices, save-data and reduced motion
 * never run any of this.
 *
 *  · Parallax: [data-parallax="<px>"] moves up to that many pixels with the
 *    pointer across its [data-parallax-scope] (default: the viewport).
 *    A negative value moves against the pointer.
 *  · Magnetic: [data-magnetic] controls lean up to 6px toward a nearby
 *    pointer and settle back when it leaves.
 */
import { finePointer } from './level';

export function initParallax(scope: HTMLElement): void {
  if (!finePointer()) return;
  const layers = [...scope.querySelectorAll<HTMLElement>('[data-parallax]')].map((el) => ({
    el,
    amount: Number(el.dataset.parallax) || 0,
  }));
  if (!layers.length) return;

  let x = 0;
  let y = 0;
  let frame = 0;
  let inView = true;

  const apply = () => {
    frame = 0;
    for (const { el, amount } of layers) {
      el.style.translate = `${(x * amount).toFixed(2)}px ${(y * amount * 0.6).toFixed(2)}px`;
    }
  };

  new IntersectionObserver(([entry]) => {
    inView = Boolean(entry?.isIntersecting);
  }).observe(scope);

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!inView || event.pointerType !== 'mouse') return;
      x = (event.clientX / window.innerWidth) * 2 - 1;
      y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );
}

export function initMagnetic(root: ParentNode = document): void {
  if (!finePointer()) return;
  const REACH = 24;
  const PULL = 6;
  for (const el of root.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    let frame = 0;
    let tx = 0;
    let ty = 0;
    const set = () => {
      frame = 0;
      el.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`;
    };
    const zone = el.parentElement ?? el;
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const within = Math.abs(dx) < r.width / 2 + REACH && Math.abs(dy) < r.height / 2 + REACH;
      tx = within ? (dx / (r.width / 2 + REACH)) * PULL : 0;
      ty = within ? (dy / (r.height / 2 + REACH)) * PULL : 0;
      if (!frame) frame = requestAnimationFrame(set);
    });
    zone.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(set);
    });
  }
}
