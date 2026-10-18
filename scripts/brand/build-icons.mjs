/**
 * Favicons and app icons from the vector falcon (src/assets/brand/falcon.svg).
 * Replaces the old 772 KB favicon.png.
 *
 *   node scripts/brand/build-icons.mjs
 *
 * Outputs (public/): favicon.svg, favicon.ico (32 + 48), apple-touch-icon.png
 * (180), icon-192.png, icon-512.png, icon-maskable-512.png, site.webmanifest.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const root = new URL('../../', import.meta.url);
const out = (f) => new URL(`public/${f}`, root);
const falcon = await readFile(new URL('src/assets/brand/falcon.svg', root), 'utf8');
const d = falcon.match(/ d="([^"]+)"/)[1];
const NAVY = '#071138';

/** Falcon at `scale` of the 240 box, centred, on a circle or a full square. */
const svg = ({ shape, scale }) => {
  const offset = (240 - 240 * scale) / 2;
  const bg =
    shape === 'circle' ? `<circle cx="120" cy="120" r="120" fill="${NAVY}"/>` : `<rect width="240" height="240" fill="${NAVY}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${bg}<path transform="translate(${offset} ${offset}) scale(${scale})" d="${d}" fill="#ffffff"/></svg>`;
};

const png = (source, size) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();

// PNG-in-ICO container (supported by every current browser and Windows).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const favicon = svg({ shape: 'circle', scale: 0.62 });
await writeFile(out('favicon.svg'), favicon + '\n');
await writeFile(out('favicon.ico'), ico([32, 48].map((size) => ({ size, data: png(favicon, size) }))));

const square = svg({ shape: 'square', scale: 0.6 });
await writeFile(out('apple-touch-icon.png'), png(square, 180));
await writeFile(out('icon-192.png'), png(square, 192));
await writeFile(out('icon-512.png'), png(square, 512));
// Maskable: keep the mark inside the 80% safe zone.
await writeFile(out('icon-maskable-512.png'), png(svg({ shape: 'square', scale: 0.46 }), 512));

const manifest = {
  name: 'Shaheen Money',
  short_name: 'Shaheen',
  start_url: '/',
  display: 'browser',
  theme_color: NAVY,
  background_color: NAVY,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
await writeFile(out('site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('icons written to public/');
