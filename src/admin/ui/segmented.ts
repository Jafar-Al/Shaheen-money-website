/**
 * Segmented controls (src/components/admin/Segmented.astro): a radio group
 * drawn as the site's EN | ع switch, with the inverse pill sliding to the
 * chosen option. Arrow keys move between options, as a radio group should.
 */
import { $$, need, setVar } from './dom';

export interface Segmented {
  el: HTMLElement;
  value: () => string;
  set: (value: string, notify?: boolean) => void;
  onChange: (fn: (value: string) => void) => void;
}

export function segmented(name: string, root: ParentNode = document): Segmented {
  const el = need(`[data-seg="${name}"]`, root);
  const options = $$<HTMLButtonElement>('[role="radio"]', el);
  const listeners: Array<(v: string) => void> = [];
  setVar(el, '--seg-n', options.length);

  // The pill is measured to the chosen option, so labels of different
  // lengths (and a control that scrolls on a phone) are covered exactly.
  const place = () => {
    const o = options.find((x) => x.dataset.value === el.dataset.value);
    if (!o || !o.offsetWidth) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const start = rtl ? el.scrollWidth - o.offsetLeft - o.offsetWidth : o.offsetLeft;
    setVar(el, '--seg-w', `${o.offsetWidth}px`);
    setVar(el, '--seg-x', `${(start - 3) * (rtl ? -1 : 1)}px`);
  };
  const sync = (value: string) => {
    options.forEach((o, i) => {
      const on = o.dataset.value === value;
      o.setAttribute('aria-checked', String(on));
      o.tabIndex = on ? 0 : -1;
      if (on) setVar(el, '--seg-i', i);
    });
    el.dataset.value = value;
    place();
  };
  new ResizeObserver(place).observe(el);
  const set = (value: string, notify = true) => {
    if (!options.some((o) => o.dataset.value === value)) return;
    const changed = el.dataset.value !== value;
    sync(value);
    if (notify && changed) for (const fn of listeners) fn(value);
  };

  options.forEach((o, i) => {
    o.addEventListener('click', () => set(o.dataset.value!));
    o.addEventListener('keydown', (e) => {
      const rtl = getComputedStyle(el).direction === 'rtl';
      const step = { ArrowRight: rtl ? -1 : 1, ArrowDown: 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = options[(i + step + options.length) % options.length]!;
      next.focus();
      set(next.dataset.value!);
    });
  });
  sync(el.dataset.value ?? options[0]?.dataset.value ?? '');

  return { el, value: () => el.dataset.value ?? '', set, onChange: (fn) => listeners.push(fn) };
}
