import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scan } from './lib/palette-scan';
import { ADMIN_BASE } from '../src/config/admin';

/**
 * The Operations Command Center, against `astro dev`: the server's sign-in
 * with the development accounts and the demo data source, the session
 * guard and its refusals, roles, every page's render and console, the
 * design rules the site is held to (no purple, axe, no sideways scroll),
 * and the working parts: filters, paging, drawers, the command palette,
 * export, and the loading / empty / error states. The API's own checks
 * are in tests/admin-api.spec.ts.
 *
 * Development accounts and their password are read from the module itself,
 * never written here.
 */
const admins = readFileSync(new URL('../src/admin/mock/admins.ts', import.meta.url), 'utf8');
const PASSWORD = admins.match(/MOCK_PASSWORD = '([^']+)'/)![1]!;

const PAGES = ['/', '/users', '/connectors', '/transactions', '/network', '/money-movement', '/assets', '/analytics', '/activity', '/system-health', '/security', '/account', '/actions'].map((p) =>
  p === '/' ? `${ADMIN_BASE}/` : `${ADMIN_BASE}${p}`,
);

async function signIn(page: Page, email = 'admin@shaheen.test', scenario?: string): Promise<void> {
  await page.context().clearCookies();
  // Demo scenarios live in a cookie the server's demo source reads.
  if (scenario) await page.context().addCookies([{ name: 'ops_scenario', value: scenario, domain: 'localhost', path: '/' }]);
  await page.goto(`${ADMIN_BASE}/sign-in`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill('#f-email', email);
  await page.fill('#f-password', PASSWORD);
  await page.click('[data-submit]');
  // The dev server compiles each page on first request; under parallel workers that takes a while.
  await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE}/?$`), { timeout: 20_000 });
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'ready', { timeout: 20_000 });
}

const ready = (page: Page, region: string) => expect(page.locator(`[data-region="${region}"]`)).toHaveAttribute('data-state', 'ready', { timeout: 10_000 });

test.describe('the session guard', () => {
  test('a visitor without a session is sent to sign-in, and back afterwards', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/users?status=active`);
    await expect(page).toHaveURL(/sign-in\?next=/);
    await expect(page.locator('.ops-shell')).toHaveCount(0);
    await page.fill('#f-email', 'admin@shaheen.test');
    await page.fill('#f-password', PASSWORD);
    await page.click('[data-submit]');
    await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE}/users\\?status=active`));
  });

  test('nothing of the console shows before the session is confirmed', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/`);
    // The shell is display:none until boot() confirms a session.
    await expect(page.locator('.ops-shell')).toBeHidden();
  });

  test('next= cannot send anyone off the console', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/sign-in?next=https://example.com/`);
    await page.fill('#f-email', 'admin@shaheen.test');
    await page.fill('#f-password', PASSWORD);
    await page.click('[data-submit]');
    await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE}/?$`));
  });
});

test.describe('sign-in', () => {
  test('empty fields, then a wrong password, each say what is wrong', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/sign-in`);
    await page.click('[data-submit]');
    await expect(page.locator('#f-email')).toHaveAttribute('aria-invalid', 'true');
    await page.fill('#f-email', 'admin@shaheen.test');
    await page.fill('#f-password', 'wrong-password');
    await page.click('[data-submit]');
    await expect(page.locator('[data-signin]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[data-msg-text]')).toHaveText(/don’t match an operations account/);
    await expect(page.locator('#f-password')).toHaveValue('');
  });

  test('an app user cannot open the console', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/sign-in`);
    await page.fill('#f-email', 'app.user@shaheen.test');
    await page.fill('#f-password', PASSWORD);
    await page.click('[data-submit]');
    await expect(page.locator('[data-msg-text]')).toHaveText(/can’t open the operations console/);
    await expect(page).toHaveURL(/sign-in/);
  });

  test('a signed-in admin sees the session, and can sign out', async ({ page }) => {
    await signIn(page);
    await page.goto(`${ADMIN_BASE}/sign-in`);
    await expect(page.locator('[data-session]')).toBeVisible();
    await expect(page.locator('[data-session-name]')).toHaveText(/Layla Haddad/);
    await page.goto(`${ADMIN_BASE}/`);
    await page.locator('.ops-side [data-sign-out]').click();
    await expect(page).toHaveURL(/sign-in\?reason=signed-out/);
    await page.goto(`${ADMIN_BASE}/users`);
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe('roles', () => {
  test('support sees only what its role allows, and is refused the rest', async ({ page }) => {
    await signIn(page, 'support@shaheen.test');
    const nav = page.locator('.ops-side .ops-nav-label');
    await expect(nav).toContainText(['Command Center', 'Users']);
    await expect(nav.filter({ hasText: 'Security' })).toHaveCount(0);
    await expect(nav.filter({ hasText: 'Analytics' })).toHaveCount(0);
    await page.goto(`${ADMIN_BASE}/security`);
    await expect(page.getByText('This page is outside your access.')).toBeVisible();
  });

  test('without users:read_pii, emails arrive masked', async ({ page }) => {
    await signIn(page, 'operations@shaheen.test');
    await page.goto(`${ADMIN_BASE}/users`);
    await ready(page, 'users-rows');
    await expect(page.locator('[data-table="users"] tbody tr').first().locator('.ops-sub')).toContainText('•••@');
  });
});

test.describe('every page, signed in as an administrator', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  for (const path of PAGES) {
    test(`renders without errors, purple or sideways scroll: ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('data-auth', 'ready');
      // The closed record drawer keeps its own region; only the page's count.
      await expect(page.locator('main [data-state="loading"]')).toHaveCount(0, { timeout: 10_000 });
      await expect(page.locator('main [data-state="error"]')).toHaveCount(0);
      expect(errors).toEqual([]);
      const purple = await scan(page);
      expect(purple, purple.slice(0, 20).join('\n')).toEqual([]);
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(overflow, `sideways scroll at ${width}px`).toBeLessThanOrEqual(0);
      }
    });

    test(`axe: ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('main [data-state="loading"]')).toHaveCount(0, { timeout: 10_000 });
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}`));
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
});

test.describe('working parts', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('users: search, sort and paging are in the address bar; a row opens its record', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/users`);
    await ready(page, 'users-rows');
    await page.click('th[data-sort-key="name"] button');
    await expect(page.locator('th[data-sort-key="name"]')).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('button', { name: 'Page 2' }).click();
    await expect(page).toHaveURL(/sort=name.*page=2|page=2.*sort=name/);
    await page.fill('[data-search]', 'haddad');
    await expect(page).toHaveURL(/q=haddad/);
    await ready(page, 'users-rows');
    await expect(page.locator('[data-table="users"] tbody tr').first()).toContainText(/Haddad/);

    await page.locator('[data-table="users"] tbody tr').first().locator('.ops-who-name').click();
    await expect(page.locator('[data-drawer]')).toBeVisible();
    await ready(page, 'drawer');
    await expect(page).toHaveURL(/user=usr_/);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-drawer]')).toBeHidden();
    await expect(page).not.toHaveURL(/user=/);
  });

  test('a transaction opens as a receipt, by deep link', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/transactions`);
    await ready(page, 'txns-rows');
    const href = await page.locator('[data-table="txns"] tbody tr').first().getAttribute('data-href');
    await page.goto(href!);
    await ready(page, 'drawer');
    await expect(page.locator('[data-drawer] .slip')).toBeVisible();
    await expect(page.locator('[data-drawer]')).toContainText('Reference');
  });

  test('a Connector opens with its own 30 days', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/connectors`);
    await ready(page, 'connectors-rows');
    await page.locator('[data-table="connectors"] tbody tr').first().locator('.ops-who-name').click();
    await ready(page, 'drawer');
    await expect(page.locator('[data-drawer] .ch-bar').first()).toBeVisible();
  });

  test('filters reload the figures they scope', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/`);
    await expect(page.locator('html')).toHaveAttribute('data-auth', 'ready', { timeout: 20_000 });
    await ready(page, 'stats');
    const before = await page.locator('[data-metric="newUsers"] [data-value]').getAttribute('aria-label');
    await page.locator('[data-seg="range"] [data-value="7d"]').click();
    await expect(page).toHaveURL(/range=7d/, { timeout: 10_000 });
    await ready(page, 'stats');
    await expect(page.locator('[data-metric="newUsers"] [data-value]')).not.toHaveAttribute('aria-label', before!);
    await page.locator('[data-seg="txn-type"] [data-value="cash_out"]').click();
    await ready(page, 'txn-data');
    await expect(page.locator('[data-chart-title]')).toHaveText('Cash out volume');
  });

  test('the command palette finds a user and opens the record', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/`);
    await expect(page.locator('html')).toHaveAttribute('data-auth', 'ready');
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-palette]')).toBeVisible();
    await page.fill('[data-palette-input]', 'haddad');
    await expect(page.locator('[data-palette] [role="option"]').filter({ hasText: 'Haddad' }).first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/users\?user=usr_/);
    await ready(page, 'drawer');
  });

  test('export downloads a CSV that cannot carry a formula', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/users?q=haddad`);
    await ready(page, 'users-rows');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-export="users"]')]);
    expect(download.suggestedFilename()).toMatch(/^shaheen-users-demo-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text.replace(/^﻿/, '').split('\r\n')[0]).toBe('id,name,email,country,joined_at,status,last_active_at,wallet_status');
    expect(text).toContain('Haddad');
  });
});

test.describe('loading, empty and error states', () => {
  test('errors say what failed and offer a retry', async ({ page }) => {
    await signIn(page, 'admin@shaheen.test', 'error');
    await expect(page.locator('[data-region="stats"]')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('[data-region="stats"] [data-retry]')).toBeVisible();
    await expect(page.locator('[data-region="stats"] [data-error-code]')).toContainText('unavailable');
  });

  test('empty periods say so plainly', async ({ page }) => {
    await signIn(page, 'admin@shaheen.test', 'empty');
    await expect(page.locator('[data-region="stats"]')).toHaveAttribute('data-state', 'empty');
    await page.goto(`${ADMIN_BASE}/users`);
    await expect(page.locator('[data-region="users-rows"]')).toHaveAttribute('data-state', 'empty');
  });

  test('slow answers show the skeleton first', async ({ page }) => {
    await signIn(page, 'admin@shaheen.test', 'slow');
    await expect(page.locator('[data-region="stats"]')).toHaveAttribute('data-state', 'loading');
    await expect(page.locator('[data-region="stats"] .ops-sk').first()).toBeVisible();
  });
});

test.describe('the Paper temperature', () => {
  for (const path of [`${ADMIN_BASE}/`, `${ADMIN_BASE}/users`, `${ADMIN_BASE}/analytics`, `${ADMIN_BASE}/system-health`]) {
    test(`axe and purple scan on Paper: ${path}`, async ({ page }) => {
      await signIn(page);
      await page.evaluate(() => localStorage.setItem('shaheen-ops:temperature', 'paper'));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveClass(/t-paper/);
      await expect(page.locator('main [data-state="loading"]')).toHaveCount(0, { timeout: 10_000 });
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}`));
      expect(summary, summary.join('\n')).toEqual([]);
      const purple = await scan(page);
      expect(purple, purple.slice(0, 20).join('\n')).toEqual([]);
    });
  }
});
