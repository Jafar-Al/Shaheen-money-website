/**
 * Throwaway visual + responsive checker. Not part of the project.
 *   node .shots.mjs <outDir> <mode> [paths...]
 * mode: "look"   one screenshot per path at 1440x900
 *       "sizes"  every viewport in SIZES, checking overflow + first-screen CTA
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
const mode = process.argv[3] ?? 'look';
const paths = process.argv.slice(4);
const base = process.env.BASE ?? 'http://localhost:4321';
const channel = process.env.PW_CHANNEL || undefined;

const SIZES = [
  ['phone-small', 320, 568],
  ['phone', 390, 844],
  ['phone-large', 430, 932],
  ['tablet-portrait', 768, 1024],
  ['ipad-landscape', 1024, 768],
  ['ipad-pro', 1366, 1024],
  ['laptop', 1440, 900],
  ['desktop', 1920, 1080],
  ['ultrawide', 2560, 1080],
  ['tv-4k', 3840, 2160],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel });

if (mode === 'look') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const spec of paths) {
    const [path, name, full] = spec.split('|');
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: full === 'full' });
    console.log(`  ${name}.png <- ${path}`);
  }
} else {
  let bad = 0;
  for (const [label, width, height] of SIZES) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    for (const path of paths) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - window.innerWidth;
        // Anything wider than the viewport, which is what causes sideways scroll.
        const wide = [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().width > window.innerWidth + 1)
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')}`);
        const cta = document.querySelector('#hero-title ~ div a[data-smart-download]');
        const box = cta?.getBoundingClientRect();
        return {
          overflow,
          wide,
          ctaBottom: box ? Math.round(box.bottom) : null,
          ctaWidth: box ? Math.round(box.width) : null,
          heroH: Math.round(document.querySelector('section[aria-labelledby="hero-title"]')?.getBoundingClientRect().height ?? 0),
        };
      });
      const fold = r.ctaBottom === null ? '' : r.ctaBottom <= height ? ` cta@${r.ctaBottom}<=${height} ok` : ` CTA BELOW FOLD ${r.ctaBottom}>${height}`;
      const ov = r.overflow > 0 ? ` OVERFLOW ${r.overflow}px ${r.wide.join(', ')}` : '';
      if (r.overflow > 0 || (r.ctaBottom !== null && r.ctaBottom > height)) bad++;
      console.log(`${label.padEnd(16)} ${String(width).padStart(4)}x${String(height).padEnd(4)} ${path.padEnd(16)}${ov}${fold}`);
    }
    if (paths.includes('/en')) {
      await page.goto(base + '/en', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${out}/size-${label}.png` });
    }
    await page.close();
  }
  console.log(bad ? `\n${bad} problem(s).` : '\nNo overflow, CTA in the first screen everywhere.');
}

await browser.close();
