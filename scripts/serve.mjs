/**
 * Local preview of the production build, applying the same routing Vercel
 * will: security headers, per-page CSP, redirects, the 404 page.
 *
 *   npm run build && npm run preview      → http://localhost:4321
 *
 * `astro preview` is not supported by the Vercel adapter; this reads
 * .vercel/output directly. Serverless routes (the form endpoints) are not
 * run here — use `npm run dev` to exercise forms.
 *
 * Text responses are Brotli-compressed when the browser asks, as Vercel's
 * edge does, so Lighthouse measures transfer sizes close to production.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../.vercel/output/', import.meta.url));
const staticDir = join(root, 'static');
const configPath = join(root, 'config.json');
const port = Number(process.env.PORT ?? 4321);

/**
 * The routing table is re-read whenever the build writes a new one.
 *
 * Holding it in memory for the life of the process is a trap: rebuild while
 * the preview is running and it keeps serving the previous build's per-page
 * CSP hashes against the new build's HTML, so every inline script is
 * blocked and the page half-works in a way that looks like a site bug.
 */
let config;
let configMtime = 0;
async function routingConfig() {
  const { mtimeMs } = await stat(configPath);
  if (mtimeMs !== configMtime) {
    config = JSON.parse(await readFile(configPath, 'utf8'));
    configMtime = mtimeMs;
  }
  return config;
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

const brotliCache = new Map();
/**
 * Brotli at a typical edge quality, cached per file until its content
 * changes (keyed by a content hash: a rebuild can change a file and keep
 * its length, and a stale page would carry the wrong CSP hashes).
 */
function compressed(file, body) {
  const key = `${file}:${createHash('sha1').update(body).digest('base64')}`;
  if (!brotliCache.has(key)) {
    brotliCache.set(key, brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }));
  }
  return brotliCache.get(key);
}

async function findFile(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [safe, join(safe, 'index.html'), `${safe}.html`]) {
    const full = join(staticDir, candidate);
    if (!full.startsWith(staticDir)) continue;
    try {
      if ((await stat(full)).isFile()) return full;
    } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const headers = {};
  let phase = 'main';
  const { routes } = await routingConfig();

  for (const route of routes) {
    if (route.handle === 'filesystem') {
      phase = 'filesystem';
      break;
    }
    if (!route.src || !new RegExp(route.src).test(url.pathname)) continue;
    // Vercel's route conditions: a header or a cookie that must be there
    // (`has`) or must not be (`missing`, the console's sign-in redirect).
    const cookies = Object.fromEntries(
      String(req.headers.cookie ?? '')
        .split(';')
        .map((c) => c.trim().split('='))
        .filter(([k]) => k)
        .map(([k, ...v]) => [k, v.join('=')]),
    );
    const present = (h) => {
      const value = h.type === 'cookie' ? cookies[h.key] : h.type === 'header' ? req.headers[h.key.toLowerCase()] : undefined;
      return value !== undefined && new RegExp(h.value ?? '.*').test(String(value));
    };
    if (!(route.has ?? []).every(present) || (route.missing ?? []).some(present)) continue;
    Object.assign(headers, route.headers);
    if (route.status && route.headers?.Location) {
      res.writeHead(route.status, { ...headers, Location: route.headers.Location });
      return res.end();
    }
    if (!route.continue) break;
  }

  const file = await findFile(url.pathname);
  if (file) {
    const type = types[extname(file)] ?? 'application/octet-stream';
    let body = await readFile(file);
    if (/text|json|xml|svg|javascript|manifest/.test(type) && /\bbr\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      body = compressed(file, body);
      Object.assign(headers, { 'Content-Encoding': 'br', Vary: [headers.Vary, 'Accept-Encoding'].filter(Boolean).join(', ') });
    }
    res.writeHead(200, { ...headers, 'Content-Type': type });
    return res.end(body);
  }

  if (url.pathname.startsWith('/api/')) {
    res.writeHead(501, { 'Content-Type': 'text/plain' });
    return res.end('Serverless routes run on Vercel or under `npm run dev`, not in this static preview.');
  }

  const notFound = join(staticDir, '404.html');
  res.writeHead(404, { ...headers, 'Content-Type': types['.html'] });
  res.end(await readFile(notFound).catch(() => 'Not found'));
  void phase;
}).listen(port, () => console.log(`Preview: http://localhost:${port}  (serving .vercel/output/static)`));
