import { readFileSync } from 'node:fs';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { totpAt, totpStep } from '../src/server/admin/crypto';

/**
 * The operations console's API on its own (src/server/admin/router.ts),
 * against `astro dev` with the development accounts: what the server
 * refuses, whatever the page in front of it does.
 */
const admins = readFileSync(new URL('../src/admin/mock/admins.ts', import.meta.url), 'utf8');
const PASSWORD = admins.match(/MOCK_PASSWORD = '([^']+)'/)![1]!;
const COMPLIANCE_TOTP = admins.match(/totpSecret: '([A-Z2-7]+)'/)![1]!;
const H = { 'X-Requested-With': 'shaheen-ops' };

async function signIn(request: APIRequestContext, email: string, code?: string) {
  return request.post('/api/admin/auth/sign-in', { headers: H, data: { email, password: PASSWORD, ...(code ? { code } : {}) } });
}

test.describe('every request', () => {
  test('without the console header is refused', async ({ request }) => {
    expect((await request.get('/api/admin/stats')).status()).toBe(403);
  });

  test('without a session is refused', async ({ request }) => {
    const res = await request.get('/api/admin/stats', { headers: H });
    expect(res.status()).toBe(401);
    expect(res.headers()['cache-control']).toContain('no-store');
  });

  test('with a forged cookie is refused', async ({ request }) => {
    const res = await request.get('/api/admin/stats', { headers: { ...H, Cookie: 'shaheen_ops=eyJzaWQiOiJ4IiwiYWlkIjoiYWRtXzAxIn0.forged' } });
    expect(res.status()).toBe(401);
  });

  test('a cross-site request is refused', async ({ request }) => {
    await signIn(request, 'admin@shaheen.test');
    expect((await request.get('/api/admin/stats', { headers: { ...H, 'Sec-Fetch-Site': 'cross-site' } })).status()).toBe(403);
  });

  test('a sign-in posted from another origin is refused', async ({ request }) => {
    const res = await request.post('/api/admin/auth/sign-in', { headers: { ...H, Origin: 'https://example.com' }, data: { email: 'admin@shaheen.test', password: PASSWORD } });
    expect(res.status()).toBe(403);
  });
});

test.describe('signing in', () => {
  test('a wrong password and an unknown email get the same answer', async ({ request }) => {
    const a = await request.post('/api/admin/auth/sign-in', { headers: H, data: { email: 'admin@shaheen.test', password: 'not-it-at-all' } });
    const b = await request.post('/api/admin/auth/sign-in', { headers: H, data: { email: `nobody-${Date.now()}@shaheen.test`, password: 'not-it-at-all' } });
    expect([a.status(), await a.json()]).toEqual([401, { code: 'invalid_credentials' }]);
    expect([b.status(), await b.json()]).toEqual([401, { code: 'invalid_credentials' }]);
  });

  test('an app user is refused even with the right password', async ({ request }) => {
    const res = await signIn(request, 'app.user@shaheen.test');
    expect([res.status(), await res.json()]).toEqual([403, { code: 'not_authorized' }]);
  });

  test('a session cookie is httpOnly and SameSite=Strict, and never in the body', async ({ request }) => {
    const res = await signIn(request, 'admin@shaheen.test');
    expect(res.status()).toBe(200);
    const cookie = res.headers()['set-cookie'] ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    const body = await res.text();
    expect(body).not.toContain(cookie.split(';')[0]!.split('=')[1]!);
    expect(JSON.parse(body).session.admin.email).toBe('admin@shaheen.test');
  });

  test('five failures lock the account, with Retry-After', async ({ request }) => {
    const email = `locked-${Date.now()}@shaheen.test`;
    for (let i = 0; i < 5; i++) await request.post('/api/admin/auth/sign-in', { headers: H, data: { email, password: 'wrong-wrong' } });
    const res = await request.post('/api/admin/auth/sign-in', { headers: H, data: { email, password: 'wrong-wrong' } });
    expect(res.status()).toBe(429);
    expect(Number(res.headers()['retry-after'])).toBeGreaterThan(0);
  });

  test('sign-out ends the session', async ({ request }) => {
    await signIn(request, 'admin@shaheen.test');
    expect((await request.get('/api/admin/auth/session', { headers: H })).status()).toBe(200);
    // A browser always sends Origin with a POST; Astro's own origin check expects it.
    expect((await request.post('/api/admin/auth/sign-out', { headers: { ...H, Origin: 'http://localhost:4322' } })).status()).toBe(204);
    expect((await request.get('/api/admin/stats', { headers: H })).status()).toBe(401);
  });
});

test.describe('the second factor', () => {
  test('is asked for, checked, and accepted only once per code', async ({ request }) => {
    const first = await signIn(request, 'compliance@shaheen.test');
    expect([first.status(), await first.json()]).toEqual([401, { code: 'mfa_required' }]);

    const wrong = await signIn(request, 'compliance@shaheen.test', '000000');
    expect(await wrong.json()).toEqual({ code: 'mfa_invalid' });

    // A fresh code, so a retry of this test never meets its own earlier code.
    let step = totpStep();
    if (Date.now() % 30_000 > 25_000) step += 1;
    const code = totpAt(COMPLIANCE_TOTP, step);
    const ok = await signIn(request, 'compliance@shaheen.test', code);
    expect(ok.status()).toBe(200);
    expect((await ok.json()).session.secondFactor).toBe(true);

    const replay = await signIn(request, 'compliance@shaheen.test', code);
    expect(await replay.json()).toEqual({ code: 'mfa_invalid' });
  });
});

test.describe('permissions, on the server', () => {
  test('a role is refused what it may not read', async ({ request }) => {
    await signIn(request, 'support@shaheen.test');
    expect((await request.get('/api/admin/security', { headers: H })).status()).toBe(403);
    expect((await request.get('/api/admin/network', { headers: H })).status()).toBe(403);
    expect((await request.get('/api/admin/users/export', { headers: H })).status()).toBe(403);
    expect((await request.get('/api/admin/users?pageSize=1', { headers: H })).status()).toBe(200);
  });

  test('emails are masked for a role without users:read_pii, in full for one with it', async ({ request, playwright }) => {
    await signIn(request, 'operations@shaheen.test');
    const masked = await (await request.get('/api/admin/users?pageSize=5', { headers: H })).json();
    for (const u of masked.items) expect(u.email).toMatch(/^.•••@/);

    const admin = await playwright.request.newContext({ baseURL: 'http://localhost:4322' });
    await signIn(admin, 'admin@shaheen.test');
    const full = await (await admin.get('/api/admin/users?pageSize=5', { headers: H })).json();
    for (const u of full.items) expect(u.email).not.toContain('•••');
    await admin.dispose();
  });

  test('a masked email cannot be recovered by searching for it', async ({ request, playwright }) => {
    // The admin (users:read_pii) learns one full email and its owner.
    const admin = await playwright.request.newContext({ baseURL: 'http://localhost:4322' });
    await signIn(admin, 'admin@shaheen.test');
    const first = (await (await admin.get('/api/admin/users?pageSize=1', { headers: H })).json()).items[0];
    const local = String(first.email).split('@')[0]!;
    expect((await (await admin.get(`/api/admin/users?search=${encodeURIComponent(first.email)}`, { headers: H })).json()).total).toBeGreaterThan(0);
    await admin.dispose();

    // Operations (masked emails) searching that email, or a piece of it, finds nothing by email.
    await signIn(request, 'operations@shaheen.test');
    const byEmail = await (await request.get(`/api/admin/users?search=${encodeURIComponent(first.email)}`, { headers: H })).json();
    expect(byEmail.total).toBe(0);
    const palette = await (await request.get(`/api/admin/search?q=${encodeURIComponent(first.email)}`, { headers: H })).json();
    expect(palette.users).toHaveLength(0);
    // A guess that is only part of the email's local part (and not the name) finds nothing either.
    const partial = local.replace(/[^a-z0-9]/gi, '').slice(-4);
    if (partial.length >= 2 && !String(first.name).toLowerCase().replace(/[^a-z0-9]/g, '').includes(partial.toLowerCase())) {
      const res = await (await request.get(`/api/admin/users?search=${encodeURIComponent(partial + '@')}`, { headers: H })).json();
      expect(res.total).toBe(0);
    }
  });

  test('exports are rate-limited per account', async ({ request }) => {
    await signIn(request, 'operations@shaheen.test');
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await request.get('/api/admin/transactions/export?range=24h', { headers: H })).status();
    expect(last).toBe(429);
  });

  test('inputs outside their allowed values are refused', async ({ request }) => {
    await signIn(request, 'admin@shaheen.test');
    expect((await request.get('/api/admin/users?status=evil', { headers: H })).status()).toBe(400);
    expect((await request.get('/api/admin/users?pageSize=5000', { headers: H })).status()).toBe(400);
    expect((await request.get('/api/admin/stats?range=forever', { headers: H })).status()).toBe(400);
  });

  test('an export is generated on the server, with its row count, and logged', async ({ request }) => {
    await signIn(request, 'admin@shaheen.test');
    const res = await request.get('/api/admin/connectors/export?status=active', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(Number(res.headers()['x-row-count'])).toBeGreaterThan(0);
    const security = await (await request.get('/api/admin/security', { headers: H })).json();
    expect(security.events.some((e: { kind: string; detail: string }) => e.kind === 'export.created' && e.detail.includes('connectors'))).toBe(true);
  });
});
