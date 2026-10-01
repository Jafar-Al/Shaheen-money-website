/**
 * Network.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
// Choosing a city lights its corridors and names them; choosing it again,
// or another city, moves the light. Pointer hover previews on devices
// that can hover; keyboard and touch use the button.
const root = document.querySelector<HTMLElement>('[data-net]');
if (root) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-city]')];
  const paths = [...root.querySelectorAll<SVGPathElement>('.net-hl')];
  const readout = root.querySelector<HTMLElement>('[data-net-readout]');
  const fallback = readout?.innerHTML ?? '';
  const suffix = root.querySelector('[data-net-suffix]')?.textContent ?? '';
  let pinned: string | null = null;

  const show = (city: string | null) => {
    for (const p of paths) p.classList.toggle('is-on', city !== null && (p.dataset.from === city || p.dataset.to === city));
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.city === pinned));
    if (!readout) return;
    const button = buttons.find((b) => b.dataset.city === city);
    if (city && button) readout.textContent = `${button.dataset.corridors} · ${suffix}`;
    else readout.innerHTML = fallback;
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      pinned = pinned === button.dataset.city ? null : (button.dataset.city ?? null);
      show(pinned);
    });
    if (matchMedia('(hover: hover)').matches) {
      button.addEventListener('pointerenter', () => show(button.dataset.city ?? null));
      button.addEventListener('pointerleave', () => show(pinned));
    }
  }
}

export {};
