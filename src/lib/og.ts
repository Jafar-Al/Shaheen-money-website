/**
 * Build-time Open Graph images (audit M.3: every page gets one, so no share
 * on WhatsApp, LinkedIn or X ever renders as a bare link).
 *
 * The same language as the site's inner pages, on Night: the page's own
 * feather strip across the top (same seed, same drawing), its title in the
 * display face with its one emphasised word in italic, and the lockup and
 * address along a hairline at the foot.
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
import { feather, fieldSpecs } from './feather';
import type { Locale } from '../i18n/config';

const cacheDir = join(process.cwd(), 'node_modules', '.cache', 'shaheen-og-v2');

const sources = {
  'InstrumentSans-Bold.ttf': '@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff',
  'InstrumentSerif-Regular.ttf': '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff',
  'InstrumentSerif-Italic.ttf': '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff',
  'NotoNaskhArabic-Medium.ttf': '@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-500-normal.woff',
  'GeistMono-Regular.ttf': '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff',
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

type Word = { text: string; italic: boolean };

/** "costs *too much.*" → words, the marked ones italic; "\n" forces a break. */
function paragraphs(title: string): Word[][] {
  return title.split('\n').map((line) =>
    line
      .split(/(\*[^*]+\*)/)
      .filter(Boolean)
      .flatMap((part) => {
        const italic = part.startsWith('*') && part.endsWith('*');
        return part
          .replaceAll('*', '')
          .split(/\s+/)
          .filter(Boolean)
          .map((text) => ({ text, italic }));
      }),
  );
}

/** Greedy wrap by an approximate average glyph width. */
function wrap(title: string, maxChars: number): Word[][] {
  const lines: Word[][] = [];
  for (const words of paragraphs(title)) {
    let line: Word[] = [];
    let length = 0;
    for (const word of words) {
      const next = length + (line.length ? 1 : 0) + word.text.length;
      if (line.length && next > maxChars) {
        lines.push(line);
        line = [word];
        length = word.text.length;
      } else {
        line.push(word);
        length = next;
      }
    }
    if (line.length) lines.push(line);
  }
  return lines;
}

const falconPath = falcon.match(/ d="([^"]+)"/)?.[1] ?? '';

const NIGHT = '#060b1c';
const SIGNAL = '#00e1ff';

/** The page's feather strip, as on its hero: 1600×420 sliced into the band. */
function strip(seed: string, rtl: boolean, W: number, H: number): string {
  const { specs } = fieldSpecs('strip', seed);
  const k = Math.max(W / 1600, H / 420);
  const dx = (W - 1600 * k) / 2;
  const dy = (H - 420 * k) / 2;
  const paths = specs
    .map(feather)
    .map(
      (f) =>
        `<path d="${f.barbs}" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="${(0.7 / k).toFixed(2)}"/>` +
        `<path d="${f.rachis}" fill="none" stroke="#ffffff" stroke-opacity="0.42" stroke-width="${(1.1 / k).toFixed(2)}"/>` +
        (f.accent ? `<path d="${f.accent}" fill="none" stroke="${SIGNAL}" stroke-width="${(1.6 / k).toFixed(2)}"/>` : ''),
    )
    .join('');
  // The plume points the way the page reads, as on the site.
  const mirror = rtl ? `translate(${W} 0) scale(-1 1) ` : '';
  return `<clipPath id="band"><rect width="${W}" height="${H}"/></clipPath>
  <g clip-path="url(#band)"><g transform="${mirror}translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(4)})">${paths}</g></g>`;
}

export async function renderOg({ locale, title, seed }: { locale: Locale; title: string; seed: string }): Promise<Buffer> {
  const rtl = locale === 'ar';
  const W = 1200;
  const H = 630;
  const pad = 80;

  // resvg keeps text-anchor in screen space: Arabic is anchored at its right
  // edge with "end". Its paragraph direction stays LTR, which would move a
  // sentence-final full stop to the wrong end, so Arabic card titles drop it.
  // Arabic has no italic: its titles are set plain.
  if (rtl) title = title.replaceAll('*', '').replace(/[.!؟?،]+(?=\n|$)/g, '');

  // Step the size down until the title fits in three lines, between the
  // feather band and the rule (cap height about 0.7 of the size).
  const band = 260;
  const rule = H - 124;
  const room = rule - 44 - band - 16;
  const avg = rtl ? 0.5 : 0.37;
  const leading = rtl ? 1.42 : 1.02;
  let size = rtl ? 64 : 84;
  let lines = wrap(title, Math.floor((W - pad * 2) / (size * avg)));
  const fits = () => lines.length <= 3 && (lines.length - 1) * size * leading + size * 0.7 <= room;
  while (!fits() && size > 44) {
    size -= 4;
    lines = wrap(title, Math.floor((W - pad * 2) / (size * avg)));
  }
  const lineHeight = Math.round(size * leading);
  const family = rtl ? 'Noto Naskh Arabic' : 'Instrument Serif';
  const weight = rtl ? 500 : 400;
  const x = rtl ? W - pad : pad;
  const anchor = rtl ? 'end' : 'start';

  const last = rule - 44;
  const first = last - lineHeight * (lines.length - 1);
  const foot = H - 62;

  const titleSvg = lines
    .map((line, i) => {
      const spans = line
        .map((w, j) => {
          const text = escapeXml((j ? ' ' : '') + w.text);
          return w.italic ? `<tspan font-style="italic">${text}</tspan>` : `<tspan>${text}</tspan>`;
        })
        .join('');
      return `<text x="${x}" y="${first + i * lineHeight}" xml:space="preserve" font-family="${family}" font-weight="${weight}" font-size="${size}" text-anchor="${anchor}" fill="#ffffff" fill-opacity="0.94">${spans}</text>`;
    })
    .join('\n  ');

  // Lockup at the reading start of the foot, address at its end.
  const markX = rtl ? W - pad - 44 : pad;
  const wordX = rtl ? W - pad - 58 : pad + 58;
  const urlX = rtl ? pad : W - pad;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${NIGHT}"/>
  ${strip(seed, rtl, W, band)}
  ${titleSvg}
  <rect x="${pad}" y="${rule}" width="${W - pad * 2}" height="1" fill="#ffffff" fill-opacity="0.16"/>
  <g transform="translate(${markX} ${foot - 30})">
    <circle cx="22" cy="22" r="22" fill="#ffffff"/>
    <g transform="translate(7.5 7.5) scale(0.1208)"><path d="${falconPath}" fill="#071138"/></g>
  </g>
  <text x="${wordX}" y="${foot}" font-family="Instrument Sans" font-weight="700" font-size="26" text-anchor="${anchor}" fill="#ffffff">Shaheen <tspan fill="${SIGNAL}">Money</tspan></text>
  <text x="${urlX}" y="${foot - 2}" font-family="Geist Mono" font-size="17" letter-spacing="2.4" text-anchor="${rtl ? 'start' : 'end'}" fill="#ffffff" fill-opacity="0.68">SHAHEEN.MONEY</text>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: await fonts(), loadSystemFonts: false, defaultFontFamily: 'Instrument Sans' },
  });
  return resvg.render().asPng();
}
