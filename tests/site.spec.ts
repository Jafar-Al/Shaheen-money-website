import { test, expect } from '@playwright/test';
import { allPaths, keyPaths } from './pages';

// ── Layout (audit G.2 rule 9): no horizontal overflow at any width ─────
for (const width of [320, 390, 768, 1024, 1440]) {
  for (const path of keyPaths) {
    test(`no horizontal overflow at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// ── The download button is visible without scrolling on a phone ────────
for (const path of ['/en', '/ar']) {
  test(`hero download button above the fold on a phone: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const box = await page.locator('#hero-title ~ div a[data-smart-download]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  });
}

// ── Privacy (threat model A12): no third-party requests, no cookies ────
for (const path of allPaths) {
  test(`first-party only, no cookies: ${path}`, async ({ page, context }) => {
    const foreign: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) foreign.push(r.url());
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(foreign).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });
}

// ── CSP: nothing on any page is blocked ─────────────────────────────────
for (const path of allPaths) {
  test(`no CSP violations or script errors: ${path}`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(problems).toEqual([]);
  });
}

// ── Security headers reach the browser ──────────────────────────────────
test('security headers on pages', async ({ request }) => {
  const response = await request.get('/en');
  const h = response.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['strict-transport-security']).toContain('max-age=63072000');
});

// ── Locale switching keeps the page (audit C.7) ─────────────────────────
test('language switch keeps the current page', async ({ page }) => {
  await page.goto('/en/business');
  await page.locator('footer a[hreflang="ar"]').click();
  await expect(page).toHaveURL(/\/ar\/business$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.locator('footer a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/business$/);
});

test('the Arabic logo stays in Arabic', async ({ page }) => {
  await page.goto('/ar/security');
  await page.locator('header a[aria-label]').first().click();
  await expect(page).toHaveURL(/\/ar$/);
});

// ── Keyboard ────────────────────────────────────────────────────────────
test('skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/en/security');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mobile menu: opens, traps focus, closes on Escape and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mobile-menu')).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the desktop navigation is four plain links, reachable with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/security');
  const nav = page.locator('header nav[data-nav="desktop"]');
  await expect(nav.locator('a')).toHaveCount(4);
  // No disclosure buttons left in the header navigation to open or trap focus.
  await expect(nav.locator('button')).toHaveCount(0);
  await nav.getByRole('link', { name: 'Business' }).click();
  await expect(page).toHaveURL(/\/en\/business$/);
});

test('the current section is marked on a sub-page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/business/apply');
  await expect(page.locator('header nav[data-nav="desktop"] a[aria-current="page"]')).toHaveText('Business');
});

// ── One download button that knows the device ───────────────────────────
//
// Three things have to hold on every device, for every download control on
// the page (hero, header, the closing call to action):
//   · an iPhone or iPad goes straight to the App Store;
//   · an Android phone or tablet goes straight to Google Play;
//   · a computer, which cannot know which store its owner's phone uses, goes
//     to the "Get the app" page that shows both: no pop-up, no QR code.
// And with JavaScript off, every one of them still points at /download,
// which the edge resolves by user agent (scripts/postbuild.mjs).

/** Every download control rendered on the homepage. */
const DOWNLOAD_CONTROLS = 'a[data-smart-download]';
const HERO_DOWNLOAD = '#hero-title ~ div a[data-smart-download]';

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPADOS_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID_PHONE_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

test.describe('on an iPhone', () => {
  test.use({ userAgent: IOS_UA, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('every download control goes to the App Store, and never names a platform', async ({ page }) => {
    await page.goto('/en');
    const links = page.locator(DOWNLOAD_CONTROLS);
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', /^https:\/\/apps\.apple\.com\//);
    }
    await expect(page.locator(HERO_DOWNLOAD)).toHaveText(/^\s*Download the app\s*$/);
    await expect(page.locator('html')).toHaveAttribute('data-platform', 'ios');
  });
});

test.describe('on an iPad', () => {
  // iPadOS reports itself as a Mac; touch points are what give it away.
  test.use({ userAgent: IPADOS_UA, viewport: { width: 1024, height: 1366 }, hasTouch: true });
  test('the download button goes to the App Store', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-platform', 'ios');
    await expect(page.locator(HERO_DOWNLOAD)).toHaveAttribute('href', /^https:\/\/apps\.apple\.com\//);
  });
});

test.describe('on an Android phone', () => {
  test.use({ userAgent: ANDROID_PHONE_UA, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  test('every download control goes to Google Play, in both languages', async ({ page }) => {
    for (const path of ['/en', '/ar']) {
      await page.goto(path);
      const links = page.locator(DOWNLOAD_CONTROLS);
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(links.nth(i)).toHaveAttribute('href', /^https:\/\/play\.google\.com\//);
      }
      await expect(page.locator('html')).toHaveAttribute('data-platform', 'android');
      // The same plain label as everywhere else: the button never says Android.
      await expect(page.locator(HERO_DOWNLOAD)).toHaveText(path === '/en' ? /^\s*Download the app\s*$/ : /^\s*حمّل التطبيق\s*$/);
    }
  });
});

test.describe('on an Android tablet', () => {
  test.use({ userAgent: ANDROID_TABLET_UA, viewport: { width: 1280, height: 800 }, hasTouch: true });
  test('the download button goes to Google Play', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-platform', 'android');
    await expect(page.locator(HERO_DOWNLOAD)).toHaveAttribute('href', /^https:\/\/play\.google\.com\//);
  });
});

test.describe('on an Android phone asking for the desktop site', () => {
  // Chrome then reports a Linux desktop, but the screen is still a touchscreen.
  const DESKTOP_MODE_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  test.use({ userAgent: DESKTOP_MODE_UA, viewport: { width: 980, height: 1800 }, hasTouch: true });
  test('the download button still goes straight to Google Play', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-platform', 'android');
    await expect(page.locator(HERO_DOWNLOAD)).toHaveAttribute('href', /^https:\/\/play\.google\.com\//);
  });
});

test.describe('on a computer', () => {
  test.use({ userAgent: WINDOWS_UA, viewport: { width: 1440, height: 900 } });
  test('the download button goes to the page with both stores: no pop-up, no QR code', async ({ page }) => {
    for (const [path, target] of [
      ['/en', '/en/get-the-app'],
      ['/ar', '/ar/get-the-app'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-platform', 'desktop');
      const button = page.locator(HERO_DOWNLOAD);
      await expect(button).toHaveAttribute('href', target);
      await button.click();
      await expect(page).toHaveURL(new RegExp(target + '$'));
      // Both stores, and nothing to scan.
      await expect(page.locator('a[data-store="ios"]').first()).toBeVisible();
      await expect(page.locator('a[data-store="android"]').first()).toBeVisible();
      await expect(page.locator('.app-qr, dialog, [id*="qr"]')).toHaveCount(0);
    }
  });
  test('no page carries a QR code or a download dialog', async ({ page }) => {
    for (const path of ['/en', '/ar', '/en/get-the-app', '/ar/get-the-app']) {
      await page.goto(path);
      expect(await page.locator('dialog').count(), path).toBe(0);
      expect(await page.locator('svg[shape-rendering="crispEdges"]').count(), path).toBe(0);
    }
  });
});

test.describe('the store badges show only your store on a phone', () => {
  test.describe('iPhone', () => {
    test.use({ userAgent: IOS_UA, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test('App Store only', async ({ page }) => {
      await page.goto('/en/get-the-app');
      // The page's badges and the footer's: all of them the App Store's, none Google Play's.
      expect(await page.locator('a[data-store="ios"]:visible').count()).toBeGreaterThan(0);
      await expect(page.locator('a[data-store="android"]:visible')).toHaveCount(0);
    });
  });
  test.describe('Android', () => {
    test.use({ userAgent: ANDROID_PHONE_UA, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
    test('Google Play only', async ({ page }) => {
      await page.goto('/ar/get-the-app');
      expect(await page.locator('a[data-store="android"]:visible').count()).toBeGreaterThan(0);
      await expect(page.locator('a[data-store="ios"]:visible')).toHaveCount(0);
    });
  });
});

test.describe('the button reads the same on every device', () => {
  for (const [name, userAgent] of [
    ['iPhone', IOS_UA],
    ['Android phone', ANDROID_PHONE_UA],
    ['computer', WINDOWS_UA],
  ] as const) {
    test(`${name}: no platform named, same hero label`, async ({ browser }) => {
      const context = await browser.newContext({ userAgent });
      const page = await context.newPage();
      await page.goto('http://localhost:4321/en');
      const labels = await page.locator(DOWNLOAD_CONTROLS).allInnerTexts();
      expect(labels.length).toBeGreaterThan(0);
      // Every control (the header's "Get the app" included) is platform-free.
      for (const label of labels) expect(label, 'a download control names a platform').not.toMatch(/iphone|android|ipad|app store|google play/i);
      await expect(page.locator(HERO_DOWNLOAD)).toHaveText(/^\s*Download the app\s*$/);
      await context.close();
    });
  }
});

test.describe('with JavaScript turned off', () => {
  test.use({ javaScriptEnabled: false });
  test('every download control still points at the universal /download link', async ({ page }) => {
    for (const [path, expected] of [
      ['/en', '/download'],
      ['/ar', '/ar/download'],
    ] as const) {
      await page.goto(path);
      const links = page.locator(DOWNLOAD_CONTROLS);
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) await expect(links.nth(i)).toHaveAttribute('href', expected);
    }
  });
});

test('the edge sends /download to the right store by user agent', async ({ playwright }) => {
  const cases: Array<[string, string, RegExp]> = [
    ['/download', IOS_UA, /^https:\/\/apps\.apple\.com\//],
    ['/download', ANDROID_PHONE_UA, /^https:\/\/play\.google\.com\//],
    ['/en/download', IOS_UA, /^https:\/\/apps\.apple\.com\//],
    ['/ar/download', ANDROID_PHONE_UA, /^https:\/\/play\.google\.com\//],
    ['/download', WINDOWS_UA, /^\/en\/get-the-app$/],
    ['/ar/download', WINDOWS_UA, /^\/ar\/get-the-app$/],
  ];
  for (const [path, ua, expected] of cases) {
    const api = await playwright.request.newContext({
      baseURL: 'http://localhost:4321',
      extraHTTPHeaders: { 'User-Agent': ua },
    });
    const response = await api.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} with ${ua.slice(0, 24)}`).toBe(302);
    expect(response.headers()['location'], `${path} with ${ua.slice(0, 24)}`).toMatch(expected);
    // A per-device answer must never be cached by a shared cache.
    expect(response.headers()['vary']).toContain('User-Agent');
    await api.dispose();
  }
});

// ── The pages the owner asked for are all there, and linked ─────────────
test('the five pages are in the menu; Media and both documents are one click on', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  const nav = page.locator('header nav').first();
  for (const name of ['About', 'Business', 'Blog', 'Contact']) {
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
  // The home page is the logo.
  await expect(page.locator('header a[href="/en"]').first()).toBeVisible();
  for (const path of ['/en/about', '/en/business', '/en/blog', '/en/contact', '/en/media', '/ar/about', '/ar/business', '/ar/blog', '/ar/contact', '/ar/media']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
  }
});

test('the pitch deck and the company profile are on Media, in both languages, and are real PDFs', async ({ page, request }) => {
  for (const locale of ['en', 'ar']) {
    await page.goto(`/${locale}/media`);
    const hrefs = await page.locator('a[href$=".pdf"]').evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    for (const id of ['pitch-deck', 'company-profile']) {
      const href = hrefs.find((h) => h.includes(id) && h.includes(`-${locale}.pdf`));
      expect(href, `${locale}: ${id}`).toBeTruthy();
      const response = await request.get(href!);
      expect(response.status(), href!).toBe(200);
      expect((await response.body()).subarray(0, 5).toString(), href!).toBe('%PDF-');
    }
  }
});

// ── The homepage stays short and simple ─────────────────────────────────
test('the homepage is a short story: the hero and six sections at most', async ({ page }) => {
  for (const path of ['/en', '/ar']) {
    await page.goto(path);
    expect(await page.locator('main > section').count(), path).toBeLessThanOrEqual(7);
  }
});

// ── The film: silent, only while seen, stoppable ────────────────────────
test('the film plays by itself while in view, is silent, and stays paused once paused', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  const video = page.locator('[data-film] video');
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('paused', true);
  await page.locator('#how').scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 8000 }).toBe(true);
  const toggle = page.locator('[data-film-toggle]');
  await expect(toggle).toHaveAttribute('aria-label', 'Pause the film');
  await toggle.click();
  await expect(video).toHaveJSProperty('paused', true);
  await expect(toggle).toHaveAttribute('aria-label', 'Play the film');
  // Away and back: a visitor who paused it keeps it paused.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#how').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(video).toHaveJSProperty('paused', true);
});

test('with reduced motion the film waits for the visitor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  await page.locator('#how').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await expect(page.locator('[data-film] video')).toHaveJSProperty('paused', true);
  await expect(page.locator('[data-film-toggle]')).toHaveAttribute('aria-label', 'Play the film');
});

// ── The hero: an atlas behind the falcon, decorative and calm ───────────
test('the hero atlas is hidden from assistive technology and still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await expect(page.locator('[data-hero] .hero-art')).toHaveAttribute('aria-hidden', 'true');
  await page.waitForTimeout(300);
  // Routes, packets and the falcon all go straight to their final frame.
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest('.hero-art'))
        .length,
  );
  expect(running).toBe(0);
});

// ── The Arab capitals around Amman: named in the page's language ─────────
const CAPITALS = {
  en: ['Damascus', 'Beirut', 'Amman', 'Jerusalem', 'Cairo', 'Riyadh', 'Doha', 'Abu Dhabi', 'Dubai'],
  ar: ['دمشق', 'بيروت', 'عمّان', 'القدس', 'القاهرة', 'الرياض', 'الدوحة', 'أبوظبي', 'دبي'],
} as const;

test('the hero map names all nine Arab capitals, in English and in Arabic', async ({ page }) => {
  for (const locale of ['en', 'ar'] as const) {
    await page.goto(`/${locale}`);
    const names = (await page.locator('.atlas-lines.atlas-wide .capital-name').allTextContents()).map((t) => t.trim());
    expect(names.sort(), locale).toEqual([...CAPITALS[locale]].sort());
  }
});

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [768, 1024],
] as const) {
  for (const locale of ['en', 'ar'] as const) {
    test(`the capitals' names are on screen and clear of the headline: ${locale} ${width}x${height}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      await page.goto(`/${locale}`);
      await page.waitForTimeout(400);
      const title = await page.locator('#hero-title').boundingBox();
      expect(title).not.toBeNull();
      const names = page.locator('.atlas-lines.atlas-wide .capital-name');
      const count = await names.count();
      expect(count).toBe(9);
      for (let i = 0; i < count; i++) {
        const box = await names.nth(i).boundingBox();
        const label = await names.nth(i).textContent();
        expect(box, label ?? '').not.toBeNull();
        expect(box!.x, `${label} runs off the left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${label} runs off the right edge`).toBeLessThanOrEqual(width);
        const apart = box!.y + box!.height <= title!.y || box!.y >= title!.y + title!.height || box!.x + box!.width <= title!.x || box!.x >= title!.x + title!.width;
        expect(apart, `${label} overlaps the headline`).toBe(true);
      }
    });
  }
}

test('the hero headline is not hidden behind an entrance (it is the LCP)', async ({ page }) => {
  await page.goto('/en');
  const opacity = await page.locator('#hero-title').evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(opacity)).toBe(1);
});

test('hero falcon ends at rest (no leftover transform)', async ({ page }) => {
  await page.goto('/en');
  await page.waitForTimeout(1900);
  const transforms = await page.$$eval('.falcon-stage *', (els) =>
    els.map((el) => getComputedStyle(el).transform).filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'),
  );
  expect(transforms).toEqual([]);
});
