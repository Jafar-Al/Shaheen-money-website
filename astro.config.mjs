// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import securityHeaders from './integrations/security-headers.mjs';
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

// Latin subset as published by Fontsource, so English pages never fetch
// the Arabic face and Arabic pages only fetch Inter for digits and Latin.
/** @type {[string, ...string[]]} */
const LATIN = [
  'U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC',
  'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193',
  'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD',
];
/** @type {[string, ...string[]]} */
const ARABIC = ['U+0600-06FF', 'U+FE70-FEFC', 'U+200C-200F'];

export default defineConfig({
  site: 'https://shaheen.money',
  output: 'static',
  adapter: vercel({
    // Emits each prerendered page's CSP (with Astro's script/style hashes)
    // as a real response header instead of a <meta> tag.
    staticHeaders: true,
  }),
  integrations: [securityHeaders()],
  redirects: legacyRedirects,
  trailingSlash: 'ignore',
  compressHTML: true,
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
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/inter-latin-wght.woff2'], weight: '100 900', style: 'normal', unicodeRange: LATIN },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/instrument-sans-latin-wght.woff2'], weight: '400 700', style: 'normal', unicodeRange: LATIN },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans Arabic',
      cssVariable: '--font-plex-arabic',
      // No generic fallback here: the stack continues into Inter (tokens.css),
      // which must win for digits and Latin inside Arabic text.
      fallbacks: [],
      options: {
        variants: [
          { src: ['./src/assets/fonts/ibm-plex-sans-arabic-core-400.woff2'], weight: 400, style: 'normal', unicodeRange: ARABIC },
          { src: ['./src/assets/fonts/ibm-plex-sans-arabic-core-700.woff2'], weight: 700, style: 'normal', unicodeRange: ARABIC },
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
