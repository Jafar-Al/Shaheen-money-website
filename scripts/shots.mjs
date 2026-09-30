/**
 * Visual record of the site: every route × both locales × the review
 * viewports, written as JPEG so a full set stays small enough to browse.
 *
 *   node scripts/shots.mjs <outDir> [--full] [--only=390,1440] [--paths=/en,/ar]
 *
 *   outDir   e.g. design-review/before or design-review/after
 *   --full   also save a full-page capture at 390 and 1440 (the long scroll)
 *   --only   restrict to some viewport widths
 *   --paths  restrict to some routes
 *
 * BASE (default http://localhost:4321) and PW_CHANNEL (msedge / chrome, to
 * use an installed browser) come from the environment. Every capture waits
 * for fonts and for the hero's entrance to finish, then scrolls the page
 * once so scroll-revealed content is in its final state.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The route list is read from src/i18n/config.ts (the registry the site is
// built from) rather than imported, because that module's own imports are
// extensionless and plain Node cannot resolve them.
const registry = readFileSync(new URL('../src/i18n/config.ts', import.meta.url), 'utf8');
const pagesBlock = registry.match(/export const pages = \{([\s\S]*?)\} as const/)?.[1] ?? '';
const pages = [...pagesBlock.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
const locales = ['en', 'ar'];
const localePath = (locale, path) => (path === '/' ? `/${locale}` : `/${locale}${path}`);

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'design-review/shots';
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const full = args.includes('--full');
const base = process.env.BASE ?? 'http://localhost:4321';
const channel = process.env.PW_CHANNEL || undefined;

export const VIEWPORTS = [
  [360, 780],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
];

const only = flag('only')?.split(',').map(Number);
const viewports = only ? VIEWPORTS.filter(([w]) => only.includes(w)) : VIEWPORTS;
const allPaths = locales.flatMap((l) => pages.map((p) => localePath(l, p)));
const paths = flag('paths')?.split(',') ?? allPaths;

const slug = (path) => path.replace(/^\//, '').replaceAll('/', '_') || 'root';

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel });

/** Scroll top to bottom so every reveal fires, then come back up. */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(200, Math.round(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

let count = 0;
for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    // The hero's entrance runs about three seconds; capture its resting state.
    await page.waitForTimeout(3200);
    await page.screenshot({ path: join(out, `${slug(path)}@${width}.jpg`), type: 'jpeg', quality: 70 });
    count++;
    if (full && (width === 390 || width === 1440)) {
      await settle(page);
      await page.screenshot({ path: join(out, `${slug(path)}@${width}-full.jpg`), type: 'jpeg', quality: 60, fullPage: true });
      count++;
    }
  }
  await context.close();
  console.log(`  ${width}x${height}: ${paths.length} route(s)`);
}

await browser.close();
console.log(`${count} capture(s) in ${out}`);
