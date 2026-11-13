import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import type { ColorMode } from '../bridge/types';

let applied: ColorMode | null = null;
export function applyColorMode(mode: ColorMode) {
  if (mode === applied) return;
  applied = mode;
  void setGlobalTheme({ light: 'light', dark: 'dark', colorMode: mode === 'system' ? 'auto' : mode });
}
