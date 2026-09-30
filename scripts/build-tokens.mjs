/**
 * design/tokens.json → src/styles/tokens.css
 *
 *   npm run tokens          regenerate + verify
 *   npm run tokens -- --check   verify only; exit 1 if tokens.css is stale
 *
 * 1. Verifies every required colour pair against its WCAG threshold and that
 *    every forbidden pair really does fail (so the rule stays justified).
 * 2. Emits the Tailwind v4 theme. Each namespace is reset with `initial`
 *    first, so only token values exist as utilities: `rounded-xl`, `text-sm`
 *    or `shadow-2xl` simply do not generate. Arbitrary values are caught by
 *    scripts/lint-styles.mjs.
 */
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const tokens = JSON.parse(await readFile(new URL('design/tokens.json', root), 'utf8'));
const OUT = new URL('src/styles/tokens.css', root);
const checkOnly = process.argv.includes('--check');

// ── Contrast ──────────────────────────────────────────────────────────────
function parse(c) {
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
  const stillFails = r < 3;
  if (!stillFails) failed = true;
  rows.push(`${stillFails ? '  ban' : ' STALE'}  ${r.toFixed(2).padStart(5)}:1        ${fg} on ${bg}${stillFails ? '' : '  ← passes now; drop the ban'}`);
}
console.log('Colour contrast (WCAG 2.2, composited over the background):\n' + rows.join('\n'));
if (failed) {
  console.error('\nContrast requirements not met — fix design/tokens.json.');
  process.exit(1);
}

// ── CSS ───────────────────────────────────────────────────────────────────
const lines = [];
const push = (s = '') => lines.push(s);

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
push('  --animate-*: initial;');
push('  --blur-*: initial;');
push('  --blur-md: 12px;');
push(`  --default-transition-duration: ${tokens.motion.duration};`);
push(`  --default-transition-timing-function: ${tokens.motion['ease-in-out']};`);
push('}');
push();
push('/* Type and font tokens resolve per element, so :lang(ar) can retune them. */');
push('@theme inline {');
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
push('  --font-num: var(--font-num-stack);');
push('  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;');
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
for (const [k, v] of Object.entries(tokens.motion)) push(`  --${k}: ${v};`);
push(`  --focus-width: ${tokens.focus.width};`);
push(`  --focus-offset: ${tokens.focus.offset};`);
push();
push('  /* Families are registered by the Fonts API (astro.config.mjs). */');
push('  --font-display-stack: var(--font-instrument, ui-sans-serif, system-ui, sans-serif);');
push('  --font-body-stack: var(--font-inter, ui-sans-serif, system-ui, sans-serif);');
push('  --font-num-stack: var(--font-inter, ui-sans-serif, system-ui, sans-serif);');
push('}');
push();
push('/* Arabic: own face, deeper line-height, never any tracking. Inter follows');
push('   Plex in the stack so digits and Latin match the English site. */');
push(':root:lang(ar) {');
for (const [k, t] of Object.entries(tokens.type)) {
  push(`  --scale-${k}: ${t.rtlScale};`);
  push(`  --lh-${k}: ${t.rtlLineHeight};`);
  push(`  --ls-${k}: 0em;`);
}
push('  --font-display-stack: var(--font-plex-arabic), var(--font-inter, ui-sans-serif, system-ui, sans-serif);');
push('  --font-body-stack: var(--font-plex-arabic), var(--font-inter, ui-sans-serif, system-ui, sans-serif);');
push('}');
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
