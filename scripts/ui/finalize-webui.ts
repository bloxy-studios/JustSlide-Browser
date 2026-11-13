// Copies the static CSP-clean HTML shell next to the Parcel output, writes a
// resource manifest consumed by GN (browser/resources/BUILD.gn) and fails if
// the bundle violates WebUI invariants. Run via `bun run build:ui`.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ui = join(import.meta.dir, '../../ui/browser-chrome');
const out = join(ui, 'dist/webui');
// sidebar.html is produced by Parcel from src/sidebar.html.

const files = readdirSync(out).filter(f => !f.startsWith('.') && f !== 'manifest.json').sort();
const problems: string[] = [];
const allowedHosts = new Set(['www.w3.org', 'react.dev']);
const remote = new Set<string>();
for (const f of files) {
  const text = readFileSync(join(out, f), 'utf8');
  if (f.endsWith('.html') && /<script(?![^>]*\bsrc=)[^>]*>/i.test(text)) problems.push(`${f}: inline <script> (blocked by WebUI CSP)`);
  if (f.endsWith('.html') && /importmap/i.test(text)) problems.push(`${f}: import map`);
  if (/\beval\s*\(|new Function\s*\(/.test(text)) problems.push(`${f}: eval/new Function`);
  if (/PreviewBridge|previewSeed|UI preview — simulated/.test(text)) problems.push(`${f}: preview-only code bundled`);
  if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(text)) problems.push(`${f}: dev server reference`);
  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) if (!allowedHosts.has(m[1])) remote.add(m[1]);
}
const manifest = {
  generatedBy: 'scripts/ui/finalize-webui.ts',
  files: files.map(f => ({ path: f, bytes: statSync(join(out, f)).size, sha256: createHash('sha256').update(readFileSync(join(out, f))).digest('hex') })),
  // Remote hostnames present as string literals (e.g. ADS feature-gate client
  // endpoints). Network use is blocked at runtime by `connect-src 'none'` and
  // verified by tests/visual/webui-csp.ts; this list is reviewed on upgrades.
  remoteHostLiterals: [...remote].sort(),
};
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const expected = JSON.parse(readFileSync(join(import.meta.dir, 'remote-host-allowlist.json'), 'utf8')) as string[];
const unexpected = manifest.remoteHostLiterals.filter(h => !expected.includes(h));
if (unexpected.length) problems.push(`new remote host literals (review, then update scripts/ui/remote-host-allowlist.json): ${unexpected.join(', ')}`);
if (problems.length) { console.error('WebUI bundle audit FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.error(`WebUI bundle ok: ${files.length} files, ${manifest.files.reduce((a, f) => a + f.bytes, 0)} bytes -> ${out}`);
