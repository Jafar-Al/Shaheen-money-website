import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { absoluteUrl, alternates, defaultLocale, localePath, locales, pages, type PageKey } from '../i18n/config';
import { getPosts, postSlug } from '../lib/blog';

/**
 * Every indexable URL in both locales, each with its reciprocal hreflang
 * alternates and x-default (audit M.3). A legal page whose document is
 * missing renders noindex, and is left out.
 */
export const GET: APIRoute = async () => {
  const skip = new Set<PageKey>();
  for (const doc of ['privacy', 'terms', 'cookies'] as const) {
    const entries = await Promise.all(locales.map((l) => getEntry('legal', `${l}/${doc}`)));
    if (entries.some((e) => !e)) skip.add(doc);
  }

  const urls: string[] = [];
  const entry = (path: string, locale: string, links: Array<{ hreflang: string; href: string }>, lastmod?: Date) =>
    `  <url>\n    <loc>${absoluteUrl(localePath(locale as never, path))}</loc>\n${
      lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` : ''
    }${links.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('\n')}\n  </url>`;

  for (const [key, path] of Object.entries(pages) as Array<[PageKey, string]>) {
    if (skip.has(key)) continue;
    for (const locale of locales) urls.push(entry(path, locale, alternates(path)));
  }

  const postsByLocale = await Promise.all(locales.map((l) => getPosts(l)));
  locales.forEach((locale, i) => {
    for (const post of postsByLocale[i]!) {
      const slug = postSlug(post);
      const path = `/blog/${slug}`;
      const twins = locales.filter((_, j) => postsByLocale[j]!.some((p) => postSlug(p) === slug));
      const links =
        twins.length === locales.length
          ? alternates(path)
          : [{ hreflang: locale, href: absoluteUrl(localePath(locale, path)) }];
      if (twins.length === locales.length && !twins.includes(defaultLocale)) links.pop();
      urls.push(entry(path, locale, links, post.data.updatedAt ?? post.data.publishedAt));
    }
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
