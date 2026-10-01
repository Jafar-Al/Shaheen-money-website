/**
 * Pricing.astro, in the browser. Bundled with the rest of the homepage's
 * behaviour (src/scripts/home/index.ts) so the page makes one request for it.
 */
// Redo the page's arithmetic with any numbers: fee + margin × amount, and
// that as a share of the amount. Nothing here is a Shaheen Money price.
for (const form of document.querySelectorAll<HTMLFormElement>('[data-calc]')) {
  const lang = document.documentElement.lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-US';
  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  const pct = (n: number) => `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n)}%`;
  const out = (sel: string) => form.querySelector<HTMLElement>(sel);
  const read = (name: string) => Math.max(0, Number((form.elements.namedItem(name) as HTMLInputElement | null)?.value) || 0);

  const update = () => {
    const amount = read('amount');
    const fee = read('fee');
    const margin = Math.min(100, read('margin'));
    const marginUsd = Math.round(amount * margin) / 100;
    const total = Math.round((fee + marginUsd) * 100) / 100;
    const feeEl = out('[data-calc-fee]');
    const marginEl = out('[data-calc-margin]');
    const totalEl = out('[data-calc-total]');
    const shareEl = out('[data-calc-share]');
    if (feeEl) feeEl.textContent = usd(fee);
    if (marginEl) marginEl.textContent = usd(marginUsd);
    if (totalEl) totalEl.textContent = usd(total);
    if (shareEl) shareEl.textContent = amount > 0 ? pct(Math.round((total / amount) * 1000) / 10) : '—';
  };
  form.addEventListener('input', update);
  form.addEventListener('submit', (event) => event.preventDefault());
}

export {};
