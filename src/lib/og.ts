/**
 * Build-time Open Graph images (audit M.3: every page gets one, so no share
 * on WhatsApp, LinkedIn or X ever renders as a bare link).
 *
 * Rendered with resvg, which shapes Arabic and handles right-to-left text.
 * resvg needs TrueType files, so the brand fonts are converted from the
 * Fontsource WOFF files into node_modules/.cache on first use.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import fontverter from 'fontverter';
import falcon from '../assets/brand/falcon.svg?raw';
import type { Locale } from '../i18n/config';

const cacheDir = join(process.cwd(), 'node_modules', '.cache', 'shaheen-og');

const sources = {
  'InstrumentSans-Bold.ttf': '@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff',
  'Inter-Medium.ttf': '@fontsource/inter/files/inter-latin-500-normal.woff',
  'IBMPlexSansArabic-Bold.ttf': '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff',
  'IBMPlexSansArabic-Medium.ttf': '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff',
} as const;

let fontFiles: Promise<string[]> | undefined;
function fonts(): Promise<string[]> {
  fontFiles ??= (async () => {
    await mkdir(cacheDir, { recursive: true });
    return Promise.all(
      Object.entries(sources).map(async ([name, pkgPath]) => {
        const target = join(cacheDir, name);
        try {
          await access(target);
        } catch {
          // Read by path: the packages' export maps only expose their CSS.
          const woff = await readFile(join(process.cwd(), 'node_modules', pkgPath));
          await writeFile(target, await fontverter.convert(woff, 'sfnt'));
        }
        return target;
      }),
    );
  })();
  return fontFiles;
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap by an approximate average glyph width; "\n" forces a break. */
function wrap(text: string, maxChars: number): string[] {
  return text.split('\n').flatMap((paragraph) => wrapLine(paragraph, maxChars));
}

function wrapLine(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const falconPath = falcon.match(/ d="([^"]+)"/)?.[1] ?? '';

export async function renderOg({ locale, title }: { locale: Locale; title: string }): Promise<Buffer> {
  const rtl = locale === 'ar';
  const W = 1200;
  const H = 630;
  const pad = 80;

  if (rtl) title = title.replace(/[.!؟?،]+(?=\n|$)/g, '');

  // Step the size down until the title fits in three lines.
  let size = 68;
  let lines = wrap(title, Math.floor((W - pad * 2) / (size * (rtl ? 0.5 : 0.52))));
  while (lines.length > 3 && size > 44) {
    size -= 6;
    lines = wrap(title, Math.floor((W - pad * 2) / (size * (rtl ? 0.5 : 0.52))));
  }
  const lineHeight = Math.round(size * (rtl ? 1.4 : 1.12));
  const titleFamily = rtl ? 'IBM Plex Sans Arabic' : 'Instrument Sans';
  const x = rtl ? W - pad : pad;
  // resvg keeps text-anchor in screen space: Arabic is anchored at its right
  // edge with "end". Its paragraph direction stays LTR, which would move a
  // sentence-final full stop to the wrong end, so Arabic card titles drop it.
  const anchor = rtl ? 'end' : 'start';
  const top = H - pad - 70 - lineHeight * (lines.length - 1);

  const markX = rtl ? W - pad - 72 : pad;
  const wordX = rtl ? W - pad - 92 : pad + 92;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g" cx="${rtl ? '15%' : '85%'}" cy="0%" r="90%">
      <stop offset="0" stop-color="#142a6e"/>
      <stop offset="1" stop-color="#071138"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g transform="translate(${markX} ${pad - 8})">
    <circle cx="36" cy="36" r="36" fill="#ffffff"/>
    <g transform="translate(12 12) scale(0.2)"><path d="${falconPath}" fill="#071138"/></g>
  </g>
  <text x="${wordX}" y="${pad + 38}" font-family="Instrument Sans" font-weight="700" font-size="34" text-anchor="${anchor}" fill="#ffffff">Shaheen <tspan fill="#00e1ff">Money</tspan></text>
  ${lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${top + i * lineHeight}" font-family="${titleFamily}, Inter" font-weight="700" font-size="${size}" text-anchor="${anchor}" fill="#ffffff">${escapeXml(l)}</text>`,
    )
    .join('\n  ')}
  <rect x="${rtl ? W - pad - 64 : pad}" y="${H - pad + 6}" width="64" height="4" rx="2" fill="#00e1ff"/>
  <text x="${rtl ? pad : W - pad}" y="${H - pad + 12}" font-family="Inter" font-weight="500" font-size="24" text-anchor="${rtl ? 'start' : 'end'}" fill="#ffffff" fill-opacity="0.72">shaheen.money</text>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: await fonts(), loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
  return resvg.render().asPng();
}
