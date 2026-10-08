import type { APIRoute } from 'astro';
import { contact, SITE_URL } from '../../config/site';

/**
 * RFC 9116 security.txt (audit K-08). "Expires" is set one year from the
 * build, capped by the RFC's advice to stay under a year: every deploy
 * refreshes it, so an unmaintained site eventually signals that it is stale.
 */
export const GET: APIRoute = () => {
  const expires = new Date(Date.now() + 360 * 24 * 60 * 60 * 1000);
  const body = [
    `Contact: mailto:${contact.securityEmail}`,
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: en, ar',
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${SITE_URL}/en/security`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
