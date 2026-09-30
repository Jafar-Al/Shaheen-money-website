/**
 * Produces the self-hosted font files in src/assets/fonts/.
 *
 *   npm run fonts
 *
 * The outputs are committed, so a normal build never runs this. Re-run it
 * only when changing families, weights or the Arabic subset below.
 *
 * Budget (audit I.3): < 120 KB and <= 4 files per page. English pages load
 * Instrument Sans + Inter (2 files); Arabic pages load Plex Sans Arabic 400/700
 * + Inter (3 files). Inter carries digits and Latin on Arabic pages, so money
 * renders with the same tabular figures in both locales.
 */
import { copyFile, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = new URL('../', import.meta.url);
const out = new URL('src/assets/fonts/', root);
const nm = (p) => new URL(`node_modules/${p}`, root);

await mkdir(new URL('LICENSES/', out), { recursive: true });

// Latin variable fonts ship already subset by Fontsource; vendor them as-is.
const copies = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin-wght.woff2'],
  ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2', 'instrument-sans-latin-wght.woff2'],
];
for (const [from, to] of copies) await copyFile(nm(from), new URL(to, out));

// Arabic: the Arabic block, presentation forms B and the joiners/marks.
// Everything else (digits, Latin, ASCII punctuation) falls through to Inter.
// A separate Plex punctuation file would cost a fifth font request on
// Arabic pages for ~4 KB of glyphs Inter already draws well.
const ranges = [
  [0x0600, 0x06ff], // Arabic
  [0xfe70, 0xfefc], // Arabic Presentation Forms-B
  [0x200c, 0x200f], // ZWNJ, ZWJ, LRM, RLM
];
const text = ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join('');

for (const weight of [400, 700]) {
  const arabic = await readFile(
    nm(`@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-${weight}-normal.woff2`),
  );
  const subset = await subsetFont(arabic, text, { targetFormat: 'woff2' });
  await writeFile(new URL(`ibm-plex-sans-arabic-core-${weight}.woff2`, out), subset);
}

// Licences travel with the files (all three families are SIL OFL 1.1).
for (const [pkg, name] of [
  ['@fontsource-variable/inter', 'Inter-OFL.txt'],
  ['@fontsource-variable/instrument-sans', 'InstrumentSans-OFL.txt'],
  ['@fontsource/ibm-plex-sans-arabic', 'IBMPlexSansArabic-OFL.txt'],
]) {
  await copyFile(nm(`${pkg}/LICENSE`), new URL(`LICENSES/${name}`, out));
}

for (const f of [
  'inter-latin-wght.woff2',
  'instrument-sans-latin-wght.woff2',
  'ibm-plex-sans-arabic-core-400.woff2',
  'ibm-plex-sans-arabic-core-700.woff2',
]) {
  const { size } = await stat(new URL(f, out));
  console.log(`${(size / 1024).toFixed(1).padStart(6)} KB  ${f}`);
}
console.log(`\nWritten to ${fileURLToPath(out)}`);
