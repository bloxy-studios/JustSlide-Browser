import type { ColorMode } from '../bridge/types';

/** Mint backdrop from Figma variable mode 50:0 (frame 1:6). Default appearance. */
export const MINT_BACKDROP = '#acfff7';

/**
 * Appearance = the single mint token theme + a user backdrop (owner decision
 * 2026-11-13: no dark mode; the background is customisable, including glass).
 *   ""              → mint
 *   "#rrggbb"       → solid custom backdrop
 *   "glass"         → frosted see-through, mint tint
 *   "glass:#rrggbb" → frosted see-through, custom tint
 * `colorMode` is kept in the protocol for compatibility and ignored here.
 */
export type Backdrop = { material: 'solid' | 'glass'; color: string };
export type Platform = 'mac' | 'win' | 'linux';

export function parseBackdrop(value: string): Backdrop {
  const v = (value || '').trim().toLowerCase();
  if (v === 'glass') return { material: 'glass', color: MINT_BACKDROP };
  const g = /^glass:(#[0-9a-f]{6})$/.exec(v);
  if (g) return { material: 'glass', color: g[1] };
  if (/^#[0-9a-f]{6}$/.test(v)) return { material: 'solid', color: v };
  return { material: 'solid', color: MINT_BACKDROP };
}

/** Platform of the browser itself (trusted UI; used only for layout conventions). */
export function detectPlatform(nav: { platform?: string; userAgentData?: { platform?: string } } = globalThis.navigator ?? {}): Platform {
  // Preview harness can emulate a platform (default macOS: JustSlide is Mac-first).
  const forced = typeof document !== 'undefined' ? document.documentElement.dataset.platformOverride : undefined;
  if (forced === 'mac' || forced === 'win' || forced === 'linux') return forced;
  const p = (nav.userAgentData?.platform || nav.platform || '').toLowerCase();
  if (p.includes('mac')) return 'mac';
  if (p.includes('win')) return 'win';
  return p ? 'linux' : 'mac';
}

function rgba(hex: string, a: string) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function applyTheme(_mode: ColorMode, backdrop: string, el: HTMLElement = document.documentElement,
                           opts: { windowActive?: boolean; platform?: Platform } = {}): Backdrop {
  const b = parseBackdrop(backdrop);
  el.dataset.theme = 'mint';
  el.dataset.material = b.material;
  el.dataset.platform = opts.platform ?? detectPlatform();
  el.dataset.window = opts.windowActive === false ? 'inactive' : 'active';
  const custom = b.material === 'glass' || b.color !== MINT_BACKDROP;
  const fill = b.material === 'glass' ? rgba(b.color, 'var(--js-glass-tint-alpha)') : b.color;
  for (const v of ['--js-color-frame', '--js-color-sidebar']) {
    if (custom) el.style.setProperty(v, fill); else el.style.removeProperty(v);
  }
  // Opaque fallback for "Reduce transparency".
  el.style.setProperty('--js-color-frame-opaque', b.color);
  return b;
}
