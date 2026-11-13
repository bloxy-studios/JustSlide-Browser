// Trusted Types for the sidebar WebUI.
//
// Chromium WebUI enforces `require-trusted-types-for 'script'`. ADS icons
// (@atlaskit/icon) render their SVG glyphs through dangerouslySetInnerHTML,
// i.e. a string assignment to Element.innerHTML, which is blocked unless a
// policy converts it. JustSlide's data source therefore allows exactly one
// policy name, `default`, and this module installs it before any React code
// runs. It accepts ONLY byte-identical glyph strings from the build-time
// allowlist (src/generated/icon-glyphs.ts); everything else is rejected and
// the assignment fails closed. No createScript / createScriptURL is provided.
import { ICON_GLYPHS } from './generated/icon-glyphs';

const allowed = new Set(ICON_GLYPHS.values());

export function isAllowedGlyph(value: string): boolean {
  return allowed.has(value);
}

type TT = { createPolicy(name: string, rules: { createHTML?: (v: string, type?: string, sink?: string) => string | null }): unknown };
const tt = (globalThis as unknown as { trustedTypes?: TT }).trustedTypes;
if (tt) {
  tt.createPolicy('default', {
    createHTML(value, _type, sink) {
      if (sink === 'Element innerHTML' && isAllowedGlyph(value)) return value;
      console.error(`JustSlide: blocked untrusted HTML for sink ${sink ?? 'unknown'}`);
      return null;
    },
  });
}
