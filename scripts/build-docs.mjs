/**
 * Prints the two downloadable documents to PDF, in both languages:
 *
 *   /<locale>/media/company-profile  → public/media/shaheen-money-company-profile-<locale>.pdf (A4)
 *   /<locale>/media/pitch-deck       → public/media/shaheen-money-pitch-deck-<locale>.pdf (16:9)
 *
 *   npm run build && npm run docs && npm run build
 *
 * The pages are the site's own components and copy (src/pages/[locale]/media/),
 * so the PDFs and the website cannot drift apart. The first build makes the
 * pages, this script prints them, and the second build ships the PDFs.
 *
 * Serves .vercel/output with scripts/serve.mjs on a spare port, unless BASE
 * points at a running server. PW_CHANNEL=msedge (or chrome) uses an installed
 * browser. Printed with reduced motion, so every drawing is at its final frame.
 *
 *   node scripts/build-docs.mjs [--out=dir]
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? join(root, 'public', 'media');
const PORT = 4399;

let server;
let base = process.env.BASE;
if (!base) {
  base = `http://localhost:${PORT}`;
  server = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => String(chunk).includes('Preview:') && resolve());
    server.on('exit', (code) => reject(new Error(`scripts/serve.mjs exited (${code}); run npm run build first.`)));
  });
}

const documents = [
  { path: 'company-profile', file: 'shaheen-money-company-profile' },
  { path: 'pitch-deck', file: 'shaheen-money-pitch-deck' },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
try {
  for (const locale of ['en', 'ar']) {
    for (const doc of documents) {
      const url = `${base}/${locale}/media/${doc.path}`;
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
      // Every image, lazy or not, and every font, before the page is printed.
      await page.evaluate(async () => {
        await Promise.all(
          [...document.images].map((img) => {
            img.loading = 'eager';
            return img.complete ? null : new Promise((done) => img.addEventListener('load', done, { once: true }));
          }),
        );
        await document.fonts.ready;
      });
      await page.waitForTimeout(300);
      const file = join(out, `${doc.file}-${locale}.pdf`);
      await page.pdf({ path: file, printBackground: true, preferCSSPageSize: true });
      console.log(`${file}  ${Math.round(statSync(file).size / 1024)} KB`);
    }
  }
} finally {
  await browser.close();
  server?.kill();
}
