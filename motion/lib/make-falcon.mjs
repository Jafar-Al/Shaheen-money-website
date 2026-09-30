/**
 * Regenerates motion/lib/falcon.js from the one vector master, so the mark
 * in the films and the mark on the website can never drift apart.
 *
 *   node motion/lib/make-falcon.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const svg = await readFile(new URL('../../src/assets/brand/falcon.svg', import.meta.url), 'utf8');
const d = svg.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error('No path found in src/assets/brand/falcon.svg');

const feathers = d.split(/(?=M)/).filter(Boolean);

await writeFile(
  new URL('falcon.js', import.meta.url),
  `/* GENERATED from src/assets/brand/falcon.svg by motion/lib/make-falcon.mjs. Do not edit. */\n` +
    `export const FALCON_PATH = ${JSON.stringify(d)};\n` +
    `export const FALCON_FEATHERS = ${JSON.stringify(feathers)};\n`,
  'utf8',
);

console.log(`falcon.js: ${(d.length / 1024).toFixed(1)} KB path, ${feathers.length} feathers`);
