import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { getPosts, postSlug } from '../../lib/blog';
import { locales, pages, type Locale, type PageKey } from '../../i18n/config';
import { common } from '../../copy/common';
import { home } from '../../copy/home';
import { security, about } from '../../copy/trust';
import { business, media } from '../../copy/business';
import { apply, contactPage } from '../../copy/support';
import { blog } from '../../copy/blog';
import { getApp, accessibility } from '../../copy/misc';

/** One 1200×630 image per page, per language, per blog post — generated at build. */
function titleFor(key: PageKey, l: Locale): string {
  const titles: Record<PageKey, string> = {
    home: home[l].hero.title.join('\n'),
    about: about[l].title,
    business: business[l].title,
    businessApply: apply[l].title,
    blog: blog[l].title,
    media: media[l].title,
    contact: contactPage[l].title,
    getApp: getApp[l].title,
    security: security[l].title,
    privacy: common[l].footer.privacy,
    terms: common[l].footer.terms,
    cookies: common[l].footer.cookies,
    accessibility: accessibility[l].title,
  };
  return titles[key];
}

export const getStaticPaths = (async () => {
  const paths: Array<{ params: { slug: string }; props: { locale: Locale; title: string } }> = [];
  for (const locale of locales) {
    for (const [key, path] of Object.entries(pages) as Array<[PageKey, string]>) {
      paths.push({
        params: { slug: `${locale}${path === '/' ? '/index' : path}` },
        props: { locale, title: titleFor(key, locale) },
      });
    }
    for (const post of await getPosts(locale)) {
      paths.push({ params: { slug: `${locale}/blog/${postSlug(post)}` }, props: { locale, title: post.data.title } });
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as { locale: Locale; title: string });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
