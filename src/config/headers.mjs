/**
 * Response headers applied at the edge to every response (audit K.12).
 *
 * The Content-Security-Policy is NOT here: Astro computes it per page with
 * hashes of the exact scripts and styles on that page, and the Vercel adapter
 * emits it as a header (astro.config.mjs → security.csp + staticHeaders).
 * A single static CSP with a `nonce-{NONCE}` placeholder, as sketched in the
 * audit, cannot work on a static host — nothing would ever substitute it.
 *
 * Used by scripts/postbuild.mjs (production) and the dev-server integration.
 */

// Flip to true only after confirming EVERY subdomain of shaheen.money serves
// HTTPS (audit K-06), then submit the domain at https://hstspreload.org.
// Browsers remember includeSubDomains/preload for the full max-age (2 years);
// it cannot be withdrawn quickly if a subdomain turns out to be HTTP-only.
export const HSTS_COVER_SUBDOMAINS = false;

export const securityHeaders = {
  'Strict-Transport-Security': HSTS_COVER_SUBDOMAINS
    ? 'max-age=63072000; includeSubDomains; preload'
    : 'max-age=63072000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Share images and icons must be embeddable by chat apps and social
 * networks that render them in their own web clients.
 */
export const embeddablePaths = ['^/og/(.*)$', '^/favicon(.*)$', '^/apple-touch-icon(.*)$', '^/icon-(.*)$'];
