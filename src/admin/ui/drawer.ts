/**
 * The record drawer (src/components/admin/Drawer.astro): a native modal
 * <dialog>, so focus is held inside it, Escape closes it, the page behind
 * is inert, and focus returns to what opened it. Its body is a data region
 * with the same loading, empty and error states as the page.
 */
import { need } from './dom';
import { load, region, type Region } from './region';

export interface Drawer {
  open: <T>(kicker: string, fetcher: (signal: AbortSignal) => Promise<T>, render: (data: T, content: HTMLElement) => void) => void;
  close: () => void;
  onClose: (fn: () => void) => void;
  isOpen: () => boolean;
}

let instance: Drawer | null = null;

export function drawer(): Drawer {
  if (instance) return instance;
  const dialog = need<HTMLDialogElement>('[data-drawer]');
  const kicker = need('[data-drawer-kicker]', dialog);
  const closeBtn = need<HTMLButtonElement>('[data-drawer-close]', dialog);
  const r: Region = region('drawer', dialog);
  const listeners: Array<() => void> = [];

  closeBtn.addEventListener('click', () => dialog.close());
  // A click on the backdrop (the dialog box itself, outside its content) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    for (const fn of listeners) fn();
  });

  instance = {
    open(label, fetcher, render) {
      kicker.textContent = label;
      dialog.setAttribute('aria-label', label);
      if (!dialog.open) dialog.showModal();
      closeBtn.focus();
      need('.ops-drawer-body', dialog).scrollTop = 0;
      void load(r, fetcher, (data) => {
        render(data, r.content);
        const title = r.content.querySelector('h2');
        if (title?.id) {
          dialog.removeAttribute('aria-label');
          dialog.setAttribute('aria-labelledby', title.id);
        }
      });
    },
    close: () => dialog.close(),
    onClose: (fn) => listeners.push(fn),
    isOpen: () => dialog.open,
  };
  return instance;
}
