/**
 * Runs after `astro build` (see package.json). Writes the edge rules into
 * Vercel's Build Output config, ahead of every other route:
 *   1. the sitewide security headers (audit K.12), for pages, assets,
 *      redirects and the 404 alike;
 *   2. the universal /download link, which sends phones to their store.
 *
 * Deterministic on purpose: it does not depend on how vercel.json is merged
 * with framework output, and the result can be inspected locally in
 * .vercel/output/config.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { securityHeaders, embeddablePaths } from '../src/config/headers.mjs';
import { stores } from '../src/config/site.ts';

const configUrl = new URL('../.vercel/output/config.json', import.meta.url);
const config = JSON.parse(await readFile(configUrl, 'utf8'));

// Anything other than the production deployment must stay out of search
// results (audit L.5 #22). Local builds mimic production.
const env = process.env.VERCEL_ENV;
const isPublicDeployment = !env || env === 'production';

const sitewide = { ...securityHeaders };
if (!isPublicDeployment) sitewide['X-Robots-Tag'] = 'noindex, nofollow';

const marker = 'shaheen:edge';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`);

const routes = (config.routes ?? [])
  .filter((r) => r.__source !== marker)
  // Astro's per-page CSP routes are plain pathnames, added after Vercel's
  // route normalisation. Anchor them so "/en" cannot match "/en/blog", and
  // accept the trailing-slash form so "/en/" gets the same policy.
  .map((r) => {
    if (!r.headers?.['content-security-policy'] || !r.src || r.src.startsWith('^')) return r;
    const path = r.src.length > 1 ? r.src.replace(/\/$/, '') : r.src;
    return { ...r, src: path === '/' ? '^/$' : `^${escapeRegex(path)}/?$` };
  });

const headerRoutes = [
  { src: '^/(.*)$', headers: sitewide, continue: true },
  ...embeddablePaths.map((src) => ({
    src,
    headers: { 'Cross-Origin-Resource-Policy': 'cross-origin' },
    continue: true,
  })),
];

// One download link for every button and poster: phones go straight to their
// store, everything else to the get-the-app page (both stores).
const noStore = { 'Cache-Control': 'private, no-store', Vary: 'User-Agent' };
const download = '^/(?:(?:en|ar)/)?download/?$';
const downloadRoutes = [
  {
    src: download,
    has: [{ type: 'header', key: 'user-agent', value: '.*(iPhone|iPad|iPod).*' }],
    headers: { ...noStore, Location: stores.ios },
    status: 302,
  },
  {
    src: download,
    has: [{ type: 'header', key: 'user-agent', value: '.*Android.*' }],
    headers: { ...noStore, Location: stores.android },
    status: 302,
  },
  { src: '^/ar/download/?$', headers: { ...noStore, Location: '/ar/get-the-app' }, status: 302 },
  { src: download, headers: { ...noStore, Location: '/en/get-the-app' }, status: 302 },
];

config.routes = [...headerRoutes, ...downloadRoutes].map((r) => ({ ...r, __source: marker })).concat(routes);

// Vercel ignores unknown keys, but keep the file clean for inspection.
const serialised = JSON.stringify(config, (k, v) => (k === '__source' ? undefined : v), 2);
await writeFile(configUrl, serialised);

const csp = routes.filter((r) => r.headers?.['content-security-policy']).length;
console.log(
  `postbuild: edge rules on ${isPublicDeployment ? 'production' : `${env} (noindex)`} build; ` +
    `${csp} page-level CSP routes from Astro.`,
);
if (csp === 0) {
  console.error('postbuild: no per-page CSP headers found — is security.csp enabled with staticHeaders?');
  process.exit(1);
}
