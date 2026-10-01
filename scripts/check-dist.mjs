/**
 * Checks the built site (.vercel/output) against the audit's gates.
 * Run after `npm run build`:  npm run check:dist
 *
 *  · every page: lang + dir, unique <title>, meta description
 *  · indexable pages: absolute canonical, og:image that exists (audit M.2 #3),
 *    reciprocal hreflang with x-default (M.2 #4)
 *  · every <img>: alt, width, height (audit I.2 / T.20)
 *  · no inline event handlers, javascript: URLs or style="" attributes (CSP)
 *  · every internal link resolves to a page, file or redirect (C.3: the old
 *    site linked Arabic visitors to /about-ar, a 404)
 *  · store links only from the allow-list (threat model A6)
 *  · banned phrases (the fabricated "Live network activity" counter)
 *  · budgets (audit I.3): images, CSS, JS, fonts per locale
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stores } from '../src/config/site.ts';

const out = fileURLToPath(new URL('../.vercel/output/', import.meta.url));
const staticDir = join(out, 'static');
const config = JSON.parse(await readFile(join(out, 'config.json'), 'utf8'));
const SITE = 'https://shaheen.money';

const KB = 1024;
const BUDGET = {
  imageBytes: 150 * KB, // largest single image (audit I.3), excluding share images
  cssBytes: 40 * KB, // per page, compressed estimate uses raw/3
  jsBytes: 120 * KB,
  fontBytesPerLocale: 120 * KB,
  fontFilesPerLocale: 4,
  // Pages that set both scripts (<html data-fonts="both">: the press kit's
  // type specimens, the bilingual 404) carry both sets. unicode-range keeps
  // a face from loading until a glyph needs it.
  fontFilesBothScripts: 7,
};
const BANNED = [/live network activity/i, /moved today/i, /\$1\.2M/];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const files = [];
for await (const f of walk(staticDir)) files.push(f);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const exists = new Set(files.map((f) => '/' + relative(staticDir, f).replaceAll('\\', '/')));

const redirectSources = config.routes.filter((r) => r.status >= 300 && r.status < 400 && r.src).map((r) => new RegExp(r.src));
const serverless = [/^\/api\//];

const resolves = (path) => {
  const clean = decodeURIComponent(path.split('#')[0].split('?')[0]) || '/';
  if (exists.has(clean) || exists.has(`${clean.replace(/\/$/, '')}/index.html`) || exists.has(`${clean}.html`)) return true;
  return redirectSources.some((re) => re.test(clean)) || serverless.some((re) => re.test(clean));
};

const problems = [];
const warn = (file, msg) => problems.push(`${file}: ${msg}`);
const titles = new Map();
const hreflangGraph = new Map();
const pageAssets = new Map();

for (const file of htmlFiles) {
  const rel = '/' + relative(staticDir, file).replaceAll('\\', '/');
  const html = await readFile(file, 'utf8');
  const noindex = /<meta name="robots" content="noindex/.test(html);

  if (!/<html lang="(en|ar)" dir="(ltr|rtl)"/.test(html)) warn(rel, 'missing lang/dir on <html>');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) warn(rel, 'missing <title>');
  else if (!noindex) {
    if (titles.has(title)) warn(rel, `duplicate <title> (also ${titles.get(title)})`);
    titles.set(title, rel);
  }
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) warn(rel, 'missing or thin meta description');

  if (!noindex) {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical?.startsWith(`${SITE}/`)) warn(rel, `canonical not absolute: ${canonical}`);
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    if (!og) warn(rel, 'missing og:image');
    else if (!exists.has(og.replace(SITE, ''))) warn(rel, `og:image file not built: ${og}`);
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    if (canonical) hreflangGraph.set(canonical, alts);
    if (alts.length > 1 && !alts.some(([l]) => l === 'x-default')) warn(rel, 'hreflang set without x-default');
  }

  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = img[0];
    if (!/\balt="/.test(tag)) warn(rel, `<img> without alt: ${tag.slice(0, 80)}`);
    if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) warn(rel, `<img> without width/height: ${tag.slice(0, 80)}`);
  }

  if (/\son[a-z]+="/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) warn(rel, 'inline event handler attribute');
  if (/href="javascript:/i.test(html)) warn(rel, 'javascript: URL');
  if (/<[a-z][^>]*\sstyle="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, ''))) warn(rel, 'style="" attribute (blocked by CSP)');

  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (!resolves(m[1])) warn(rel, `broken internal link: ${m[1]}`);
  }
  for (const m of html.matchAll(/href="(https:\/\/(?:apps\.apple\.com|play\.google\.com)[^"]*)"/g)) {
    const url = m[1].replaceAll('&amp;', '&');
    if (url !== stores.ios && url !== stores.android) warn(rel, `store link not in allow-list: ${url}`);
  }

  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  for (const re of BANNED) if (re.test(text)) warn(rel, `banned phrase: ${re}`);

  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const js = [...html.matchAll(/<script[^>]+src="(\/[^"]+)"/g)].map((m) => m[1]);
  const fonts = [...html.matchAll(/url\("?(\/_astro\/fonts\/[^")]+)"?\)/g)].map((m) => m[1]);
  const both = /<html[^>]*\sdata-fonts="both"/.test(html);
  // Stylesheets inlined into the page (build.inlineStylesheets) count too.
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
  pageAssets.set(rel, { css, inlineCss, js, fonts, both, lang: html.match(/<html lang="(\w+)"/)?.[1] });
}

// Reciprocal hreflang: if A lists B, B must list A.
for (const [page, alts] of hreflangGraph) {
  for (const [lang, url] of alts) {
    if (lang === 'x-default' || url === page) continue;
    const back = hreflangGraph.get(url);
    if (!back) warn(page, `hreflang ${lang} → ${url} is not an indexable page`);
    else if (!back.some(([, u]) => u === page)) warn(page, `hreflang ${lang} → ${url} does not link back`);
  }
}

// Budgets.
const size = async (p) => (await stat(join(staticDir, p))).size;
for (const f of files) {
  const rel = '/' + relative(staticDir, f).replaceAll('\\', '/');
  if (/\.(avif|webp|jpe?g|png)$/.test(rel) && !rel.startsWith('/og/') && !/icon|favicon/.test(rel)) {
    const s = (await stat(f)).size;
    if (s > BUDGET.imageBytes) warn(rel, `image ${(s / KB).toFixed(0)} KB > ${BUDGET.imageBytes / KB} KB budget`);
  }
}
const fontSeen = { en: new Set(), ar: new Set() };
for (const [page, a] of pageAssets) {
  const cssBytes = (await Promise.all(a.css.map(size))).reduce((x, y) => x + y, a.inlineCss);
  const jsBytes = (await Promise.all(a.js.map(size))).reduce((x, y) => x + y, 0);
  // Brotli typically compresses CSS/JS 3–4×; budgets are for transfer size.
  if (cssBytes / 3 > BUDGET.cssBytes) warn(page, `CSS ~${(cssBytes / 3 / KB).toFixed(0)} KB compressed > budget`);
  if (jsBytes / 3 > BUDGET.jsBytes) warn(page, `JS ~${(jsBytes / 3 / KB).toFixed(0)} KB compressed > budget`);
  if (a.both) {
    const n = new Set(a.fonts).size;
    if (n > BUDGET.fontFilesBothScripts) warn(page, `${n} font files > ${BUDGET.fontFilesBothScripts} (both scripts)`);
  } else if (a.lang && fontSeen[a.lang]) for (const f of a.fonts) fontSeen[a.lang].add(f);
}
const fontReport = [];
for (const [lang, set] of Object.entries(fontSeen)) {
  // Declared faces are only fetched when used; count the ones each locale can load.
  const sizes = await Promise.all([...set].map(size));
  const total = sizes.reduce((x, y) => x + y, 0);
  fontReport.push(`${lang}: ${set.size} font files, ${(total / KB).toFixed(1)} KB`);
  if (set.size > BUDGET.fontFilesPerLocale) warn(lang, `${set.size} font files > ${BUDGET.fontFilesPerLocale}`);
  if (total > BUDGET.fontBytesPerLocale) warn(lang, `fonts ${(total / KB).toFixed(0)} KB > ${BUDGET.fontBytesPerLocale / KB} KB`);
}

console.log(`Checked ${htmlFiles.length} pages. Fonts per locale: ${fontReport.join('; ')}.`);
if (problems.length) {
  console.log(problems.map((p) => `  ✗ ${p}`).join('\n'));
  console.log(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log('All output checks passed.');
