/**
 * Cookieless, first-party-friendly analytics (audit K-07 / K-09), loaded
 * after `load` so it never competes with the page. Nothing loads unless both
 * variables are set at build time; the script's origin is then added to the
 * CSP by astro.config.mjs.
 *
 * Works with Plausible or Umami style tags (script src + data-domain). If you
 * ever switch to a tool that sets cookies, it must sit behind a consent
 * decision instead (audit L.5 #14).
 */
import { PUBLIC_ANALYTICS_DOMAIN, PUBLIC_ANALYTICS_SCRIPT_SRC } from 'astro:env/client';

const src = PUBLIC_ANALYTICS_SCRIPT_SRC;
const domain = PUBLIC_ANALYTICS_DOMAIN;

if (src && domain) {
  const load = () => {
    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    script.dataset.domain = domain;
    document.head.append(script);
  };
  if (document.readyState === 'complete') load();
  else addEventListener('load', load, { once: true });
}
