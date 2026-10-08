/**
 * Where the Operations Command Center lives.
 *
 * An unlisted path: it is in no navigation, footer, sitemap or robots file,
 * and the edge marks it noindex (scripts/postbuild.mjs). That is obscurity,
 * not security. Every byte of data the console shows comes from the admin
 * API, which must authenticate and authorise each request on the server
 * (ADMIN_AUTH_INTEGRATION.md). Someone who finds this path but has no
 * session sees the sign-in page and nothing else.
 *
 * To move it, rename src/pages/x7k9p-dashboard/ and change this constant;
 * every link in the console is built from it.
 *
 * Plain TypeScript with no imports, so scripts/postbuild.mjs can read it too.
 */
export const ADMIN_BASE = '/x7k9p-dashboard';
