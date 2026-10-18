import type { APIRoute } from 'astro';
import { SITE_URL } from '../config/site';

/**
 * Production allows crawling and points at the sitemap (audit M.2 #1).
 * Any other Vercel deployment (previews) is closed to crawlers; the edge also
 * sends X-Robots-Tag: noindex there (scripts/postbuild.mjs).
 */
export const GET: APIRoute = () => {
  const env = process.env.VERCEL_ENV;
  const isProduction = !env || env === 'production';
  const body = isProduction
    ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
