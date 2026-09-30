import { securityHeaders } from '../src/config/headers.mjs';

/**
 * Serves the production security headers from the dev server too, so a
 * framing or resource-policy problem shows up locally rather than after
 * deploy. Production headers are written by scripts/postbuild.mjs.
 * HSTS is omitted locally: it would pin localhost to HTTPS in the browser.
 */
export default function securityHeadersIntegration() {
  return {
    name: 'shaheen:security-headers',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        const { 'Strict-Transport-Security': _hsts, ...local } = securityHeaders;
        updateConfig({ server: { headers: local } });
      },
    },
  };
}
