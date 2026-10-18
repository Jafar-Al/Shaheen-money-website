/**
 * Header behaviour.
 *
 *  · Temperature: the header takes the temperature of the section under it
 *    ([data-temp="night" | "paper"]; the innermost match wins), and turns
 *    solid, with a hairline, once the page has moved. One rAF per frame at
 *    most, reading a handful of rects.
 *  · Mobile sheet: aria-expanded + aria-controls, focus trapped while open,
 *    Esc closes, focus returns to the toggle, following a link closes it.
 */
import { afterFirstPaint } from '../lib/motion/level';

const header = document.querySelector<HTMLElement>('[data-site-header]');

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

if (header) {
  // ── Temperature ─────────────────────────────────────────────────────
  const zones = [...document.querySelectorAll<HTMLElement>('main [data-temp], footer[data-temp]')];
  const fallback = header.dataset.top === 'night' ? 'night' : 'paper';
  let frame = 0;

  const update = () => {
    frame = 0;
    const line = header.getBoundingClientRect().bottom - 1;
    let temp = fallback;
    for (const zone of zones) {
      const r = zone.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) temp = zone.dataset.temp === 'night' ? 'night' : 'paper';
    }
    header.classList.toggle('t-night', temp === 'night');
    header.classList.toggle('t-paper', temp === 'paper');
    header.toggleAttribute('data-scrolled', window.scrollY > 8);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // The first state is rendered on the server (BaseLayout's temp); measure
  // only once the first frame is up, for a page that opens scrolled.
  afterFirstPaint(update);

  // ── Mobile sheet ────────────────────────────────────────────────────
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    const setOpen = (open: boolean, { restoreFocus = true } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', (open ? toggle.dataset.labelClose : toggle.dataset.labelOpen) ?? '');
      menu.hidden = !open;
      document.documentElement.classList.toggle('menu-open', open);
      if (open) {
        menu.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      } else if (restoreFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

    header.addEventListener('keydown', (event) => {
      if (menu.hidden) return;
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [toggle, ...menu.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    menu.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) setOpen(false, { restoreFocus: false });
    });

    matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
      if (event.matches && !menu.hidden) setOpen(false, { restoreFocus: false });
    });
  }
}
