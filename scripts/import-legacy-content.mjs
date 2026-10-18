/**
 * One-time migration of the old site's content into the new content model.
 *
 *   npm run import:legacy              write Markdown files
 *   npm run import:legacy -- --dry-run report what would be written
 *
 * Blog: the 11 posts at shaheen.money/blog/<slug> → src/content/blog/en/<slug>.md
 *       (title, description, category and date come from the old pages).
 * Legal: privacy + terms, English and Arabic → src/content/legal/<locale>/<doc>.md
 *        imported with status: draft, because the audit found the privacy
 *        policy names no data controller and no GDPR basis (K-07). Legal
 *        review sets status: approved.
 *
 * Existing files are never overwritten. Review every imported post before
 * launch: figures inside posts must meet the same sourcing rule as the site.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { legacyPostSlugs } from '../src/config/redirects.mjs';

const BASE = 'https://shaheen.money';
const dryRun = process.argv.includes('--dry-run');
const root = new URL('../', import.meta.url);

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

const strip = (s) => decode(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Inline HTML → Markdown (links, bold, italics). */
function inline(html) {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '  \n')
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${strip(t)}**`)
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${strip(t)}*`)
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => {
        const url = href.startsWith('/blog/') ? `/en${href}` : href;
        return `[${strip(t)}](${url})`;
      })
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Block HTML → Markdown for the element set the old site used. */
function toMarkdown(html) {
  const body = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, '');
  const blocks = [];
  const re = /<(h2|h3|h4|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(body))) {
    const [, tag, inner] = m;
    const t = tag.toLowerCase();
    if (t === 'h2') blocks.push(`## ${strip(inner)}`);
    else if (t === 'h3' || t === 'h4') blocks.push(`### ${strip(inner)}`);
    else if (t === 'p') {
      const text = inline(inner);
      if (text) blocks.push(text);
    } else if (t === 'blockquote') blocks.push(`> ${inline(inner.replace(/<\/p>\s*<p[^>]*>/g, '\n\n')).replace(/\n/g, '\n> ')}`);
    else {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((li, i) => `${t === 'ol' ? `${i + 1}.` : '-'} ${inline(li[1])}`);
      if (items.length) blocks.push(items.join('\n'));
    }
  }
  return blocks.join('\n\n') + '\n';
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const isoDate = (s) => {
  const m = s.match(/([A-Z][a-z]{2})[a-z]* (\d{1,2}), (\d{4})/);
  if (!m) return null;
  return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
};

async function get(path) {
  const response = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': 'shaheen-content-migration' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

async function write(relPath, content, summary) {
  const url = new URL(relPath, root);
  try {
    await access(url);
    console.log(`  skip   ${relPath} (exists)`);
    return;
  } catch {}
  if (dryRun) {
    console.log(`  would write ${relPath}  ${summary}`);
    return;
  }
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, content);
  console.log(`  wrote  ${relPath}  ${summary}`);
}

const yaml = (s) => `'${s.replace(/'/g, "''")}'`;
const shape = (md) =>
  `${(md.match(/^## /gm) ?? []).length} h2, ${(md.match(/^### /gm) ?? []).length} h3, ${md.split('\n\n').length} blocks`;

// ── Blog ────────────────────────────────────────────────────────────────
console.log('Blog');
const index = await get('/blog');
for (const slug of legacyPostSlugs) {
  const html = await get(`/blog/${slug}`);
  const title = strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? '';

  // Category and date from the post's own card on the blog index: each card
  // is one <a href="/blog/<slug>"> wrapping badge, title, excerpt and date.
  const at = index.indexOf(`href="/blog/${slug}"`);
  const cardHtml = at > -1 ? index.slice(index.lastIndexOf('<a', at), index.indexOf('</a>', at)) : '';
  const badge = strip(cardHtml.match(/<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '');
  const category = (badge.match(/\b(Vision|Connectors|Syria|Trust|Product)\b/)?.[1] ?? 'vision').toLowerCase();
  const date = isoDate(strip(cardHtml)) ?? isoDate(strip(html)) ?? '2026-01-01';

  if (!title || !article) {
    console.log(`  ✗ ${slug}: could not find title or article body; migrate by hand`);
    continue;
  }
  const md = toMarkdown(article);
  const front = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description || title)}`,
    `category: ${category}`,
    `author: 'Shaheen Money'  # TODO: the real author's name`,
    `publishedAt: ${date}`,
    'draft: false',
    '---',
    '',
  ].join('\n');
  await write(`src/content/blog/en/${slug}.md`, front + md, `(${category}, ${date}, ${shape(md)})`);
}

// ── Legal ───────────────────────────────────────────────────────────────
console.log('Legal');
const legal = [
  ['/privacy-policy', 'en', 'privacy'],
  ['/terms-of-service', 'en', 'terms'],
  ['/privacy-policy-ar', 'ar', 'privacy'],
  ['/terms-of-service-ar', 'ar', 'terms'],
];
for (const [path, locale, doc] of legal) {
  const html = await get(path);
  const title = strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? doc);
  const text = strip(html);
  const version = text.match(/Version\s+([\d.]+)/i)?.[1] ?? text.match(/الإصدار\s+([\d.]+)/)?.[1] ?? '2.0';
  const effective = isoDate(text) ?? '2026-08-01';
  // Content lives after the <h1>, up to the site footer.
  const start = html.search(/<h1\b/i);
  const end = html.search(/<footer\b/i);
  const md = toMarkdown(html.slice(start, end > start ? end : undefined).replace(/<h1\b[\s\S]*?<\/h1>/i, ''));
  const front = [
    '---',
    `title: ${yaml(title)}`,
    `version: '${version}'`,
    `effectiveFrom: ${effective}`,
    'status: draft  # legal review: add the data controller and legal bases, then set approved',
    '---',
    '',
  ].join('\n');
  await write(`src/content/legal/${locale}/${doc}.md`, front + md, `(v${version}, ${effective}, ${shape(md)})`);
}

console.log(dryRun ? '\nDry run: nothing written.' : '\nDone. Review each file, then rebuild (legacy /blog/<slug> URLs now 301 to the new posts).');
