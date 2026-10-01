import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { allPaths } from './pages';

/**
 * Audit H.3: axe-core on every route × both locales; zero violations blocks
 * the merge. WCAG 2.2 AA rule set.
 */
for (const path of allPaths) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? v.help}`),
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/**
 * The runs above use reduced motion, where the film waits on its poster.
 * Under full motion the film plays; the section must pass with it running.
 */
for (const path of ['/en', '/ar']) {
  test(`axe with full motion, with the film playing: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await page.locator('#how').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('[data-film] video').evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 8000 }).toBe(true);
    const results = await new AxeBuilder({ page })
      .include('#how')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? v.help}`),
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
