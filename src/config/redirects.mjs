/**
 * Legacy URL map (audit M.3). Every URL the old site served keeps working
 * and passes its equity to the new locale tree.
 *
 * `/` is a temporary redirect on purpose: it leaves room to add
 * Accept-Language negotiation later without browsers having cached a
 * permanent answer. Everything else is permanent.
 *
 * Old in-page anchors (/#download, #connector, #network) still resolve:
 * browsers carry the fragment across redirects and the new homepage keeps
 * elements with those ids.
 */
import { existsSync } from 'node:fs';

/** The eleven posts published on the old site (checked 23 Sep 2026). */
export const legacyPostSlugs = [
  'designing-for-access',
  'evolution-of-trust',
  'from-atm-to-connector',
  'future-of-trust-is-human',
  'human-blockchain',
  'inclusion-is-infrastructure',
  'mena-without-borders',
  'syria-rising',
  'trust-travels',
  'unleashing-mena',
  'value-pillars',
];

/**
 * A migrated post gets a permanent redirect to its new URL. Until it is
 * migrated (npm run import:legacy), the old URL lands on the blog index with
 * a temporary redirect, so nothing 404s and no browser caches a wrong answer.
 */
const postRedirects = Object.fromEntries(
  legacyPostSlugs.map((slug) => {
    const migrated = existsSync(new URL(`../content/blog/en/${slug}.md`, import.meta.url));
    return [
      `/blog/${slug}`,
      migrated ? { status: 301, destination: `/en/blog/${slug}` } : { status: 302, destination: '/en/blog' },
    ];
  }),
);

/**
 * Pages the site used to have that are now sections of the homepage or part
 * of /business. They were published on the new tree, so they keep working:
 * a permanent redirect to the anchor lands the visitor on the content they
 * asked for rather than on a menu.
 */
const mergedPaths = {
  '/how-it-works': '#how',
  '/cash-out': '#cash-out',
  '/coverage': '#network',
  '/pricing': '#pricing',
  '/help': '#faq',
};

const mergedPages = Object.fromEntries(
  ['en', 'ar'].flatMap((locale) => [
    ...Object.entries(mergedPaths).map(([from, hash]) => [
      `/${locale}${from}`,
      { status: 301, destination: `/${locale}${hash}` },
    ]),
    [`/${locale}/connectors`, { status: 301, destination: `/${locale}/business` }],
    [`/${locale}/connectors/apply`, { status: 301, destination: `/${locale}/business/apply` }],
    [`/${locale}/connectors/apply/received`, { status: 301, destination: `/${locale}/business/apply/received` }],
  ]),
);

/** @type {Record<string, { status: 301 | 302 | 308; destination: string }>} */
export const legacyRedirects = {
  '/': { status: 302, destination: '/en' },
  '/home-arabic': { status: 301, destination: '/ar' },
  '/about': { status: 301, destination: '/en/about' },
  '/blog': { status: 301, destination: '/en/blog' },
  ...postRedirects,
  '/contact': { status: 301, destination: '/en/contact' },
  '/privacy-policy': { status: 301, destination: '/en/legal/privacy' },
  '/privacy-policy-ar': { status: 301, destination: '/ar/legal/privacy' },
  '/terms-of-service': { status: 301, destination: '/en/legal/terms' },
  '/terms-of-service-ar': { status: 301, destination: '/ar/legal/terms' },
  ...mergedPages,
};
