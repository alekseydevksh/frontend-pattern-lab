// Minimal static file server for the `out/` export. No dependencies.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
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

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const file = await resolveFile(pathname);
  const status = file ? 200 : 404;
  const target = file ?? join(root, '404.html');
  try {
    const body = await readFile(target);
    res.writeHead(status, { 'content-type': types[extname(target)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
