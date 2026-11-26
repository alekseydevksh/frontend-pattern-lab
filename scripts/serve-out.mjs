// Minimal static file server for the `out/` export. No dependencies.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.env.OUT_DIR ?? 'out');
const port = Number(process.env.PORT ?? 3000);

if (!existsSync(root)) {
  console.error(`No export found at ${root}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(root, safe);
  if (!candidate.startsWith(root)) return null;
  const info = await stat(candidate).catch(() => null);
  if (info?.isDirectory()) return join(candidate, 'index.html');
  if (info?.isFile()) return candidate;
  return null;
}

// Production hosts compress text. So does this server, or a measurement of the export would
// count bytes that no visitor downloads. Every text file is compressed once at start-up and kept
// (files do not change), so the first request for a file is no slower than the next.
const compressible = new Set(['.html', '.js', '.css', '.json', '.txt', '.svg']);
const zipped = new Map();

async function precompress(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await precompress(path);
    else if (compressible.has(extname(path))) zipped.set(path, gzipSync(await readFile(path)));
  }
}
await precompress(root);

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const file = await resolveFile(pathname);
  const status = file ? 200 : 404;
  const target = file ?? join(root, '404.html');
  try {
    const ext = extname(target);
    const headers = { 'content-type': types[ext] ?? 'application/octet-stream' };
    let body = await readFile(target);
    if (compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      const small = zipped.get(target);
      if (small) {
        body = small;
        headers['content-encoding'] = 'gzip';
        headers.vary = 'Accept-Encoding';
      }
    }
    res.writeHead(status, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
