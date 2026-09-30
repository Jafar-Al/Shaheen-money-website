/**
 * One download button that knows the device (audit P-01, and the brief):
 *   iOS / iPadOS → App Store, Android → Google Play, anything else → QR dialog.
 *
 * The platform was already decided before first paint, by the inline script
 * in src/layouts/BaseLayout.astro, which is why the button's label and icon
 * never shift. This module reads that answer off <html data-platform>
 * instead of working it out again: one rule, in one place, so the label a
 * visitor sees and the store the link opens can never disagree.
 *
 * All this layer adds is pointing every [data-smart-download] link straight
 * at the store, saving the /download redirect hop. Without JavaScript the
 * links still reach /download, which the edge resolves by user agent
 * (scripts/postbuild.mjs).
 */
import { stores } from '../config/site';

type Platform = keyof typeof stores;

const isPlatform = (value: string | undefined): value is Platform => value === 'ios' || value === 'android';

const detected = document.documentElement.dataset.platform;
// Unset means the inline script did not run: fall back to the QR dialog,
// which works on any device, rather than guessing at a store.
const platform: Platform | null = isPlatform(detected) ? detected : null;

const dialog = document.getElementById('download-dialog') as HTMLDialogElement | null;
let trigger: HTMLElement | null = null;

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-smart-download]')) {
  if (platform) {
    link.href = stores[platform];
  } else if (dialog && typeof dialog.showModal === 'function') {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      trigger = link;
      dialog.showModal();
    });
  }
}

if (dialog) {
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the <dialog> element itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => trigger?.focus());
}
