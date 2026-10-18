/**
 * Press-kit assets, generated from the one vector master we hold
 * (src/assets/brand/falcon.svg) so the files a journalist downloads and the
 * mark the site renders can never drift apart.
 *
 *   npm run media
 *
 * Writes into public/media/. Everything here is derived; nothing is hand
 * edited. Assets we do NOT hold a master for (the full wordmark lockup,
 * product screenshots, the pitch deck) are not invented here: the media page
 * shows a "content needed" slot for each until a real file is dropped in.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const outDir = new URL('public/media/', root);

const NAVY = '#071138';
const WHITE = '#ffffff';

const falcon = await readFile(new URL('src/assets/brand/falcon.svg', root), 'utf8');
const d = falcon.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error('No path found in src/assets/brand/falcon.svg');

/** The mark alone, on nothing, in one colour. */
const mark = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Shaheen Money falcon mark"><path fill="${fill}" d="${d}"/></svg>\n`;

/** The mark inside its circle, the way the site locks it up. */
const tile = (bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320" role="img" aria-label="Shaheen Money falcon mark"><circle cx="160" cy="160" r="160" fill="${bg}"/><g transform="translate(60 60) scale(0.8333)"><path fill="${fg}" d="${d}"/></g></svg>\n`;

const files = [
  ['shaheen-falcon-navy.svg', mark(NAVY)],
  ['shaheen-falcon-white.svg', mark(WHITE)],
  ['shaheen-falcon-tile-navy.svg', tile(NAVY, WHITE)],
  ['shaheen-falcon-tile-white.svg', tile(WHITE, NAVY)],
];

await mkdir(outDir, { recursive: true });

for (const [name, svg] of files) {
  await writeFile(new URL(name, outDir), svg, 'utf8');
}

/** PNGs for people whose tools will not take a vector. Transparent ground. */
const pngs = [
  ['shaheen-falcon-navy-512.png', mark(NAVY), 512],
  ['shaheen-falcon-navy-1024.png', mark(NAVY), 1024],
  ['shaheen-falcon-white-512.png', mark(WHITE), 512],
  ['shaheen-falcon-white-1024.png', mark(WHITE), 1024],
];

for (const [name, svg, size] of pngs) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(new URL(name, outDir), png);
}

const written = [...files.map(([n]) => n), ...pngs.map(([n]) => n)];
console.log(`Press kit: wrote ${written.length} files into ${fileURLToPath(outDir)}`);
for (const name of written) console.log(`  · ${name}`);
