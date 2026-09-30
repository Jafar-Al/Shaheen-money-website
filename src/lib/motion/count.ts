/**
 * Figures count up once, when their group lands: [data-count] holds the
 * exact final text ("6.36%", "77%", "1,240.00") and ends on it, character
 * for character. Tabular mono figures, so the width never changes while the
 * digits run. Screen readers get the final value from a sibling
 * (.sr-only) and never hear the digits run: the counting span is
 * aria-hidden in the markup.
 */
import { motionLevel } from './level';
import { onReveal } from './reveal';

const DURATION = 700;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function countUp(el: HTMLElement, from = 0, duration = DURATION): Promise<void> {
  const final = el.dataset.count || el.textContent || '';
  const match = final.match(/-?[\d,]*\.?\d+/);
  if (!match || motionLevel() === 'reduced') {
    el.textContent = final;
    return Promise.resolve();
  }
  const [numberText] = match;
  const before = final.slice(0, match.index);
  const after = final.slice((match.index ?? 0) + numberText.length);
  const decimals = numberText.split('.')[1]?.length ?? 0;
  const grouped = numberText.includes(',');
  const target = Number(numberText.replaceAll(',', ''));
  const format = (n: number) =>
    before +
    n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped }) +
    after;

  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = t < 1 ? format(from + (target - from) * easeOut(t)) : final;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    el.textContent = format(from);
    requestAnimationFrame(step);
  });
}

/** Every [data-count] inside a [data-reveal] group counts when the group lands. */
export function initCounts(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-count]:not([data-count-manual])')) {
    const group = el.closest('[data-reveal]');
    if (!group) continue;
    onReveal(group, () => void countUp(el));
  }
}
