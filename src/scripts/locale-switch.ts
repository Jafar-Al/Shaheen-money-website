/**
 * LocaleSwitch.astro, in the browser: the segment slides as the language
 * changes, and comes back if the visitor returns through the back button.
 */
for (const group of document.querySelectorAll<HTMLElement>('[data-locale-switch]')) {
  group.querySelector('[data-lang-link]')?.addEventListener('click', () => group.classList.add('is-switching'));
}
// Coming back through the back/forward cache: undo the half-finished switch.
window.addEventListener('pageshow', () => {
  for (const group of document.querySelectorAll('[data-locale-switch]')) group.classList.remove('is-switching');
});

export {};
