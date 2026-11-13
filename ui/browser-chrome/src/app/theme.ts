import type { ColorMode } from '../bridge/types';

/** Mint backdrop from Figma variable mode 50:0 (frame 1:6). Default appearance. */
export const MINT_BACKDROP = '#acfff7';
export type Theme = 'mint' | 'light' | 'dark';

export function resolveTheme(mode: ColorMode, backdrop: string, prefersDark: boolean): Theme {
  const dark = mode === 'dark' || (mode === 'system' && prefersDark);
  if (dark) return 'dark';
  const bd = (backdrop || MINT_BACKDROP).toLowerCase();
  return bd === MINT_BACKDROP ? 'mint' : 'light';
}

/** Applies theme tokens; a custom backdrop tints only the frame/sidebar so controls stay readable. */
export function applyTheme(mode: ColorMode, backdrop: string, el: HTMLElement = document.documentElement) {
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const theme = resolveTheme(mode, backdrop, !!mq?.matches);
  el.dataset.theme = theme;
  const custom = backdrop && backdrop.toLowerCase() !== MINT_BACKDROP && /^#[0-9a-f]{6}$/i.test(backdrop) && theme !== 'dark';
  for (const v of ['--js-color-frame', '--js-color-sidebar']) {
    if (custom) el.style.setProperty(v, backdrop); else el.style.removeProperty(v);
  }
  return theme;
}
