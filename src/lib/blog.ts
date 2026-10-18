import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/config';

export type Post = CollectionEntry<'blog'>;

/** `en/syria-rising` → `syria-rising` */
export const postSlug = (post: Post): string => post.id.split('/').slice(1).join('/');
export const postLocale = (post: Post): Locale => post.id.split('/')[0] as Locale;

/** Published posts for a locale, newest first. Drafts show only in dev. */
export async function getPosts(locale: Locale): Promise<Post[]> {
  const posts = await getCollection(
    'blog',
    (p) => postLocale(p) === locale && (import.meta.env.DEV || !p.data.draft),
  );
  return posts.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

export const categoryLabel: Record<Post['data']['category'], Record<Locale, string>> = {
  vision: { en: 'Vision', ar: 'رؤية' },
  connectors: { en: 'Connectors', ar: 'الموصّلون' },
  trust: { en: 'Trust', ar: 'الثقة' },
  product: { en: 'Product', ar: 'المنتج' },
  syria: { en: 'Syria', ar: 'سوريا' },
};
