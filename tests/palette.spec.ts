import { test, expect } from '@playwright/test';
import { scan } from './lib/palette-scan';
import { allPaths } from './pages';

/**
 * The palette rule the Feather Line rests on: no purple, anywhere.
 *
 * On every page, every computed colour (each element and its ::before,
 * ::after and ::marker; text, backgrounds, borders, outlines, SVG fills,
 * strokes and gradient stops, shadows and gradients) and every colour
 * literal in the page's stylesheets (so hover, focus and selection states
 * count too) is converted to sRGB. None may sit between 255° and 330° of hue
 * unless it is effectively grey.
 *
 * design/tokens.json is checked the same way at build time
 * (scripts/build-tokens.mjs); this catches what the tokens cannot: literals
 * in components, colour-mix() results, and third-party styles.
 */
for (const path of allPaths) {
  test(`no purple: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    const offenders = await scan(page);
    expect(offenders, offenders.slice(0, 25).join('\n')).toEqual([]);
  });
}

test('the purple scan catches purple (self-test)', async ({ page }) => {
  await page.goto('/en', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'test';
    p.style.color = '#7a3cff'; // hue 259°
    document.body.append(p);
  });
  const offenders = await scan(page);
  expect(offenders.some((o) => o.includes('rgb(122, 60, 255) hue 259°'))).toBe(true);
});
