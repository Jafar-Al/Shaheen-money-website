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
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.help}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
