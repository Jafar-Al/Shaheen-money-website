/**
 * HomeFaq.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
// Filter: an enhancement only. Without it every question is listed.
const root = document.querySelector<HTMLElement>('[data-faq]');
const label = root?.querySelector<HTMLElement>('[data-faq-filter]');
const input = label?.querySelector('input');
const empty = root?.querySelector<HTMLElement>('[data-faq-empty]');
if (root && label && input && empty) {
  label.hidden = false;
  const items = [...root.querySelectorAll<HTMLDetailsElement>('[data-acc-item]')];
  const text = items.map((d) => d.textContent?.toLocaleLowerCase() ?? '');
  input.addEventListener('input', () => {
    const words = input.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach((item, i) => {
      const match = words.every((w) => text[i]!.includes(w));
      item.hidden = !match;
      if (match) shown++;
    });
    empty.hidden = shown > 0;
  });
}

export {};
