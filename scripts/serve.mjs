/**
 * Local content server for testing — serves this repo's files (bundle.json,
 * manifest.json, content/…) over HTTP with permissive CORS, so the app can sync
 * from your machine instead of raw.githubusercontent (no rate limits).
 *
 *   node scripts/serve.mjs            # http://localhost:8000
 *   PORT=9000 node scripts/serve.mjs
 *
 * Point the app at it with EXPO_PUBLIC_CONTENT_BASE (see the app's sync.ts):
 *   browser:  http://localhost:8000
 *   device:   http://<this-machine-LAN-IP>:8000
 *
 * Regenerate the payload after editing content: `npm run manifest`.
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..'); // repo root
const PORT = Number(process.env.PORT) || 8000;
const TYPES = { '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain' };

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const rel = normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const abs = join(root, rel);
    if (!abs.startsWith(root + sep) && abs !== root) { res.writeHead(403); return res.end('forbidden'); }
    try {
      const data = await readFile(abs);
      res.writeHead(200, { 'Content-Type': TYPES[extname(abs)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    }
  })
  .listen(PORT, () => {
    console.log(`Serving ${root}`);
    console.log(`  browser: http://localhost:${PORT}`);
    console.log(`  device:  http://<your-LAN-IP>:${PORT}   (e.g. bundle at /content/bundle.json)`);
  });
