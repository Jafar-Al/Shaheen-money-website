import { test, expect, type Page } from '@playwright/test';
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
const HUE_MIN = 255;
const HUE_MAX = 330;

/** Every purple colour on the page, described; empty when clean. */
function scan(page: Page): Promise<string[]> {
  return page.evaluate(
    ([lo, hi]) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const seen = new Map<string, string | null>();

      /** A CSS colour → "why it fails", or null when it passes. */
      const judge = (css: string): string | null => {
        if (seen.has(css)) return seen.get(css)!;
        let verdict: string | null = null;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#010203';
        ctx.fillStyle = css;
        if (ctx.fillStyle !== '#010203' || css.trim().toLowerCase() === '#010203') {
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data as unknown as number[];
          if (a! >= 26) {
            const [R, G, B] = [r! / 255, g! / 255, b! / 255];
            const max = Math.max(R, G, B);
            const min = Math.min(R, G, B);
            const l = (max + min) / 2;
            const d = max - min;
            const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
            let h = 0;
            if (d !== 0) {
              if (max === R) h = 60 * (((G - B) / d) % 6);
              else if (max === G) h = 60 * ((B - R) / d + 2);
              else h = 60 * ((R - G) / d + 4);
            }
            if (h < 0) h += 360;
            // Greys, near-black and near-white carry no hue anyone can see.
            if (s >= 0.12 && l > 0.06 && l < 0.97 && h >= lo && h <= hi) {
              verdict = `${css} → rgb(${r}, ${g}, ${b}) hue ${h.toFixed(0)}°`;
            }
          }
        }
        seen.set(css, verdict);
        return verdict;
      };

      const colourRe = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-f]{3,8}\b/gi;
      const found = new Set<string>();
      const check = (value: string, where: string) => {
        for (const match of value.match(colourRe) ?? []) {
          const bad = judge(match);
          if (bad) found.add(`${where}: ${bad}`);
        }
      };

      // 1. Computed styles.
      const props = [
        'color',
        'background-color',
        'background-image',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'outline-color',
        'text-decoration-color',
        'text-shadow',
        'box-shadow',
        'caret-color',
        'accent-color',
        'fill',
        'stroke',
        'stop-color',
        'flood-color',
      ];
      const describe = (el: Element) =>
        `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''}`;
      for (const el of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after', '::marker']) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && pseudo !== '::marker' && cs.content === 'none') continue;
          for (const prop of props) check(cs.getPropertyValue(prop), `${describe(el)}${pseudo ?? ''} ${prop}`);
        }
      }

      // 2. Every colour literal in the stylesheets, states included.
      const walk = (rules: CSSRuleList, sheet: string) => {
        for (const rule of rules) {
          const style = (rule as CSSStyleRule).style as CSSStyleDeclaration | undefined;
          if (style) {
            for (let i = 0; i < style.length; i++) {
              const prop = style.item(i);
              check(style.getPropertyValue(prop), `${sheet} ${prop}`);
            }
          }
          const inner = (rule as CSSGroupingRule).cssRules;
          if (inner) walk(inner, sheet);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          walk(sheet.cssRules, sheet.href ?? 'inline <style>');
        } catch {
          found.add(`unreadable stylesheet: ${sheet.href}`);
        }
      }
      return [...found];
    },
    [HUE_MIN, HUE_MAX] as const,
  );
}

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
