/**
 * Renders a motion scene to an MP4.
 *
 *   node motion/lib/render.mjs 01-cash-out [--fps 60] [--scale 1] [--preview]
 *
 * Frames are stepped, never recorded in real time: the scene exposes
 * `window.renderFrame(seconds)` and this walks it one frame at a time,
 * screenshotting each. That means the output has no dropped frames, no
 * timing jitter, and is byte-for-byte reproducible — which a screen capture
 * of a CSS animation can never be.
 *
 * --preview renders a low frame rate for a quick look. It stays at full
 * size on purpose: the stage is a fixed 1920x1080 canvas, so a smaller
 * viewport would crop the composition rather than scale it, and a preview
 * that lies about framing is worse than no preview.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, rm, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize, sep } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const name = args[0];
if (!name) {
  console.error('usage: node motion/lib/render.mjs <scene-name> [--fps 60] [--scale 1] [--preview]');
  process.exit(1);
}
const flag = (k, fallback) => {
  const i = args.indexOf(`--${k}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const preview = args.includes('--preview');

const FPS = flag('fps', preview ? 12 : 60);
const SCALE = flag('scale', 1);
const WIDTH = Math.round(1920 * SCALE);
const HEIGHT = Math.round(1080 * SCALE);

const motionDir = fileURLToPath(new URL('../', import.meta.url));
// fileURLToPath keeps the trailing separator on a directory URL; strip it so
// the containment check below can add exactly one.
const projectRoot = fileURLToPath(new URL('../../', import.meta.url)).replace(/[\\/]+$/, '');
const framesDir = join(motionDir, '.frames', name);
const outFile = join(motionDir, 'out', `${name}${preview ? '-preview' : ''}.mp4`);

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(join(motionDir, 'out'), { recursive: true });

/**
 * The scenes are ES modules and load the brand fonts from src/assets, and
 * Chromium refuses module imports over file://. So they are served, with
 * the project root as the web root — which is also what makes the
 * `../../src/assets/fonts` in scene.css resolve.
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  const requested = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const full = join(projectRoot, normalize(requested));
  if (!full.startsWith(projectRoot + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(full);
    res.writeHead(200, { 'Content-Type': TYPES[extname(full)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || undefined,
  args: ['--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));

const bail = async (message) => {
  console.error(`${message}\n  ${problems.join('\n  ') || '(no page errors reported)'}`);
  await browser.close();
  server.close();
  process.exit(1);
};

await page.goto(`${origin}/motion/${name}.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

try {
  await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.SCENE, null, { timeout: 15000 });
} catch {
  await bail('Scene never became ready.');
}

const { duration, title } = await page.evaluate(() => ({
  duration: window.SCENE.duration,
  title: window.SCENE.title,
}));

const total = Math.round(duration * FPS);
console.log(`${name} — "${title}"  ${duration}s  ${WIDTH}x${HEIGHT} @ ${FPS}fps  (${total} frames)`);

const pad = (n) => String(n).padStart(5, '0');
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.renderFrame(t), i / FPS);
  await page.screenshot({ path: join(framesDir, `f${pad(i)}.png`), animations: 'disabled' });
  if (i % Math.max(1, Math.round(total / 10)) === 0) process.stdout.write(`  ${Math.round((i / total) * 100)}%\r`);
}

await browser.close();
server.close();

if (problems.length) {
  console.error(`  ${problems.length} page problem(s):\n  ${problems.slice(0, 6).join('\n  ')}`);
}

const count = (await readdir(framesDir)).length;
console.log(`  rendered ${count} frames, encoding…`);

/**
 * H.264 High profile, CRF 16 (visually lossless for flat vector work),
 * yuv420p so it plays everywhere — Safari, QuickTime, PowerPoint, and every
 * social platform. faststart puts the index first so it begins playing
 * before it has finished downloading.
 */
const ff = spawn(
  'ffmpeg',
  [
    '-y',
    '-framerate', String(FPS),
    '-i', join(framesDir, 'f%05d.png'),
    '-c:v', 'libx264',
    '-preset', preview ? 'veryfast' : 'slow',
    '-crf', preview ? '26' : '16',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-r', String(FPS),
    outFile,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

let stderr = '';
ff.stderr.on('data', (d) => (stderr += d.toString()));

await new Promise((resolve, reject) => {
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.slice(-2000)))));
});

await rm(framesDir, { recursive: true, force: true });
console.log(`  → ${outFile}`);
