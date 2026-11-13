// Generates ui/browser-chrome/src/generated/icons.ts from the icon registry
// (ui/browser-chrome/assets/icons/registry.json) and its SVG sources.
//
// Each SVG becomes a plain element tree rendered with React.createElement, so
// no markup string ever reaches innerHTML and the sidebar needs no Trusted
// Types policy. Glyphs (kind "glyph") are recoloured to currentColor so they
// follow theme tokens; brand marks keep their official colours.
//   bun scripts/ui/gen-icons.ts          # write
//   bun scripts/ui/gen-icons.ts --check  # fail if generated file is stale
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Node = [string, Record<string, string>, Node[]];
type Entry = { file: string; kind: 'glyph' | 'brand'; source: string; figmaNode?: string; license: string; label?: string };

const ui = join(import.meta.dir, '../../ui/browser-chrome');
const reg = JSON.parse(readFileSync(join(ui, 'assets/icons/registry.json'), 'utf8')) as { icons: Record<string, Entry> };
const out = join(ui, 'src/generated/icons.ts');

const ATTR: Record<string, string> = {
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit', 'stroke-opacity': 'strokeOpacity', 'stroke-dasharray': 'strokeDasharray',
  'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'fill-opacity': 'fillOpacity', 'clip-path': 'clipPath',
  'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity', 'xlink:href': 'href', 'color-interpolation-filters': 'colorInterpolationFilters',
  'flood-opacity': 'floodOpacity', 'flood-color': 'floodColor', 'mask-type': 'maskType',
};
const ALLOWED_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'clipPath',
  'linearGradient', 'radialGradient', 'stop', 'mask', 'filter', 'feFlood', 'feColorMatrix', 'feOffset', 'feGaussianBlur', 'feBlend', 'feComposite', 'use']);

// Inline `style` declarations are converted to presentation attributes; only
// these properties are accepted (anything else fails the build).
const STYLE_PROPS = new Set(['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-opacity', 'stroke-dasharray', 'opacity', 'stop-color', 'stop-opacity', 'clip-rule', 'mix-blend-mode', 'isolation']);
const DROP_TAGS = new Set(['title', 'desc', 'style', 'metadata']);

function parse(svg: string, name: string): Node {
  if (/\sclass\s*=/.test(svg)) throw new Error(`${name}: class attributes are not supported (styles would need a <style> element)`);
  const src = svg.replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<(title|desc|style|metadata)\b[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<(title|desc|style|metadata)\b[^>]*\/>/g, '');
  const stack: Node[] = [['#root', {}, []]];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const [, close, tag, attrs, self] = m;
    if (close) { stack.pop(); continue; }
    if (DROP_TAGS.has(tag)) continue;
    if (!ALLOWED_TAGS.has(tag)) throw new Error(`${name}: disallowed SVG element <${tag}>`);
    const a: Record<string, string> = {};
    for (const am of attrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      const k = am[1];
      if (/^on/i.test(k)) throw new Error(`${name}: disallowed attribute ${k}`);
      if (k === 'xmlns' || k === 'xmlns:xlink' || k === 'version' || k.startsWith('sodipodi') || k.startsWith('inkscape')) continue;
      if (k === 'style') {
        for (const decl of am[2].split(';').map(d => d.trim()).filter(Boolean)) {
          const [prop, ...rest] = decl.split(':'); const p = prop.trim(); const v = rest.join(':').trim();
          if (!STYLE_PROPS.has(p)) throw new Error(`${name}: unsupported style property ${p}`);
          if (/url\((?!#)/.test(v) || /expression|javascript:/i.test(v)) throw new Error(`${name}: unsafe style value ${v}`);
          a[ATTR[p] ?? p] = v;
        }
        continue;
      }
      if (k === 'href' || k === 'xlink:href') { if (!am[2].startsWith('#')) throw new Error(`${name}: external reference ${am[2]}`); }
      a[ATTR[k] ?? k] = am[2];
    }
    const n: Node = [tag, a, []];
    stack[stack.length - 1][2].push(n);
    if (!self) stack.push(n);
  }
  const root = stack[0][2][0];
  if (!root || root[0] !== 'svg') throw new Error(`${name}: no <svg> root`);
  return root;
}

function transform(n: Node, name: string, kind: Entry['kind']): Node {
  const [tag, a, kids] = n;
  const b: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    let val = v;
    if (k === 'id') val = `${name}-${v}`;
    else if (/url\(#/.test(v)) val = v.replace(/url\(#([^)]+)\)/g, (_s, id) => `url(#${name}-${id})`);
    else if (k === 'href' && v.startsWith('#')) val = `#${name}-${v.slice(1)}`;
    else if (kind === 'glyph' && (k === 'fill' || k === 'stroke') && v !== 'none' && !insideDefs.has(n)) val = 'currentColor';
    b[k] = val;
  }
  const isDefs = tag === 'defs' || tag === 'clipPath' || tag === 'mask';
  if (isDefs) markDefs(n);
  return [tag, b, kids.map(k => transform(k, name, kind))];
}
const insideDefs = new Set<Node>();
function markDefs(n: Node) { for (const k of n[2]) { insideDefs.add(k); markDefs(k); } }

const entries = Object.entries(reg.icons).sort(([a], [b]) => a.localeCompare(b));
const result: Record<string, { kind: string; viewBox: string; width: number; height: number; root: Record<string, string>; children: Node[] }> = {};
const problems: string[] = [];
for (const [name, e] of entries) {
  const p = join(ui, 'assets/icons', e.file);
  if (!existsSync(p)) { problems.push(`${name}: missing ${e.file}`); continue; }
  try {
    const root = transform(parse(readFileSync(p, 'utf8'), name), name, e.kind);
    const [, a, kids] = root;
    const vb = (a.viewBox ?? `0 0 ${a.width} ${a.height}`).trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(n => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) throw new Error(`${name}: bad viewBox`);
    // Intrinsic size: explicit width/height (Figma exports) or the viewBox (theSVG).
    const width = Number.parseFloat(a.width ?? '') || vb[2];
    const height = Number.parseFloat(a.height ?? '') || vb[3];
    // Root presentation attributes matter (theSVG marks set fill on <svg> or rely
    // on SVG's default black fill). Brand marks never inherit theme colour:
    // `currentColor` resolves to the mark's ink (registry `ink`, default black).
    const rootAttrs: Record<string, string> = {};
    for (const k of ['fill', 'fillRule', 'clipRule', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'preserveAspectRatio']) if (a[k]) rootAttrs[k] = a[k];
    if (e.kind === 'brand') {
      const ink = (e as any).ink ?? '#000000';
      rootAttrs.fill = !rootAttrs.fill || rootAttrs.fill === 'currentColor' ? ink : rootAttrs.fill;
      const fix = (n: Node): Node => [n[0], Object.fromEntries(Object.entries(n[1]).map(([k, v]) => [k, v === 'currentColor' ? ink : v])), n[2].map(fix)];
      kids.splice(0, kids.length, ...kids.map(fix));
    } else {
      rootAttrs.fill = rootAttrs.fill ?? 'none';
    }
    result[name] = { kind: e.kind, viewBox: vb.join(' '), width, height, root: rootAttrs, children: kids };
  } catch (err) { problems.push(String((err as Error).message)); }
}
// Nucleo Standard License: at most 100 Nucleo icons in publicly accessible source files.
const nucleo = entries.filter(([, e]) => /^Nucleo/.test(e.license)).length;
if (nucleo > 100) problems.push(`${nucleo} Nucleo icons exceed the Standard License public-source limit of 100`);
if (problems.length) { console.error('icon generation failed:\n  ' + problems.join('\n  ')); process.exit(1); }

const body = `// GENERATED by scripts/ui/gen-icons.ts from assets/icons/registry.json. Do not edit.\n` +
  `/* eslint-disable */\nexport type SvgNode = [string, Record<string, string>, SvgNode[]];\n` +
  `export interface IconDef { kind: 'glyph' | 'brand'; viewBox: string; width: number; height: number; root: Record<string, string>; children: SvgNode[] }\n` +
  `export const ICONS = ${JSON.stringify(result)} as const satisfies Record<string, IconDef>;\n` +
  `export type IconName = keyof typeof ICONS;\n`;
if (process.argv.includes('--check')) {
  const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (cur !== body) { console.error('src/generated/icons.ts is stale: run bun run build:icons'); process.exit(1); }
  console.error(`icons up to date (${entries.length}, ${nucleo} Nucleo)`);
} else {
  writeFileSync(out, body);
  console.error(`wrote ${entries.length} icons (${nucleo} Nucleo) -> ${out}`);
}
