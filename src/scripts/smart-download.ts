/**
 * One download button that knows the device (audit P-01, and the brief):
 *   iPhone / iPad → App Store, Android → Google Play, and a computer → the
 * "Get the app" page with both stores. No pop-up, no choice to make on a
 * phone.
 *
 * The platform was already decided before first paint, by the inline script
 * in src/layouts/BaseLayout.astro. This module reads that answer off
 * <html data-platform> instead of working it out again: one rule, in one
 * place. The button itself never names a platform (one label, one glyph on
 * every device), so nothing on the page can disagree with the store it opens.
 *
 * All this layer adds is pointing every [data-smart-download] link straight
 * at where it goes, saving the /download redirect hop. Without JavaScript
 * the links still reach /download, which the edge resolves by user agent
 * (scripts/postbuild.mjs).
 */
import { stores } from '../config/site';

const platform = document.documentElement.dataset.platform;

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-smart-download]')) {
  if (platform === 'ios') link.href = stores.ios;
  else if (platform === 'android') link.href = stores.android;
  else if (link.dataset.fallback) link.href = link.dataset.fallback;
}
