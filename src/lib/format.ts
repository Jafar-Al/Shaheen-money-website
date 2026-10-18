import type { Locale } from '../i18n/config';

/**
 * Western digits in both locales (the digits the current Arabic site and the
 * app use), with Levantine month names for Arabic.
 */
const intlLocale: Record<Locale, string> = { en: 'en-US', ar: 'ar-JO-u-nu-latn' };

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** ISO date/partial date → "September 2025" / "أيلول 2025"; a bare year stays a year. */
export function formatAsOf(asOf: string, locale: Locale): string {
  if (/^\d{4}$/.test(asOf)) return asOf;
  const [y, m = '01', d] = asOf.split('-');
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d ?? 1)));
  const opts: Intl.DateTimeFormatOptions = d
    ? { dateStyle: 'long', timeZone: 'UTC' }
    : { month: 'long', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(intlLocale[locale], opts).format(date);
}

export function formatNumber(n: number, locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatUsd(n: number, locale: Locale): string {
  const whole = Number.isInteger(n);
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(n: number, locale: Locale): string {
  return `${formatNumber(n, locale, Number.isInteger(n) ? 0 : 2)}%`;
}

/** ~200 wpm for English, ~150 for Arabic; never below one minute. */
export function readingMinutes(text: string, locale: Locale): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / (locale === 'ar' ? 150 : 200)));
}
