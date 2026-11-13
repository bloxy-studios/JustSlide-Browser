// PREVIEW EVIDENCE (not the JustSlide binary): loads the production sidebar
// WebUI bundle in Chrome for Testing headless shell under the same CSP the
// JustSlide WebUI data source sends (Chromium WebUI defaults at the pinned
// revision + connect-src 'none'), with a stub Mojo module. Checks CSP/Trusted
// Types violations, console errors, network egress, rendered fonts, theme
// attributes, and writes screenshots to docs/evidence/visual/.
//
//   CHROME=/path/to/chrome-headless-shell bun tests/visual/webui-csp.ts
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = join(import.meta.dir, '../..');
const dist = join(root, 'ui/browser-chrome/dist/webui');
const stub = join(root, 'tests/fixtures/webui/justslide_shell.mojom-webui.js');
const outDir = join(root, 'docs/evidence/visual');
mkdirSync(outDir, { recursive: true });
const exe = process.env.CHROME;
if (!exe || !existsSync(exe)) { console.error('Set CHROME to a Chrome for Testing / chrome-headless-shell binary.'); process.exit(2); }

// Mirrors content/public/browser/url_data_source.cc defaults @157.0.8103.51
// plus JustSlide's override in justslide_sidebar_ui.cc.
const CSP = "child-src 'none'; object-src 'none'; script-src 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types; connect-src 'none';";
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = Bun.serve({
  port: 0, hostname: '127.0.0.1',
  fetch(req) {
    const p = new URL(req.url).pathname;
    const file = p === '/justslide_shell.mojom-webui.js' ? stub : join(dist, p === '/' ? 'sidebar.html' : p.slice(1));
    if (!file.startsWith(dist) && file !== stub) return new Response('no', { status: 403 });
    if (!existsSync(file)) return new Response('missing', { status: 404 });
    return new Response(readFileSync(file), { headers: { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'content-security-policy': CSP } });
  },
});
const base = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none'] });
const report: Record<string, unknown> = { chrome: browser.version(), csp: CSP, runs: [] as unknown[] };
let failed = false;
for (const [name, mode, w, h] of [['mint-252x1024', 1, 252, 1024], ['mint-colormode-dark-252x1024', 2, 252, 1024], ['mint-252x720', 1, 252, 720]] as const) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: mode === 2 ? 'dark' : 'light' });
  const errors: string[] = []; const violations: string[] = []; const egress: string[] = [];
  // chrome://favicon2 is served by the native WebUI data source; it cannot load
  // from this http test origin, so those requests are expected and recorded.
  const nativeOnly: string[] = [];
  const isNativeOnly = (s: string) => s.includes('chrome://favicon2/');
  page.on('console', m => { if (m.type() === 'error') (isNativeOnly(m.text()) ? nativeOnly : errors).push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !isNativeOnly(u)) egress.push(u); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => (window as any).__v = [...((window as any).__v ?? []), `${e.violatedDirective} ${e.blockedURI}`]));
  await page.goto(`${base}/sidebar.html?mode=${mode}`);
  try { await page.waitForSelector('[data-testid="sidebar"]', { timeout: 15000 }); } catch (e) { console.error('render failed', { errors, egress, v: await page.evaluate(() => (window as any).__v), body: (await page.content()).slice(0, 600) }); throw e; }
  await page.waitForTimeout(800);
  violations.push(...(await page.evaluate(() => (window as any).__v ?? [])));
  const probe = await page.evaluate(() => {
    const text = document.querySelector('[aria-current="page"]') as HTMLElement | null;
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('New Tab')) as HTMLElement | undefined;
    return {
      htmlAttrs: { theme: document.documentElement.getAttribute('data-theme') },
      bodyFont: getComputedStyle(document.body).fontFamily,
      tabFont: text ? getComputedStyle(text).fontFamily : null,
      newTabButtonBg: btn ? getComputedStyle(btn).backgroundColor : null,
      dsTextVar: getComputedStyle(document.documentElement).getPropertyValue('--js-color-text').trim(),
      svgIcons: document.querySelectorAll('svg[data-icon]').length,
      sidebarBox: (document.querySelector('[data-testid="sidebar"]') as HTMLElement).getBoundingClientRect().toJSON(),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      mojoCalls: (globalThis as any).__mojoCalls?.length ?? 0,
      styleSheets: document.styleSheets.length,
    };
  });
  // Exercise a Mojo intent through the production bundle.
  await page.getByRole('button', { name: 'Back' }).click();
  const calls = await page.evaluate(() => (globalThis as any).__mojoCalls.map((c: any[]) => c[0]));
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].map(f => `${f.family}:${f.status}`); });
  // Actual platform font(s) used to render the active tab title (CDP).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[aria-current="page"] span:last-child' });
  const rendered = nodeId ? (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts : [];
  await page.screenshot({ path: join(outDir, `webui-sidebar-${name}.png`) });
  const run = { name, errors, violations, egress, nativeOnlyRequests: nativeOnly.length, probe, intentCalls: calls, webFonts: fonts, renderedPlatformFonts: rendered };
  (report.runs as unknown[]).push(run);
  const expectText: Record<string, string> = { mint: '#0e1b1b', dark: '#f8fafb', light: '#172a31' };
  if (probe.dsTextVar !== expectText[String(probe.htmlAttrs.theme)]) { console.error(`theme ${probe.htmlAttrs.theme}: --js-color-text ${probe.dsTextVar}`); failed = true; }
  if (errors.length || violations.length || egress.length || !probe.dsTextVar || probe.overflowX || probe.svgIcons < 10 || !calls.includes('goBack')) failed = true;
  await page.close();
}
await browser.close();
server.stop();
writeFileSync(join(outDir, 'webui-csp-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed) { console.error('WebUI CSP/TT check FAILED'); process.exit(1); }
console.error('WebUI CSP/TT check passed (preview evidence; Chrome for Testing, not JustSlide).');
