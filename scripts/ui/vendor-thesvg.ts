// Vendors the brand marks JustSlide uses from theSVG (https://thesvg.org,
// github.com/glincker/thesvg) into ui/browser-chrome/assets/icons/brands/thesvg/.
// Reproducible: pinned package version, npm integrity verified, only the chosen
// slug/variant pairs are written, with provenance in thesvg.lock.json.
//   bun scripts/ui/vendor-thesvg.ts
// Needs network access to registry.npmjs.org and the `tar` CLI.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const PKG = '@thesvg/icons';
const VERSION = '4.0.9';
// registry name -> [theSVG slug, variant]. Variants chosen to match the marks the
// designer placed in Figma (contact sheet in docs/icons-and-assets.md).
export const BRANDS: Record<string, [string, string]> = {
  'brand-youtube': ['youtube', 'default'],
  'brand-chatgpt': ['openai-chatgpt', 'default'],
  'brand-claude': ['claude', 'default'],
  'brand-claude-code': ['claude-code', 'default'],
  'brand-gmail': ['gmail-2026', 'default'],
  'brand-aws': ['aws', 'default'],
  'brand-github': ['github', 'default'],
  'brand-slack': ['slack', 'default'],
  'brand-notion': ['notion', 'default'],
  'brand-discord': ['discord', 'default'],
  'brand-netflix': ['netflix', 'default'],
  'brand-supabase': ['supabase', 'default'],
  'brand-convex': ['convex', 'default'],
  'brand-codex': ['codex-openai', 'default'],
};

const out = join(import.meta.dir, '../../ui/browser-chrome/assets/icons/brands/thesvg');
const meta = await (await fetch(`https://registry.npmjs.org/${PKG}/${VERSION}`)).json() as any;
const tgz = new Uint8Array(await (await fetch(meta.dist.tarball)).arrayBuffer());
const [algo, want] = String(meta.dist.integrity).split('-');
const got = createHash(algo).update(tgz).digest('base64');
if (got !== want) { console.error(`integrity mismatch for ${PKG}@${VERSION}`); process.exit(1); }
const tmp = mkdtempSync(join(tmpdir(), 'thesvg-'));
writeFileSync(join(tmp, 'p.tgz'), tgz);
const tar = Bun.spawnSync(['tar', 'xzf', 'p.tgz'], { cwd: tmp });
if (tar.exitCode !== 0) { console.error(tar.stderr.toString()); process.exit(1); }
const req = createRequire(join(tmp, 'package/dist/index.cjs'));
mkdirSync(out, { recursive: true });
const lock: Record<string, unknown> = { package: PKG, version: VERSION, integrity: meta.dist.integrity, libraryLicense: meta.license, icons: {} };
for (const [name, [slug, variant]] of Object.entries(BRANDS)) {
  const mod = req(join(tmp, `package/dist/${slug}.cjs`));
  const icon = mod.default ?? mod;
  const svg: string | undefined = icon.variants?.[variant];
  if (!svg) { console.error(`${slug}: no variant ${variant}`); process.exit(1); }
  const file = `${slug}-${variant}.svg`;
  writeFileSync(join(out, file), svg.trim() + '\n');
  (lock.icons as any)[name] = { slug, variant, file, title: icon.title, hex: icon.hex, license: icon.license ?? null, url: icon.url ?? null };
}
writeFileSync(join(out, 'thesvg.lock.json'), JSON.stringify(lock, null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });
console.error(`vendored ${Object.keys(BRANDS).length} marks from ${PKG}@${VERSION} -> ${out}`);
