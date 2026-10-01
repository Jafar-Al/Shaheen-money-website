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
 * The runs above use reduced motion, where every scene shows its final,
 * full-strength state. Under full motion the pinned "How it works" scene
 * tones down the steps that are not playing; those tones must pass too.
 */
for (const path of ['/en', '/ar']) {
  test(`axe with full motion, inside the pinned scene: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    const track = page.locator('.how-track');
    const box = await track.boundingBox();
    expect(box).not.toBeNull();
    // A third of the way through the pinned track: one step playing, three toned down.
    await page.evaluate((y) => window.scrollTo(0, y), box!.y + box!.height / 3);
    await expect(page.locator('.how-track[data-scene]')).toHaveCount(1);
    // Judge the scene at rest, not halfway through a step's transition.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document
                .getAnimations()
                .filter((a) => a.playState === 'running' && ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest('.how-track'))
                .length,
          ),
        { timeout: 5000 },
      )
      .toBe(0);
    const results = await new AxeBuilder({ page })
      .include('.how-track')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? v.help}`),
    );
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
