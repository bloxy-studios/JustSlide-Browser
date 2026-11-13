// PREVIEW EVIDENCE ONLY: screenshots of the dev UI preview (simulated state,
// placeholder viewport) at the Figma sizes, light/dark/custom backdrop, plus
// the state gallery. Not evidence of native browser behaviour.
//   CHROME=... bun tests/visual/preview-layout.ts   (after `bun run build:preview`)
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const root = join(import.meta.dir, '../..');
const dist = join(root, 'ui/browser-chrome/dist/preview');
const outDir = join(root, 'docs/evidence/visual');
mkdirSync(outDir, { recursive: true });
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(req) { const p = new URL(req.url).pathname.slice(1) || 'preview.html'; const f = join(dist, p); return existsSync(f) ? new Response(readFileSync(f), { headers: { 'content-type': types[extname(f)] ?? 'application/octet-stream' } }) : new Response('', { status: 404 }); } });
const base = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME! });
const shots: Array<[string, string, number, number, 'light' | 'dark']> = [
  ['preview-1440x1024-light', 'preview.html?mode=light', 1440, 1024, 'light'],
  ['preview-1100x720-dark', 'preview.html?mode=dark', 1100, 720, 'dark'],
  ['preview-1100x720-backdrop', 'preview.html?mode=light&backdrop=b8f0d8', 1100, 720, 'light'],
  ['gallery-light', 'gallery.html?mode=light', 1440, 1100, 'light'],
];
let errors = 0;
for (const [name, path, w, h, scheme] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
  page.on('pageerror', e => { errors++; console.error(name, String(e)); });
  await page.goto(`${base}/${path}`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  await page.close();
}
// Collapsed sidebar via the real toggle button.
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
await page.goto(`${base}/preview.html?mode=light`); await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Hide sidebar' }).click(); await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, 'preview-1100x720-collapsed.png') });
await browser.close(); server.stop();
console.error(errors ? `preview layout: ${errors} page errors` : 'preview layout screenshots written');
process.exit(errors ? 1 : 0);
