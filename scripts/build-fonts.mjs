/**
 * Produces the self-hosted font files in src/assets/fonts/.
 *
 *   npm run fonts
 *
 * The outputs are committed, so a normal build never runs this. Re-run it
 * only when changing families, weights or the subsets below.
 *
 * Budget (audit I.3, redesign brief §13): < 120 KB and <= 4 files per locale.
 *
 *   English  Instrument Serif 400 + 400 italic (display), Instrument Sans
 *            variable (UI and body), Geist Mono 400 (figures, codes, data)
 *   Arabic   Noto Naskh Arabic 500 (display, chosen by specimen test, see
 *            docs/DESIGN.md), IBM Plex Sans Arabic 400 + 600 (UI and body,
 *            with Latin so brand names and store names match the Arabic),
 *            Geist Mono 400 (the same figures as the English site)
 *
 * Every file is subset to the characters the site can actually render. The
 * Arabic subset is the modern Arabic alphabet, its marks and punctuation:
 * no Persian or Urdu extensions and no presentation-form code points, which
 * HarfBuzz reaches through the fonts' own shaping tables anyway.
 */
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = new URL('../', import.meta.url);
const out = new URL('src/assets/fonts/', root);
const nm = (p) => new URL(`node_modules/${p}`, root);
// IBM's own npm package runs a telemetry postinstall script, so its two
// complete (Arabic + Latin) masters are vendored in brand-source/ instead.
const vendored = (p) => new URL(`brand-source/fonts/${p}`, root);

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');

// ASCII, Latin-1 (São Paulo, café), and the typographic punctuation, arrows
// and signs the copy and the data labels use.
const LATIN =
  range(0x20, 0x7e) +
  range(0xa0, 0xff) +
  range(0x2010, 0x2027) + // dashes, quotes, bullet, ellipsis
  '‰′″‹›€™←↑→↓↗−✕';

const ARABIC =
  range(0x0621, 0x063a) + // hamza … ghain
  range(0x0640, 0x0652) + // tatweel … sukun
  'ٰ،؛؟' + // superscript alef, comma, semicolon, question mark
  range(0x200c, 0x200f); // ZWNJ, ZWJ, LRM, RLM

const jobs = [
  // [source, output, characters]
  ['@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', 'instrument-serif-400.woff2', LATIN],
  ['@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2', 'instrument-serif-400-italic.woff2', LATIN],
  ['@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2', 'geist-mono-400.woff2', LATIN + '°'],
  ['@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-500-normal.woff2', 'noto-naskh-arabic-500.woff2', ARABIC + ' .'],
  [vendored('ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.woff2'), 'ibm-plex-sans-arabic-400.woff2', ARABIC + LATIN],
  [vendored('ibm-plex-sans-arabic/IBMPlexSansArabic-SemiBold.woff2'), 'ibm-plex-sans-arabic-600.woff2', ARABIC + LATIN],
];

await mkdir(new URL('LICENSES/', out), { recursive: true });

// Retire files no longer produced, so nothing stale is left to import.
const keep = new Set([...jobs.map(([, name]) => name), 'instrument-sans-latin-wght.woff2']);
for (const name of await readdir(out)) {
  if (name.endsWith('.woff2') && !keep.has(name)) await rm(new URL(name, out));
}

// Instrument Sans ships as a Latin variable font from Fontsource; vendored as-is.
await copyFile(
  nm('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2'),
  new URL('instrument-sans-latin-wght.woff2', out),
);

for (const [from, to, text] of jobs) {
  const source = from instanceof URL ? from : nm(from);
  const subset = await subsetFont(await readFile(source), text, { targetFormat: 'woff2' });
  await writeFile(new URL(to, out), subset);
}

// Licences travel with the files (all SIL OFL 1.1).
const licences = [
  ['@fontsource-variable/instrument-sans/LICENSE', 'InstrumentSans-OFL.txt'],
  ['@fontsource/instrument-serif/LICENSE', 'InstrumentSerif-OFL.txt'],
  ['@fontsource/geist-mono/LICENSE', 'GeistMono-OFL.txt'],
  ['@fontsource/noto-naskh-arabic/LICENSE', 'NotoNaskhArabic-OFL.txt'],
  [vendored('ibm-plex-sans-arabic/OFL.txt'), 'IBMPlexSansArabic-OFL.txt'],
];
for (const name of await readdir(new URL('LICENSES/', out))) {
  if (!licences.some(([, n]) => n === name)) await rm(new URL(`LICENSES/${name}`, out));
}
for (const [from, to] of licences) await copyFile(from instanceof URL ? from : nm(from), new URL(`LICENSES/${to}`, out));

let en = 0;
let ar = 0;
for (const name of [...keep].sort()) {
  const { size } = await stat(new URL(name, out));
  if (/instrument|geist/.test(name)) en += size;
  if (/naskh|plex|geist/.test(name)) ar += size;
  console.log(`${(size / 1024).toFixed(1).padStart(6)} KB  ${name}`);
}
console.log(`\nEnglish pages: ${(en / 1024).toFixed(1)} KB in 4 files. Arabic pages: ${(ar / 1024).toFixed(1)} KB in 4 files.`);
console.log(`Written to ${fileURLToPath(out)}`);
