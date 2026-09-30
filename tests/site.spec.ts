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
//   · anything else opens the QR dialog rather than guessing.
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
  test('every download control goes to the App Store, and says so', async ({ page }) => {
    await page.goto('/en');
    const links = page.locator(DOWNLOAD_CONTROLS);
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', /^https:\/\/apps\.apple\.com\//);
    }
    await expect(page.locator(HERO_DOWNLOAD)).toContainText('iPhone');
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

test.describe('on a computer', () => {
  test.use({ userAgent: WINDOWS_UA, viewport: { width: 1440, height: 900 } });
  test('the download button opens the QR dialog and returns focus on close', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-platform', 'desktop');
    const button = page.locator(HERO_DOWNLOAD);
    await button.click();
    await expect(page.locator('#download-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#download-dialog')).toBeHidden();
    await expect(button).toBeFocused();
  });
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

// ── The falcon lands exactly on the mark ────────────────────────────────
test('the hero backdrop is inert (no animation behind the falcon)', async ({ page }) => {
  await page.goto('/en');
  const animated = await page.$$eval('.hero-backdrop, .hero-backdrop *', (els) =>
    els.map((el) => getComputedStyle(el).animationName).filter((n) => n !== 'none'),
  );
  expect(animated).toEqual([]);
});

test('hero falcon ends at rest (no leftover transform)', async ({ page }) => {
  await page.goto('/en');
  await page.waitForTimeout(1900);
  const transforms = await page.$$eval('.falcon-stage *', (els) =>
    els.map((el) => getComputedStyle(el).transform).filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'),
  );
  expect(transforms).toEqual([]);
});
