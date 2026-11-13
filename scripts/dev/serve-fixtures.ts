// Serves tests/fixtures/pages on 127.0.0.1:8765 (loopback only).
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
const root = join(import.meta.dir, '../../tests/fixtures/pages');
Bun.serve({ hostname: '127.0.0.1', port: Number(process.env.PORT ?? 8765), fetch(req) {
  const p = normalize(new URL(req.url).pathname).replace(/^\/+/, '') || 'typing.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !existsSync(f)) return new Response('not found', { status: 404 });
  return new Response(readFileSync(f), { headers: { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' } });
} });
console.error(`fixtures on http://127.0.0.1:${process.env.PORT ?? 8765}/`);
