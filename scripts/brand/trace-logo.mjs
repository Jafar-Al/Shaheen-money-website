/**
 * One-time conversion of the legacy raster falcon (brand-source/logo-*.png,
 * 239×238, white on transparent) into a vector master.
 *
 * Output: src/assets/brand/falcon.svg — a single path in a 0 0 240 240 box,
 * filled with currentColor so the mark inherits colour from its context.
 *
 * The raster is small, so the trace is an interim master. When the original
 * vector artwork is available, replace src/assets/brand/falcon.svg with it
 * (keep the viewBox and currentColor fill) and delete this script.
 *
 * Requires potrace, which is not a project dependency (it pulls in an old
 * image library with a known advisory):  npx -p potrace@2 node scripts/brand/trace-logo.mjs
 */
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const SOURCE_DIR = new URL('../../brand-source/', import.meta.url);
const OUT = new URL('../../src/assets/brand/falcon.svg', import.meta.url);
const SCALE = 8; // trace an upscaled copy so curves are fitted to sub-pixel edges

const file = (await readdir(SOURCE_DIR)).find((f) => /^logo-.*\.png$/.test(f));
if (!file) throw new Error('No brand-source/logo-*.png found');

const src = sharp(fileURLToPath(new URL(file, SOURCE_DIR)));
const { width, height } = await src.metadata();

// The mark lives in the alpha channel: opaque = mark. Potrace wants dark-on-light.
const bitmap = await src
  .clone()
  .ensureAlpha()
  .extractChannel('alpha')
  .resize(width * SCALE, height * SCALE, { kernel: 'lanczos3' })
  .blur(SCALE * 0.75) // smooth the pixel staircase so potrace fits long curves
  .negate()
  .png()
  .toBuffer();

const svg = await new Promise((resolve, reject) =>
  potrace.trace(
    bitmap,
    { threshold: 128, turdSize: 40 * SCALE, alphaMax: 1.1, optCurve: true, optTolerance: 3 },
    (err, out) => (err ? reject(err) : resolve(out)),
  ),
);

const d = svg.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error('Trace produced no path');

// Normalise into a square 240-unit box, centred.
const box = 240;
const s = box / Math.max(width * SCALE, height * SCALE);
const tx = (box - width * SCALE * s) / 2;
const ty = (box - height * SCALE * s) / 2;

// Potrace emits absolute M/L/C/Z commands only, so every number pair is a
// point: bake the transform in and round to 0.1 of the 240-unit box.
const round = (n) => String(Math.round(n * 10) / 10);
const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
let path = '';
let pair = [];
for (const t of tokens) {
  if (/^[MLCZ]$/i.test(t)) {
    path += t.toUpperCase();
    continue;
  }
  pair.push(Number(t));
  if (pair.length === 2) {
    const [x, y] = pair;
    path += `${/\d$/.test(path) ? ' ' : ''}${round(x * s + tx)} ${round(y * s + ty)}`;
    pair = [];
  }
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" fill="currentColor"><path d="${path}"/></svg>\n`;

await mkdir(new URL('./', OUT), { recursive: true });
await writeFile(OUT, out);
console.log(`Traced ${file} → src/assets/brand/falcon.svg (${out.length} bytes)`);
