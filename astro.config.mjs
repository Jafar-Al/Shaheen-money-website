// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import securityHeaders from './integrations/security-headers.mjs';
import contentGaps from './integrations/content-gaps.mjs';
import { legacyRedirects } from './src/config/redirects.mjs';

/**
 * Optional cookieless analytics (audit K-07/K-09). Nothing loads unless both
 * variables are set; their origin is then added to the CSP automatically.
 */
// The dev server injects styles and scripts inline, which a hash-based CSP
// blocks (the page renders unstyled). CSP is a production concern: it is
// verified against the real build by scripts/check-dist.mjs and the tests.
const isDev = process.argv.includes('dev');

const analyticsSrc = process.env.PUBLIC_ANALYTICS_SCRIPT_SRC;
const analyticsOrigin = analyticsSrc?.startsWith('https://') ? new URL(analyticsSrc).origin : null;

// Unicode ranges match the subsets scripts/build-fonts.mjs writes, so a
// face is only ever fetched for characters it actually carries.
/** @type {[string, ...string[]]} */
const LATIN = ['U+0020-007E', 'U+00A0-00FF', 'U+2010-2027', 'U+2030-203A', 'U+20AC', 'U+2122', 'U+2190-2197', 'U+2212', 'U+2715'];
/** @type {[string, ...string[]]} */
const ARABIC = ['U+0621-063A', 'U+0640-0652', 'U+0670', 'U+060C', 'U+061B', 'U+061F', 'U+200C-200F'];
/** @type {[string, ...string[]]} */
const ARABIC_LATIN = [...ARABIC, ...LATIN];

export default defineConfig({
  site: 'https://shaheen.money',
  output: 'static',
  adapter: vercel({
    // Emits each prerendered page's CSP (with Astro's script/style hashes)
    // as a real response header instead of a <meta> tag.
    staticHeaders: true,
  }),
  integrations: [securityHeaders(), contentGaps()],
  redirects: legacyRedirects,
  trailingSlash: 'ignore',
  compressHTML: true,
  // Each page's CSS travels inside its HTML (Astro hashes it into the page's
  // CSP): no render-blocking stylesheet requests between the document and
  // the first paint. Pages carry 12–25 KB of it, compressed.
  build: { inlineStylesheets: 'always' },
  // Scoped styles travel with a `class` passed to a child component, so a
  // parent can place and size the components it uses (Stamp, Slip, Icon…).
  scopedStyleStrategy: 'class',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },

  security: {
    checkOrigin: true,
    csp: isDev ? false : {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src 'self'${analyticsOrigin ? ` ${analyticsOrigin}` : ''}`,
        // frame-src is left to default-src; form pages add Turnstile's origin per page.
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "manifest-src 'self'",
        "worker-src 'none'",
        'upgrade-insecure-requests',
      ],
      scriptDirective: { resources: ["'self'", ...(analyticsOrigin ? [analyticsOrigin] : [])] },
      styleDirective: { resources: ["'self'"] },
    },
  },

  fonts: [
    // Display (Latin): one italic word per headline, so both styles ship.
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument-serif',
      fallbacks: ['ui-serif', 'Georgia', 'serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/instrument-serif-400.woff2'], weight: 400, style: 'normal', unicodeRange: LATIN },
          { src: ['./src/assets/fonts/instrument-serif-400-italic.woff2'], weight: 400, style: 'italic', unicodeRange: LATIN },
        ],
      },
    },
    // UI and body (Latin).
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/instrument-sans-latin-wght.woff2'], weight: '400 700', style: 'normal', unicodeRange: LATIN },
        ],
      },
    },
    // Figures, codes, dates, coordinates and source lines, in both locales.
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [{ src: ['./src/assets/fonts/geist-mono-400.woff2'], weight: 400, style: 'normal', unicodeRange: LATIN }],
      },
    },
    // Display (Arabic): chosen by specimen test against Instrument Serif
    // (docs/DESIGN.md). No generic fallback: the stack continues into Plex.
    {
      provider: fontProviders.local(),
      name: 'Noto Naskh Arabic',
      cssVariable: '--font-naskh',
      fallbacks: [],
      options: {
        variants: [{ src: ['./src/assets/fonts/noto-naskh-arabic-500.woff2'], weight: 500, style: 'normal', unicodeRange: ARABIC }],
      },
    },
    // UI and body (Arabic), with its own Latin for brand and store names.
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans Arabic',
      cssVariable: '--font-plex-arabic',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/ibm-plex-sans-arabic-400.woff2'], weight: 400, style: 'normal', unicodeRange: ARABIC_LATIN },
          { src: ['./src/assets/fonts/ibm-plex-sans-arabic-600.woff2'], weight: 600, style: 'normal', unicodeRange: ARABIC_LATIN },
        ],
      },
    },
  ],

  markdown: {
    // Shiki writes inline style attributes, which the CSP rightly blocks.
    // The blog has no code samples; switch to 'prism' if it ever needs them.
    syntaxHighlight: false,
  },

  image: {
    // Photographs are delivered as AVIF/WebP via <Picture>; see src/components/media/Photo.astro.
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 55 }, webp: { quality: 72 } } },
  },

  env: {
    schema: {
      // Preview builds show dashed "content needed" markers where facts are missing.
      PUBLIC_SHOW_CONTENT_GAPS: envField.boolean({ context: 'client', access: 'public', default: false }),

      // Cookieless analytics (e.g. Plausible or Umami, ideally proxied first-party).
      PUBLIC_ANALYTICS_SCRIPT_SRC: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_ANALYTICS_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),

      // Cloudflare Turnstile — optional anti-automation on the two forms.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Where form submissions go. At least one sink must be configured in production.
      FORMS_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      FORMS_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      FORMS_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      FORMS_EMAIL_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Shared rate-limit store (Upstash Redis REST). Without it, limits are per-instance.
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
