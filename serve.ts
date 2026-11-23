// Ember Duel: Ashfall — tiny local static server for game/ (Node 22, stdlib only).
// Usage: node serve.ts [--port 8080]  then open the printed URL. Development only:
// it refuses paths outside game/ and serves no directory listings.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(argv[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  let path: string;
  try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
  catch { res.writeHead(400).end('bad request'); return; }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(gameRoot, normalize(path)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) { res.writeHead(403).end('forbidden'); return; }
  let size: number;
  try { const st = statSync(file); if (!st.isFile()) throw new Error('dir'); size = st.size; }
  catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size, 'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Ember Duel: Ashfall at http://localhost:${port}`));
