import { useBridge } from '../bridge/context';
import type { ShellSnapshot } from '../bridge/types';
import { IconButton } from '../design-system/IconButton';
import s from './sidebar.module.css';

const MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
const key = (mac: string, other: string) => (MAC ? mac : other);

/**
 * Title-bar row. On macOS the traffic lights occupy the leading 78 px; the
 * sidebar toggle follows them (as in Finder/Safari on macOS 26) and history
 * controls sit at the trailing edge. Help tags include the keyboard shortcut.
 */
export function NavControls({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  const loading = snap.tabs.find(t => t.id === snap.activeTabId)?.loading ?? false;
  return (
    <div className={s.nav} role="toolbar" aria-label="Navigation">
      <IconButton icon="sidebar-toggle" label="Hide sidebar" tooltip={`Hide Sidebar (${key('⌃⌘S', 'Ctrl+Shift+S')})`} onClick={() => b.toggleSidebar()} />
      <span className={s.navSpacer} />
      <div className={s.history}>
        <IconButton icon="back" label="Back" tooltip={`Back (${key('⌘[', 'Alt+Left')})`} disabled={!snap.canGoBack} onClick={() => b.goBack()} />
        <IconButton icon="forward" label="Forward" tooltip={`Forward (${key('⌘]', 'Alt+Right')})`} disabled={!snap.canGoForward} onClick={() => b.goForward()} />
        {loading
          ? <IconButton icon="close" iconSize={12} label="Stop loading" tooltip={`Stop (${key('⌘.', 'Esc')})`} onClick={() => b.stopLoading()} />
          : <IconButton icon="reload" label="Reload" tooltip={`Reload (${key('⌘R', 'Ctrl+R')})`} onClick={() => b.reload()} />}
      </div>
    </div>
  );
}
