/**
 * The Feather Line glyph set: 24×24 grid, 1.5 stroke, butt caps and mitred
 * joins, and a nib-cut tail on every arrow shaft (the angled terminal of a
 * feather's quill). Deliberately small: numerals, coordinates and words do
 * the work icons did before. No shields, globes, coins or checkmarks.
 *
 * Inner SVG markup only; rendered by Icon.astro, which strokes with
 * currentColor. A shape that must be filled says so itself.
 */
const shaftH = '<path fill="currentColor" stroke="none" d="M4 11.25h14.25v1.5H5.5z"/>';
const shaftV = '<path fill="currentColor" stroke="none" d="M11.25 4v14.25h1.5V5.5z"/>';

export const icons = {
  'arrow-right': `${shaftH}<path d="M13.25 6.75 18.5 12l-5.25 5.25"/>`,
  'arrow-down': `${shaftV}<path d="M6.75 13.25 12 18.5l5.25-5.25"/>`,
  'arrow-up-right': '<path fill="currentColor" stroke="none" d="M6.47 16.47 16.2 6.74l1.06 1.06-9.73 9.73-1.25.19z"/><path d="M9.25 6.75h8v8"/>',
  plus: '<path d="M12 4.5v15M4.5 12h15"/>',
  minus: '<path d="M4.5 12h15"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M3.5 9h17M3.5 15h17"/>',
  download: `<path fill="currentColor" stroke="none" d="M11.25 3.5v11.25h1.5V5z"/><path d="M7.25 10.5 12 15.25l4.75-4.75M4.5 19.75h15"/>`,
  mail: '<path d="M3.5 5.75h17v12.5h-17z"/><path d="m3.75 6.25 8.25 6.5 8.25-6.5"/>',
  phone: '<path d="M7.25 2.75h9.5v18.5h-9.5z"/><path d="M10.75 18h2.5"/>',
  pin: '<path d="M12 21.25S5.75 15.6 5.75 10.25a6.25 6.25 0 0 1 12.5 0C18.25 15.6 12 21.25 12 21.25z"/><path d="M12 12.25a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  file: '<path d="M5.75 2.75h8.5l4 4v14.5H5.75z"/><path d="M14 2.75v4.25h4.25M8.75 12h6.5M8.75 15.5h6.5"/>',
} as const;

export type IconName = keyof typeof icons;
