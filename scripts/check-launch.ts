/**
 * Launch readiness: everything the site needs from the company before it
 * replaces shaheen.money. The build never invents these; sections that
 * depend on them are simply omitted until they exist.
 *
 *   npm run check:launch
 *
 * BLOCKER  must be done before launch (exit code 1)
 * SHOULD   the page works without it, but the audit calls it out
 * NOTE     a decision or setting to confirm
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { facts } from '../src/data/facts.ts';
import { HSTS_COVER_SUBDOMAINS } from '../src/config/headers.mjs';
import { contact, stores } from '../src/config/site.ts';
import { documentSlots } from '../src/data/media.ts';

type Level = 'BLOCKER' | 'SHOULD' | 'NOTE';
const items: Array<{ level: Level; what: string; where: string }> = [];
const add = (level: Level, what: string, where = 'src/data/facts.ts') => items.push({ level, what, where });

// ── Trust layer (audit A.9 §5, P-02, F.3 rule 6) ─────────────────────────
const c = facts.company;
if (!c.legalName || !c.registrationNumber || !c.registeredAddress || !c.jurisdiction)
  add('BLOCKER', 'Registered entity: legal name, company number, registered address, jurisdiction (footer on every page)');
if (facts.licences.length === 0) add('BLOCKER', 'Licence / registration with regulator, number and public register link');
if (!facts.safeguarding) add('BLOCKER', 'How customer funds are held (trust strip + security page)');
if (!facts.digitalDollar) add('BLOCKER', 'What a digital dollar is and what backs it (homepage "How it works" + /security)');
else
  add(
    'SHOULD',
    'Name the stablecoin the wallet actually holds and its issuer. The published definition is generic and sourced to the Federal Reserve; which token it is, and who publishes its reserves, is a company fact',
  );

// ── Homepage sections that are empty without data ──────────────────────
if (!facts.pricing.schedule) add('BLOCKER', 'Fee schedule for the homepage "What it costs" section ("Low fees" must be substantiated, audit A.5 #5)');
if (!facts.coverage) add('SHOULD', 'Verified country list. The globe shows example corridors and the FAQ tells people to ask us; a published list is better');
add('SHOULD', 'Cash-out fee. Receiving, sending and paying are published as free; the table is silent on cash-out, which is the one that may cost the customer money');
if (!facts.pricing.comparison) add('SHOULD', 'Pricing comparison table (homepage "What it costs"), real figures with a date');
if (!facts.pricing.minCashOutUsd) add('SHOULD', 'Minimum cash-out amount (homepage "Cash out", hero evidence row)');

// ── Business funnel (audit A.5 #1) ──────────────────────────────────────
if (!facts.connectorProgram.commissionPercent) add('SHOULD', 'Connector commission % (homepage + /business)');
if (!facts.connectorProgram.eligibility) add('SHOULD', 'Who can become a Connector (/business)');

// ── Proof (audit P-09) ───────────────────────────────────────────────────
if (!facts.ratings.ios && !facts.ratings.android) add('SHOULD', 'App Store / Google Play ratings with review counts and a date');
if (facts.testimonials.length === 0) add('SHOULD', 'Two or three consented, attributed testimonials');
if (!facts.connectorStory) add('SHOULD', "One Connector's story (name, photo, place, consent)");
if (!facts.network.activeConnectors || !facts.network.countries)
  add('SHOULD', 'Network figures: active Connectors and countries, dated');
for (const p of facts.team) {
  if (!p.photo) add('SHOULD', `Photo of ${p.name} (consented)`);
  if (!p.nameAr) add('SHOULD', `Arabic spelling of ${p.name}`);
}
if (facts.press.length === 0)
  add('SHOULD', 'Press coverage: outlet, headline, URL and date for anything written about the company');

// ── Brand and media (/media) ─────────────────────────────────────────────
// The falcon is the only mark we hold as a vector, and it was traced from a
// 239px PNG rather than drawn. Everything else a journalist or a partner
// asks for is still missing.
const tracedFalcon = existsSync(new URL('../brand-source/logo-VONDYK1c.png', import.meta.url));
if (tracedFalcon)
  add(
    'SHOULD',
    'Vector master of the full logo lockup (falcon + "Shaheen Money" wordmark). The site only holds the falcon, traced from a 239px PNG; the wordmark is set in live type and cannot be handed to anyone as a file',
    'src/assets/brand/ + brand-source/',
  );
add('SHOULD', 'App screenshots for /media and the app store listings (real screens, no invented balances)', 'public/media/');

// ── Content ──────────────────────────────────────────────────────────────
const list = async (dir: string) => {
  try {
    return (await readdir(new URL(`../src/content/${dir}`, import.meta.url))).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
};
const [blogEn, blogAr] = await Promise.all([list('blog/en'), list('blog/ar')]);
if (blogEn.length === 0) add('BLOCKER', 'Blog posts: run `npm run import:legacy`, then review each post', 'src/content/blog/en/');
if (blogAr.length === 0) add('SHOULD', 'Arabic blog posts (same slug as the English file)', 'src/content/blog/ar/');

for (const locale of ['en', 'ar']) {
  for (const doc of ['privacy', 'terms', 'cookies']) {
    const file = new URL(`../src/content/legal/${locale}/${doc}.md`, import.meta.url);
    const text = await readFile(file, 'utf8').catch(() => null);
    // Owned outside this project: the site is the front end, and the legal
    // documents are a separate workstream on the company's side. The pages
    // handle a draft gracefully (banner, noindex, excluded from the
    // sitemap), so this is tracked, not blocking.
    if (text === null) add('SHOULD', `Legal document missing: ${doc} (${locale})`, `src/content/legal/${locale}/${doc}.md`);
    else if (/^status:\s*draft/m.test(text))
      add('SHOULD', `Legal review pending: ${doc} (${locale}) is still status: draft`, `src/content/legal/${locale}/${doc}.md`);
  }
}

// ── Operations ───────────────────────────────────────────────────────────
const env = process.env;
const formsConfigured = Boolean(env.FORMS_WEBHOOK_URL || (env.RESEND_API_KEY && env.FORMS_EMAIL_TO && env.FORMS_EMAIL_FROM));
if (!formsConfigured) add('BLOCKER', 'Form delivery on Vercel: FORMS_WEBHOOK_URL (+ FORMS_WEBHOOK_SECRET) and/or RESEND_API_KEY + FORMS_EMAIL_TO + FORMS_EMAIL_FROM. Without one, forms answer "temporarily unavailable".', 'Vercel → Settings → Environment Variables');
if (!env.UPSTASH_REDIS_REST_URL) add('SHOULD', 'Shared rate limiting: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN', 'Vercel → Environment Variables');
if (!env.PUBLIC_TURNSTILE_SITE_KEY) add('SHOULD', 'Bot protection on forms: PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY', 'Vercel → Environment Variables');
if (!HSTS_COVER_SUBDOMAINS)
  add('NOTE', 'HSTS covers shaheen.money only. After confirming every subdomain serves HTTPS, flip HSTS_COVER_SUBDOMAINS and submit to hstspreload.org', 'src/config/headers.mjs');
if (contact.securityEmail === contact.email)
  add('NOTE', `security.txt points to ${contact.email}; a monitored security@ mailbox is better`, 'src/config/site.ts');
if (stores.ios.includes('Empowch')) add('NOTE', 'The App Store link still carries the old "Empowch W Arabic" campaign token', 'src/config/site.ts');
add('NOTE', 'Globe corridors are examples; confirm the city list reflects corridors you serve', 'src/data/network-map.ts');

// ── Media and company documents (/media, /business) ───────────────────
for (const slot of documentSlots) {
  if (!slot.file) add('SHOULD', `${slot.title.en} PDF: drop it into public/media/ and set its \`file\``, 'src/data/media.ts');
}

// ── Report ───────────────────────────────────────────────────────────────
const order: Level[] = ['BLOCKER', 'SHOULD', 'NOTE'];
for (const level of order) {
  const group = items.filter((i) => i.level === level);
  if (!group.length) continue;
  console.log(`\n${level} (${group.length})`);
  for (const i of group) console.log(`  · ${i.what}\n      → ${i.where}`);
}
const blockers = items.filter((i) => i.level === 'BLOCKER').length;
console.log(blockers ? `\n${blockers} blocker(s) before launch.` : '\nReady to launch.');
process.exit(blockers ? 1 : 0);
