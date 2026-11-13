import { describe, expect, it } from 'vitest';
import { ICON_GLYPHS } from '../generated/icon-glyphs';
import { isAllowedGlyph } from '../trusted-types';

describe('Trusted Types glyph allowlist', () => {
  it('contains only SVG shape markup and accepts exact glyphs', () => {
    expect(ICON_GLYPHS.size).toBeGreaterThan(10);
    for (const [name, g] of ICON_GLYPHS) {
      expect(g, name).not.toMatch(/<\s*(script|foreignObject|iframe|use)\b|\son[a-z]+=|javascript:/i);
      expect(isAllowedGlyph(g)).toBe(true);
    }
  });
  it('rejects anything else', () => {
    const one = [...ICON_GLYPHS.values()][0];
    for (const bad of ['<img src=x onerror=alert(1)>', one + '<script>x</script>', one.slice(0, -1), '<svg onload=alert(1)>', '']) expect(isAllowedGlyph(bad)).toBe(false);
  });
});
