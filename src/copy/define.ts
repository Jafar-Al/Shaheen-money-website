import type { Locale } from '../i18n/config';

/**
 * English and Arabic copy for one page, side by side. The Arabic must have
 * exactly the shape of the English (audit F.4 "Parity"): a missing or extra
 * key is a type error, so the two locales cannot drift into different pages.
 *
 * Register (audit F.4): warm Levantine for marketing and emotional copy;
 * Modern Standard Arabic for legal, security and pricing.
 */
export function defineCopy<T>(copy: { en: T; ar: NoInfer<T> }): Record<Locale, T> {
  return copy;
}
