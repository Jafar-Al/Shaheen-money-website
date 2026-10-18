import { locales, pages, localePath } from '../src/i18n/config';

/** Every page in both locales, from the same registry the site is built from. */
export const allPaths = locales.flatMap((locale) => Object.values(pages).map((path) => localePath(locale, path)));

/** A representative set for the heavier layout checks. */
export const keyPaths = [
  '/en',
  '/ar',
  '/en/business',
  '/ar/business/apply',
  '/en/media',
  '/ar/about',
  '/ar/security',
  '/en/contact',
];
