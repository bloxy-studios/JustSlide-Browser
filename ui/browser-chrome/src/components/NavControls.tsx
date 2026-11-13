import { useBridge } from '../bridge/context';
import type { ShellSnapshot } from '../bridge/types';
import { IconButton } from '../design-system/IconButton';
import s from './sidebar.module.css';

/** Figma 6:17 "Navigation Controls": right-aligned so macOS window buttons keep the left of the row. */
export function NavControls({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  const loading = snap.tabs.find(t => t.id === snap.activeTabId)?.loading ?? false;
  return (
    <div className={s.nav} role="toolbar" aria-label="Navigation">
      <IconButton icon="sidebar-toggle" label="Hide sidebar" tooltip={false} onClick={() => b.toggleSidebar()} />
      <div className={s.history}>
        <IconButton icon="back" label="Back" tooltip={false} disabled={!snap.canGoBack} onClick={() => b.goBack()} />
        <IconButton icon="forward" label="Forward" tooltip={false} disabled={!snap.canGoForward} onClick={() => b.goForward()} />
        {loading
          ? <IconButton icon="close" iconSize={12} label="Stop loading" tooltip={false} onClick={() => b.stopLoading()} />
          : <IconButton icon="reload" label="Reload" tooltip={false} onClick={() => b.reload()} />}
      </div>
    </div>
  );
}
