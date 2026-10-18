import { test, expect } from '@playwright/test';

/**
 * Forms against `astro dev` (serverless routes run there). In dev, with no
 * delivery sink configured, a valid submission is accepted and only the
 * field names are logged.
 */
test('Business application: empty submit shows every error, then succeeds', async ({ page }) => {
  await page.goto('/en/business/apply');
  await page.getByRole('button', { name: 'Send application' }).click();

  await expect(page.locator('[data-form-summary]')).toBeVisible();
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-phone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-consent')).toHaveAttribute('aria-invalid', 'true');

  await page.fill('#f-name', 'Test Applicant');
  await page.fill('#f-business', 'Test Pharmacy');
  await page.selectOption('#f-type', 'pharmacy');
  await page.fill('#f-country', 'Jordan');
  await page.fill('#f-city', 'Irbid');
  await page.fill('#f-phone', 'not a phone');
  await page.check('#f-consent');
  await page.getByRole('button', { name: 'Send application' }).click();
  await expect(page.locator('#f-phone')).toHaveAttribute('aria-invalid', 'true');

  await page.fill('#f-phone', '+962 7 0000 0000');
  // The server rejects sub-2.5s submissions as bots; a person takes longer.
  await page.waitForTimeout(2600);
  await page.getByRole('button', { name: 'Send application' }).click();
  await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
});

test('the business application offers company types as well as shop types', async ({ page }) => {
  await page.goto('/en/business/apply');
  const groups = page.locator('#f-type optgroup');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toHaveAttribute('label', 'Shops and exchange offices');
  await expect(groups.nth(1)).toHaveAttribute('label', 'Companies and institutions');

  await page.selectOption('#f-type', 'bank');
  await page.fill('#f-name', 'Test Applicant');
  await page.fill('#f-business', 'Test Bank');
  await page.fill('#f-country', 'Jordan');
  await page.fill('#f-city', 'Amman');
  await page.fill('#f-phone', '+962 7 0000 0000');
  await page.check('#f-consent');
  await page.waitForTimeout(2600);
  await page.getByRole('button', { name: 'Send application' }).click();
  await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
});

test('Arabic contact form shows Arabic errors', async ({ page }) => {
  await page.goto('/ar/contact');
  await page.getByRole('button', { name: 'أرسل الرسالة' }).click();
  await expect(page.locator('#f-name-error')).toContainText('هذا الحقل مطلوب');
  await expect(page.locator('#f-email')).toHaveAttribute('dir', 'ltr');
});

test('the endpoint rejects unknown fields and cross-site posts', async ({ request }) => {
  const tampered = await request.post('/api/forms/contact', {
    headers: { Accept: 'application/json', Origin: 'http://localhost:4322' },
    form: {
      locale: 'en',
      topic: 'support',
      name: 'A',
      email: 'a@example.com',
      message: 'hello',
      consent: 'yes',
      isAdmin: 'true',
    },
  });
  expect(tampered.status()).toBe(400);

  const crossSite = await request.post('/api/forms/contact', {
    headers: { Accept: 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
    form: { locale: 'en' },
  });
  expect(crossSite.status()).toBe(403);
});

test('the endpoint only accepts POST', async ({ request }) => {
  const response = await request.get('/api/forms/business');
  expect(response.status()).toBe(405);
});
