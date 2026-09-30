/**
 * design/tokens.json → src/styles/tokens.css
 *
 *   npm run tokens              regenerate + verify
 *   npm run tokens -- --check   verify only; exit 1 if tokens.css is stale
 *
 * 1. Verifies every required colour pair against its WCAG threshold, and that
 *    every forbidden pair really does fail body-text contrast (so the rule
 *    stays justified).
 * 2. Refuses any colour whose hue falls in the banned purple band
 *    (255°–330°). The brand's old electric blue sat at 245° and read violet
 *    beside navy; nothing may drift further than that.
 * 3. Emits the Tailwind v4 theme. Each namespace is reset with `initial`
 *    first, so only token values exist as utilities: `rounded-xl`, `text-sm`
 *    or `shadow-2xl` simply do not generate. Arbitrary values are caught by
 *    scripts/lint-styles.mjs.
 * 4. Emits the two temperatures, .t-night and .t-paper, as sets of semantic
 *    custom properties (surface, fg, line, accent …). Components colour
 *    themselves from those, so one component renders correctly on either.
 */
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const tokens = JSON.parse(await readFile(new URL('design/tokens.json', root), 'utf8'));
const OUT = new URL('src/styles/tokens.css', root);
const checkOnly = process.argv.includes('--check');

// ── Colour maths ──────────────────────────────────────────────────────────
export function parse(c) {
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgba) return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  throw new Error(`Unparseable colour: ${c}`);
}
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});
const lin = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function ratio(fgName, bgName) {
  const white = parse('#ffffff');
  const bg = over(parse(tokens.color[bgName]), white);
  const fg = over(parse(tokens.color[fgName]), bg);
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** HSL hue in degrees, or null for greys (saturation too low to have a hue). */
export function hue({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  if (d < 0.02) return null;
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return (h * 60 + 360) % 360;
}

let failed = false;
const rows = [];
for (const [fg, bg, min] of tokens.contrast.require) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  rows.push(`${ok ? '  ok ' : ' FAIL'}  ${r.toFixed(2).padStart(5)}:1  ≥${String(min).padEnd(3)}  ${fg} on ${bg}`);
}
for (const [fg, bg] of tokens.contrast.forbid) {
  const r = ratio(fg, bg);
  const stillFails = r < 4.5;
  if (!stillFails) failed = true;
  rows.push(`${stillFails ? '  ban' : ' STALE'}  ${r.toFixed(2).padStart(5)}:1        ${fg} on ${bg}${stillFails ? '' : '  ← passes now; drop the ban'}`);
}
for (const [name, value] of Object.entries(tokens.color)) {
  const h = hue(parse(value));
  if (h !== null && h >= 255 && h <= 330) {
    failed = true;
    rows.push(` PURPLE  ${name} ${value} has hue ${h.toFixed(1)}° (255°–330° is banned)`);
  }
}
console.log('Colour contrast (WCAG 2.2, composited over the background) and hue guard:\n' + rows.join('\n'));
if (failed) {
  console.error('\nColour requirements not met — fix design/tokens.json.');
  process.exit(1);
}

// ── CSS ───────────────────────────────────────────────────────────────────
const lines = [];
const push = (s = '') => lines.push(s);
const themeKeys = Object.keys(tokens.themes.night);

push('/* GENERATED from design/tokens.json by scripts/build-tokens.mjs — do not edit. */');
push();
push('@theme {');
push('  --color-*: initial;');
for (const [k, v] of Object.entries(tokens.color)) push(`  --color-${k}: ${v};`);
push();
push('  --radius-*: initial;');
for (const [k, v] of Object.entries(tokens.radius)) push(`  --radius-${k}: ${v};`);
push();
push('  --shadow-*: initial;');
push('  --inset-shadow-*: initial;');
push('  --drop-shadow-*: initial;');
push('  --text-shadow-*: initial;');
for (const [k, v] of Object.entries(tokens.shadow)) push(`  --shadow-${k}: ${v};`);
push();
push('  --breakpoint-*: initial;');
for (const [k, v] of Object.entries(tokens.breakpoint)) push(`  --breakpoint-${k}: ${v};`);
push();
push('  --container-*: initial;');
for (const [k, v] of Object.entries(tokens.container)) push(`  --container-${k}: ${v};`);
push();
push('  --spacing: 0.25rem; /* 4px unit: every spacing utility is a multiple */');
push('  --tracking-*: initial; /* tracking comes from type tokens only */');
push('  --leading-*: initial; /* line-height comes from type tokens only */');
push('  --ease-*: initial;');
push(`  --ease-out: ${tokens.motion['ease-out']};`);
push(`  --ease-in-out: ${tokens.motion['ease-in-out']};`);
push(`  --ease-hover: ${tokens.motion['ease-hover']};`);
push('  --animate-*: initial;');
push('  --blur-*: initial; /* no blur anywhere: separation is hairlines, not glass */');
push(`  --default-transition-duration: ${tokens.motion.hover};`);
push(`  --default-transition-timing-function: ${tokens.motion['ease-hover']};`);
push('}');
push();
push('/* Semantic colours, type and families resolve per element, so a');
push('   temperature class or :lang(ar) can retune them. */');
push('@theme inline {');
const semanticName = { bg: 'surface' };
for (const k of themeKeys) push(`  --color-${semanticName[k] ?? k}: var(--${k});`);
push();
push('  --text-*: initial;');
for (const [k, t] of Object.entries(tokens.type)) {
  push(`  --text-${k}: calc(${t.size} * var(--scale-${k}));`);
  push(`  --text-${k}--line-height: var(--lh-${k});`);
  push(`  --text-${k}--letter-spacing: var(--ls-${k});`);
  push(`  --text-${k}--font-weight: ${t.weight};`);
}
push();
push('  --font-*: initial;');
push('  --font-display: var(--font-display-stack);');
push('  --font-sans: var(--font-body-stack);');
push('  --font-mono: var(--font-mono-stack);');
push('}');
push();
push(':root {');
for (const [k, t] of Object.entries(tokens.type)) {
  push(`  --scale-${k}: 1;`);
  push(`  --lh-${k}: ${t.lineHeight};`);
  push(`  --ls-${k}: ${t.tracking};`);
}
push();
for (const [k, v] of Object.entries(tokens.layout)) push(`  --${k}: ${v};`);
for (const [k, v] of Object.entries(tokens.motion)) push(`  --motion-${k}: ${v};`);
push(`  --focus-width: ${tokens.focus.width};`);
push(`  --focus-offset: ${tokens.focus.offset};`);
push(`  --measure: ${tokens.container.measure};`);
push(`  --reading: ${tokens.container.reading};`);
push();
push('  /* Families are registered by the Fonts API (astro.config.mjs). */');
push('  --font-display-stack: var(--font-instrument-serif, ui-serif, Georgia, serif);');
push('  --font-body-stack: var(--font-instrument-sans, ui-sans-serif, system-ui, sans-serif);');
push('  --font-mono-stack: var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);');
push('}');
push();
push('/* Arabic: its own display and text faces, deeper line-heights, never any');
push('   tracking. Plex carries Latin inside Arabic text (brand and store names),');
push('   Geist Mono carries every figure, so money reads the same in both locales. */');
push(':root:lang(ar) {');
for (const [k, t] of Object.entries(tokens.type)) {
  push(`  --scale-${k}: ${t.rtlScale};`);
  push(`  --lh-${k}: ${t.rtlLineHeight};`);
  push(`  --ls-${k}: 0em;`);
}
push(`  --measure: ${tokens.container['measure-ar']};`);
push(`  --reading: ${tokens.container['reading-ar']};`);
push('  --font-display-stack: var(--font-naskh), var(--font-plex-arabic), ui-serif, serif;');
push('  --font-body-stack: var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif;');
push('  --font-mono-stack: var(--font-geist-mono), var(--font-plex-arabic), ui-monospace, monospace;');
push('}');
push();
push('/* Temperatures. Night is the digital world, Paper the physical one. */');
for (const [name, theme] of Object.entries(tokens.themes)) {
  push(`.t-${name} {`);
  for (const [k, colour] of Object.entries(theme)) push(`  --${k}: var(--color-${colour});`);
  push(`  color-scheme: ${name === 'night' ? 'dark' : 'light'};`);
  push('}');
}
push();

const css = lines.join('\n');
if (checkOnly) {
  const current = await readFile(OUT, 'utf8').catch(() => '');
  if (current !== css) {
    console.error('\nsrc/styles/tokens.css is out of date — run `npm run tokens`.');
    process.exit(1);
  }
  console.log('\ntokens.css is up to date.');
} else {
  await writeFile(OUT, css);
  console.log('\nWrote src/styles/tokens.css');
}
