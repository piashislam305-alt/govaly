#!/usr/bin/env node
/*
 * cdn-audit preview server
 * ---------------------------------------------------------------------------
 * Zero dependencies. Node 18+.
 *
 * This sandbox has no outbound internet access (only github/npm/pypi), so it
 * CANNOT download the Shopify CDN assets itself. The browser viewing this page
 * can, though -- so the server hands the browser the real CDN URLs and the
 * browser fetches them directly from cdn.shopify.com / vixenbrand.com.
 *
 * That also turns the preview into a live reachability test: every image that
 * paints was byte-verified by a real browser, and the page posts the tally back
 * to /api/report so the result is written to preview/load-report.json.
 *
 *   node cdn-audit/preview/server.mjs [--port 5178] [--host 0.0.0.0]
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..'); // cdn-audit/

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};
const PORT = Number(flag('port', process.env.PORT || 5178));
const HOST = flag('host', '0.0.0.0');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.sh': 'text/x-shellscript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const extOf = (p) => {
  const base = p.split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  return dot === -1 ? '' : base.slice(dot).toLowerCase();
};

// Only these files are exposed; nothing else from the repo leaks out.
const ALLOW = new Map([
  ['/', 'preview/index.html'],
  ['/index.html', 'preview/index.html'],
  ['/manifest.json', 'manifest.json'],
  ['/urls.txt', 'urls.txt'],
  ['/scripts.txt', 'scripts.txt'],
  ['/endpoints.txt', 'endpoints.txt'],
  ['/assets.csv', 'assets.csv'],
  ['/download.sh', 'download.sh'],
  ['/harvest.mjs', 'harvest.mjs'],
  ['/README.md', 'README.md'],
]);

async function readAllowed(urlPath) {
  const rel = ALLOW.get(urlPath);
  if (!rel) return null;
  const abs = normalize(join(ROOT, rel));
  if (!abs.startsWith(normalize(ROOT)) || !existsSync(abs)) return null;
  return { body: await readFile(abs), ext: extOf(abs) };
}

function json(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'POST' && path === '/api/report') {
      const chunks = [];
      for await (const c of req) {
        chunks.push(c);
        if (chunks.reduce((n, b) => n + b.length, 0) > 2_000_000) throw new Error('too large');
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      payload.received_at = new Date().toISOString();
      payload.user_agent = req.headers['user-agent'] || null;
      await writeFile(
        join(HERE, 'load-report.json'),
        JSON.stringify(payload, null, 2) + '\n',
        'utf8'
      );
      return json(res, 200, { ok: true, saved: payload.checked ?? null });
    }

    if (req.method === 'GET' && path === '/api/report') {
      if (!existsSync(join(HERE, 'load-report.json'))) return json(res, 404, { ok: false });
      return json(res, 200, JSON.parse(await readFile(join(HERE, 'load-report.json'), 'utf8')));
    }

    if (req.method === 'GET' && (path === '/api/text' || path.startsWith('/api/text/'))) {
      const name = url.searchParams.get('file');
      if (!name) return json(res, 400, { error: 'file param required' });
      const hit = await readAllowed('/' + name);
      if (!hit) return json(res, 404, { error: 'not found' });
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(hit.body);
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end();
    }

    if (req.method === 'GET') {
      const hit = await readAllowed(path);
      if (hit) {
        res.writeHead(200, {
          'content-type': MIME[hit.ext] || 'application/octet-stream',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        });
        return res.end(hit.body);
      }
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  } catch (err) {
    json(res, 500, { error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`cdn-audit preview listening on http://${HOST}:${PORT}`);
  console.log(`serving manifest + gallery from ${ROOT}`);
});
