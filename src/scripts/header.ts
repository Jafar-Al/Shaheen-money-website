/**
 * Header behaviour (audit O.4 "Navigation").
 *
 * The desktop navigation is four plain links, so there is no dropdown code
 * here any more: nothing to open, nothing to trap focus in, nothing to get
 * wrong. What is left is the tone switch and the mobile drawer.
 *
 *  · Tone: dark while the navy hero ([data-dark-zone]) sits under the header.
 *  · Mobile drawer: aria-expanded + aria-controls, focus trapped while open,
 *    Esc closes, focus returns to the toggle.
 */
const header = document.querySelector<HTMLElement>('[data-site-header]');

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

if (header) {
  // ── Tone ──────────────────────────────────────────────────────────────
  const zone = document.querySelector<HTMLElement>('[data-dark-zone]');
  if (zone && header.dataset.state === 'dark' && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) header.dataset.state = entry.isIntersecting ? 'dark' : 'light';
      },
      { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` },
    );
    observer.observe(zone);
  }

  // ── Mobile drawer ─────────────────────────────────────────────────────
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

    // Trap focus between the toggle and the drawer's own controls.
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

    // Following a link inside the drawer closes it (matters for same-page anchors).
    menu.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) setOpen(false, { restoreFocus: false });
    });

    // Growing into the desktop layout closes the drawer.
    matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
      if (event.matches && !menu.hidden) setOpen(false, { restoreFocus: false });
    });
  }
}
