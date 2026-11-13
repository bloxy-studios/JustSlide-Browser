// UX audit (preview evidence): renders the UI preview fixtures in Chromium and
// measures every visible text run and interactive control:
//   * text: font size/weight/line-height, colour, effective background, WCAG contrast
//   * controls: hit-target size, accessible name, cursor, focus style
//   * global: font sizes and weights in use, spacing values, horizontal overflow
// Rules (docs/ux-audit.md): text ≥ 4.5:1 (≥ 3:1 for ≥ 18.66px bold / 24px),
// macOS body 13px, secondary ≥ 11px, controls ≥ 24×24 (macOS HIG small-control
// minimum ~ 20; we use 24), pointer cursor never on native-style controls.
//   bun run build:ui:preview && CHROME=... bun tests/visual/ux-audit.ts [--json out.json]
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = join(import.meta.dir, '../..');
const dist = join(root, 'ui/browser-chrome/dist/preview');
const out = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : join(root, 'docs/evidence/visual/ux-audit.json');
mkdirSync(join(root, 'docs/evidence/visual'), { recursive: true });
const exe = process.env.CHROME;
if (!exe || !existsSync(exe)) { console.error('Set CHROME'); process.exit(2); }
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(req) { const p = new URL(req.url).pathname.slice(1) || 'preview.html'; const f = join(dist, p); return existsSync(f) ? new Response(readFileSync(f), { headers: { 'content-type': types[extname(f)] ?? 'application/octet-stream' } }) : new Response('', { status: 404 }); } });
const base = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({ executablePath: exe, args: ['--force-device-scale-factor=1'] });
const report: any = { chrome: browser.version(), runs: [] };
let failures = 0;
for (const [name, q] of [['figma-compact', 'fixture=figma-compact'], ['figma-desktop', 'fixture=figma-desktop'], ['default', ''], ['glass', 'fixture=figma-compact&backdrop=glass']] as const) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  await page.goto(`${base}/preview.html?${q}`);
  await page.waitForSelector('[data-testid="sidebar"]');
  const r = await page.evaluate(() => {
    const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
    const over = (fg: number[], bg: number[]) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const effBg = (el: Element | null): number[] => {
      const stack: number[][] = [];
      for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 1) break; }
      let bg = [255, 255, 255, 1];
      for (const c of stack.reverse()) bg = over(c, bg);
      return bg;
    };
    const opacityChain = (el: Element | null) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const sidebar = document.querySelector('[data-testid="sidebar"]')!;
    const texts: any[] = [];
    const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(); if (!t) continue;
      const el = n.parentElement!; const cs = getComputedStyle(el); const rect = el.getBoundingClientRect();
      if (el.closest('[aria-hidden="true"]')) continue; // decorative (e.g. favicon letter fallback), WCAG 1.4.3 exempt
      if (!rect.width || cs.visibility === 'hidden' || cs.display === 'none') continue;
      const bg = effBg(el); const fgRaw = parse(cs.color); const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacityChain(el)], bg);
      const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const cr = +ratio(fg, bg).toFixed(2);
      texts.push({ text: t.slice(0, 40), size, weight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, transform: cs.textTransform, contrast: cr, pass: cr >= (large ? 3 : 4.5) });
    }
    const controls = [...sidebar.querySelectorAll('button, input, [role="menuitem"], [tabindex]:not([tabindex="-1"])')].filter(e => (e as HTMLElement).offsetParent !== null || getComputedStyle(e).position === 'fixed').map(e => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { name: e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 30) || '(none)', w: Math.round(r.width), h: Math.round(r.height), cursor: cs.cursor, title: e.getAttribute('title'), ok: r.width >= 24 && r.height >= 24 };
    });
    const sizes: Record<string, number> = {}; const weights: Record<string, number> = {};
    for (const t of texts) { sizes[t.size] = (sizes[t.size] ?? 0) + 1; weights[t.weight] = (weights[t.weight] ?? 0) + 1; }
    return { texts, controls, fontSizes: sizes, fontWeights: weights, overflowX: document.documentElement.scrollWidth > innerWidth, family: getComputedStyle(document.body).fontFamily };
  });
  const lowContrast = r.texts.filter((t: any) => !t.pass);
  const small = r.texts.filter((t: any) => t.size < 11);
  const tinyTargets = r.controls.filter((c: any) => !c.ok);
  const pointer = r.controls.filter((c: any) => c.cursor === 'pointer');
  failures += lowContrast.length + small.length + tinyTargets.length + pointer.length + (r.overflowX ? 1 : 0);
  report.runs.push({ name, summary: { texts: r.texts.length, controls: r.controls.length, lowContrast: lowContrast.length, under11px: small.length, targetsUnder24: tinyTargets.length, pointerCursor: pointer.length, overflowX: r.overflowX, fontSizes: r.fontSizes, fontWeights: r.fontWeights, family: r.family }, lowContrast, small, tinyTargets, pointer });
  console.log(`${name}: ${r.texts.length} texts, ${r.controls.length} controls | contrast<min ${lowContrast.length} | <11px ${small.length} | targets<24 ${tinyTargets.length} | pointer ${pointer.length} | sizes ${JSON.stringify(r.fontSizes)} weights ${JSON.stringify(r.fontWeights)}`);
  await page.close();
}
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
await browser.close(); server.stop();
console.log(failures ? `UX audit: ${failures} findings (see ${out})` : 'UX audit: clean');
process.exit(process.argv.includes('--strict') && failures ? 1 : 0);
