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

/**
 * One 1200×630 image per page, per language, per blog post — generated at
 * build. Titles keep their *emphasis* markers (the image sets that word in
 * italic), and each image draws its page's own feather: the seeds match the
 * page heroes.
 */
function titleFor(key: PageKey, l: Locale): string {
  const titles: Record<PageKey, string> = {
    // The hero emphasises the last word of each line.
    home: home[l].hero.title.map((line) => line.replace(/(\S+)$/, '*$1*')).join('\n'),
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

const seeds: Record<PageKey, string> = {
  home: 'home',
  about: 'about',
  business: 'business',
  businessApply: 'business-apply',
  blog: 'blog',
  media: 'media',
  contact: 'contact',
  getApp: 'get-the-app',
  security: 'security',
  privacy: 'legal-privacy',
  terms: 'legal-terms',
  cookies: 'legal-cookies',
  accessibility: 'accessibility',
};

type Props = { locale: Locale; title: string; seed: string };

export const getStaticPaths = (async () => {
  const paths: Array<{ params: { slug: string }; props: Props }> = [];
  for (const locale of locales) {
    for (const [key, path] of Object.entries(pages) as Array<[PageKey, string]>) {
      paths.push({
        params: { slug: `${locale}${path === '/' ? '/index' : path}` },
        props: { locale, title: titleFor(key, locale), seed: seeds[key] },
      });
    }
    for (const post of await getPosts(locale)) {
      const slug = postSlug(post);
      paths.push({ params: { slug: `${locale}/blog/${slug}` }, props: { locale, title: post.data.title, seed: slug } });
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as Props);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
