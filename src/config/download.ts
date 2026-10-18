import type { Locale } from '../i18n/config';

/**
 * Universal download link. One URL for every campaign, poster and QR code:
 * the edge sends phones to the right store and everyone else to
 * /<locale>/get-the-app (see scripts/postbuild.mjs).
 */
export const DOWNLOAD_URL = 'https://shaheen.money/download';

export const downloadPath = (locale: Locale): string => (locale === 'ar' ? '/ar/download' : '/download');
