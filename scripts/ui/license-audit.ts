// Audits every package in the installed UI dependency tree that can reach the
// shipped bundle (production deps of ui/browser-chrome, transitively):
// declared license, shipped LICENSE/NOTICE files, and font/asset files.
// Writes docs/evidence/ui-license-audit.json. Not legal advice.
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = join(import.meta.dir, '../..');
const nm = join(root, 'node_modules');
const pkgJson = (name: string) => { const p = join(nm, name, 'package.json'); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null; };
const seen = new Map<string, any>();
const queue = Object.keys(JSON.parse(readFileSync(join(root, 'ui/browser-chrome/package.json'), 'utf8')).dependencies);
while (queue.length) {
  const name = queue.shift()!;
  if (seen.has(name)) continue;
  const pj = pkgJson(name); if (!pj) { seen.set(name, { name, missing: true }); continue; }
  const dir = join(nm, name);
  const files = readdirSync(dir);
  const lic = files.filter(f => /^(licen[cs]e|notice|copying)/i.test(f));
  const fonts: string[] = [];
  const walk = (d: string, depth = 0) => { if (depth > 4) return; for (const f of readdirSync(d)) { const p = join(d, f); if (f === 'node_modules') continue; const s = statSync(p); if (s.isDirectory()) walk(p, depth + 1); else if (/\.(woff2?|ttf|otf|eot)$/i.test(f)) fonts.push(p.slice(dir.length + 1)); } };
  walk(dir);
  const firstLine = lic.length ? readFileSync(join(dir, lic[0]), 'utf8').split('\n').find(l => l.trim())?.trim() : null;
  seen.set(name, { name, version: pj.version, license: pj.license ?? pj.licenses ?? null, licenseFiles: lic, licenseFirstLine: firstLine, fontFiles: fonts });
  for (const d of Object.keys(pj.dependencies ?? {})) queue.push(d);
}
const pkgs = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const byLicense: Record<string, number> = {};
for (const p of pkgs) byLicense[String(p.license)] = (byLicense[String(p.license)] ?? 0) + 1;
const report = {
  generatedBy: 'scripts/ui/license-audit.ts', generatedAt: new Date().toISOString(),
  note: 'Package-level OSS licenses plus the icon registry (ui/browser-chrome/assets/icons/registry.json). Icon licensing: docs/icons-and-assets.md. Not legal advice.',
  icons: Object.entries(JSON.parse(readFileSync(join(root, 'ui/browser-chrome/assets/icons/registry.json'), 'utf8')).icons as Record<string, any>)
    .map(([name, e]) => ({ name, kind: e.kind, license: e.license, placeholder: !!e.placeholder, figmaNode: e.figmaNode ?? null })),
  totals: { packages: pkgs.length, byLicense, withoutLicenseFile: pkgs.filter(p => !p.missing && !p.licenseFiles.length).map(p => p.name), packagesShippingFonts: pkgs.filter(p => p.fontFiles?.length).map(p => ({ name: p.name, fonts: p.fontFiles })) },
  packages: pkgs,
};
writeFileSync(join(root, 'docs/evidence/ui-license-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.totals, null, 2));
