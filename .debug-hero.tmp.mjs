// Temporary debugging helper. Deleted after use.
import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4321/en', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const probe = () =>
  page.evaluate(() => {
    const line = document.querySelector('.hero-line-inner');
    const route = document.querySelector('.stage-wide .route');
    const hero = document.querySelector('[data-hero]');
    return {
      lineOpacity: line && getComputedStyle(line).opacity,
      lineAnim: line && getComputedStyle(line).animationName,
      routeOffset: route && getComputedStyle(route).strokeDashoffset,
      routeAnim: route && getComputedStyle(route).animationName + ' ' + getComputedStyle(route).animationPlayState,
      heroP: hero && getComputedStyle(hero).getPropertyValue('--p'),
      artMask: getComputedStyle(document.querySelector('.hero-art')).maskImage.slice(0, 60),
      label: (() => {
        const t = document.querySelector('.stage-wide .city-name');
        const g = t?.closest('.city');
        const cs = t && getComputedStyle(t);
        const gs = g && getComputedStyle(g);
        const r = t?.getBoundingClientRect();
        return { opacity: cs?.opacity, fill: cs?.fill, fontSize: cs?.fontSize, gOpacity: gs?.opacity, gAnim: gs?.animationName + ' ' + gs?.animationPlayState, gTranslate: gs?.translate, rect: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], zoom: getComputedStyle(document.querySelector('.hero-zoom')).scale };
      })(),
    };
  });
console.log('before', await probe());
await page.screenshot({ path: `${out}/dbg-before.jpg`, type: 'jpeg', quality: 70 });
for (let y = 0; y < 6000; y += 600) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(80);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);
console.log('after', await probe());
await page.screenshot({ path: `${out}/dbg-after.jpg`, type: 'jpeg', quality: 70 });
await page.evaluate(() => window.scrollTo(0, 450));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/dbg-mid.jpg`, type: 'jpeg', quality: 60 });
await browser.close();
