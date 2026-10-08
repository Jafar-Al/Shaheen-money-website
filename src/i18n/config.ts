import { SITE_URL } from '../config/site';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeMeta: Record<Locale, { dir: 'ltr' | 'rtl'; name: string; ogLocale: string }> = {
  en: { dir: 'ltr', name: 'English', ogLocale: 'en_US' },
  ar: { dir: 'rtl', name: 'العربية', ogLocale: 'ar_AR' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export const otherLocale = (locale: Locale): Locale => (locale === 'en' ? 'ar' : 'en');

/**
 * Every page that exists in both locales, exactly once. Navigation, the
 * sitemap, OG images and the link checker all derive from this list, so a
 * page cannot exist in one locale and 404 in the other.
 *
 * The site is five destinations in the main navigation - home, about,
 * business, blog, contact - plus the media/press kit and the pages the
 * footer needs (download, security, legal, accessibility). Everything the
 * earlier tree split across /how-it-works, /cash-out, /coverage, /pricing
 * and /help now lives as a section of the homepage, and every old URL
 * redirects into its new home (src/config/redirects.mjs).
 */
export const pages = {
  home: '/',
  about: '/about',
  business: '/business',
  businessApply: '/business/apply',
  blog: '/blog',
  media: '/media',
  contact: '/contact',
  getApp: '/get-the-app',
  security: '/security',
  privacy: '/legal/privacy',
  terms: '/legal/terms',
  cookies: '/legal/cookies',
  accessibility: '/accessibility',
} as const;
export type PageKey = keyof typeof pages;

/** Confirmation pages reached only after a form post; never indexed. */
export const utilityPages = {
  applicationReceived: '/business/apply/received',
  messageSent: '/contact/sent',
  formError: '/form-error',
} as const;
export type UtilityPageKey = keyof typeof utilityPages;

/** `/en`, `/en/about` — no trailing slash anywhere. */
export function localePath(locale: Locale, path: string): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function href(locale: Locale, key: PageKey | UtilityPageKey, hash?: string): string {
  const path = key in pages ? pages[key as PageKey] : utilityPages[key as UtilityPageKey];
  return localePath(locale, path) + (hash ? `#${hash}` : '');
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

/** Strip the locale prefix: `/ar/pricing` → `/pricing`, `/en` → `/`. */
export function pathWithoutLocale(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  const [, first, ...rest] = trimmed.split('/');
  if (!isLocale(first)) return trimmed;
  return rest.length ? `/${rest.join('/')}` : '/';
}

/** Same page, other language — the switcher never drops the visitor on a homepage. */
export function switchLocale(pathname: string, to: Locale): string {
  return localePath(to, pathWithoutLocale(pathname));
}

/** Reciprocal hreflang set for a locale-neutral path (audit M.3). */
export function alternates(path: string) {
  return [
    ...locales.map((l) => ({ hreflang: l, href: absoluteUrl(localePath(l, path)) })),
    { hreflang: 'x-default', href: absoluteUrl(localePath(defaultLocale, path)) },
  ];
}

export const localeStaticPaths = () => locales.map((locale) => ({ params: { locale } }));
