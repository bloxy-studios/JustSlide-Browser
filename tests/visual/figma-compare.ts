// PREVIEW EVIDENCE: compares the UI preview (Figma fixtures, simulated state)
// against Figma renders exported through Composio (design/figma/renders/*.b64).
// It compares the SIDEBAR COLUMN only. Strokes in Figma are intentionally shadows here
// (owner decision 2026-11-13), so selected rows/cards differ at their edges; the page area is a placeholder here and
// real WebContents in JustSlide. This is not proof of native fidelity; the
// native comparison uses screenshots of the compiled app (docs/progress.md).
//
//   bun run build:ui:preview && CHROME=/path/to/chrome bun tests/visual/figma-compare.ts
// Writes docs/evidence/visual/figma-compare-*.png and figma-compare.json.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = join(import.meta.dir, '../..');
const dist = join(root, 'ui/browser-chrome/dist/preview');
const renders = join(root, 'design/figma/renders');
const outDir = join(root, 'docs/evidence/visual');
mkdirSync(outDir, { recursive: true });
const exe = process.env.CHROME;
if (!exe || !existsSync(exe)) { console.error('Set CHROME to a Chromium/Chrome for Testing binary.'); process.exit(2); }

// [name, figma node, preview query, viewport w, h, color scheme, sidebar crop in figma, crop in preview]
type Crop = [number, number, number, number];
const cases: Array<[string, string, string, number, number, 'light' | 'dark', Crop, Crop]> = [
  // 35:13 uses 12 px padding; JustSlide now uses 6 (owner decision): compare the top 690 px.
  ['compact-mint-top', '35-13', 'fixture=figma-compact', 1100, 720, 'light', [12, 12, 240, 690], [6, 6, 240, 690]],
  // Light/dark theme frames (55:120, 55:411) are no longer targets: owner chose mint only (2026-11-13).
  // 1:6 uses 6 px frame padding like JustSlide: full sidebar column.
  ['desktop-mint', '1-6', 'fixture=figma-desktop', 1440, 1024, 'light', [6, 6, 240, 1012], [6, 6, 240, 1012]],
];

const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = Bun.serve({
  port: 0, hostname: '127.0.0.1',
  fetch(req) {
    const p = new URL(req.url).pathname.slice(1) || 'preview.html';
    if (p.startsWith('figma/')) {
      const f = join(renders, p.slice(6) + '.b64');
      return existsSync(f) ? new Response(Buffer.from(readFileSync(f, 'utf8'), 'base64'), { headers: { 'content-type': 'image/png' } }) : new Response('', { status: 404 });
    }
    const f = join(dist, p);
    return existsSync(f) ? new Response(readFileSync(f), { headers: { 'content-type': types[extname(f)] ?? 'application/octet-stream' } }) : new Response('', { status: 404 });
  },
});
const base = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none', '--force-device-scale-factor=1'] });
const report: Record<string, unknown>[] = [];
for (const [name, node, q, w, h, scheme, fc, pc] of cases) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
  await page.goto(`${base}/preview.html?${q}`);
  await page.waitForSelector('[data-testid="sidebar"]');
  await page.evaluate(() => document.fonts.ready);
  const shot = (await page.screenshot({ clip: { x: pc[0], y: pc[1], width: pc[2], height: pc[3] } })).toString('base64');
  const res = await page.evaluate(async ({ shot, figmaUrl, fc }) => {
    const load = (src: string) => new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
    const [ours, fig] = await Promise.all([load('data:image/png;base64,' + shot), load(figmaUrl)]);
    const [x, y, cw, ch] = fc;
    const c = (W: number, H: number) => { const e = document.createElement('canvas'); e.width = W; e.height = H; return e; };
    const a = c(cw, ch).getContext('2d')!; a.drawImage(fig, x, y, cw, ch, 0, 0, cw, ch);
    const b = c(cw, ch).getContext('2d')!; b.drawImage(ours, 0, 0);
    const A = a.getImageData(0, 0, cw, ch), B = b.getImageData(0, 0, cw, ch);
    const D = c(cw, ch).getContext('2d')!; const Dd = D.createImageData(cw, ch);
    let diff = 0;
    const rows = new Array(ch).fill(0);
    for (let i = 0; i < A.data.length; i += 4) {
      const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
      const on = d > 60;
      if (on) { diff++; rows[Math.floor(i / 4 / cw)]++; }
      Dd.data[i] = on ? 255 : B.data[i] * 0.25 + 190; Dd.data[i + 1] = on ? 0 : B.data[i + 1] * 0.25 + 190; Dd.data[i + 2] = on ? 60 : B.data[i + 2] * 0.25 + 190; Dd.data[i + 3] = 255;
    }
    D.putImageData(Dd, 0, 0);
    const side = c(cw * 3 + 16, ch).getContext('2d')!;
    side.fillStyle = '#888'; side.fillRect(0, 0, cw * 3 + 16, ch);
    side.putImageData(A, 0, 0); side.putImageData(B, cw + 8, 0); side.drawImage(D.canvas, cw * 2 + 16, 0);
    // Rows with >25% differing pixels: where layout drifts.
    const hotRows: number[] = []; rows.forEach((n, r) => { if (n > cw * 0.25) hotRows.push(r); });
    return { diffPct: +(100 * diff / (cw * ch)).toFixed(2), hotRowCount: hotRows.length, firstHotRows: hotRows.slice(0, 12), png: side.canvas.toDataURL('image/png').split(',')[1] };
  }, { shot, figmaUrl: `${base}/figma/node-${node}@1x.png`, fc });
  writeFileSync(join(outDir, `figma-compare-${name}.png`), Buffer.from(res.png, 'base64'));
  report.push({ name, figmaNode: node.replace('-', ':'), query: q, viewport: [w, h], figmaCrop: fc, previewCrop: pc, diffPct: res.diffPct, hotRowCount: res.hotRowCount, firstHotRows: res.firstHotRows });
  console.log(`${name}: ${res.diffPct}% pixels differ (threshold 60/765), ${res.hotRowCount} rows >25% different`);
  await page.close();
}
writeFileSync(join(outDir, 'figma-compare.json'), JSON.stringify({ chrome: browser.version(), note: 'Left: Figma render. Middle: UI preview. Right: differing pixels in red.', cases: report }, null, 2) + '\n');
await browser.close();
server.stop();
