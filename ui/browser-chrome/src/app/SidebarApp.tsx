import { useEffect } from 'react';
import { useSnapshot } from '../bridge/context';
import { Sidebar } from '../components/Sidebar';
import { applyTheme } from './theme';

/**
 * Root of the trusted sidebar WebUI. In the native browser this document
 * fills only the sidebar region; page WebContents are separate native views.
 */
export function SidebarApp() {
  const snap = useSnapshot();
  // Mint is the only theme; backdrop (solid or glass) and key-window state come from the browser.
  useEffect(() => {
    if (snap) applyTheme(snap.colorMode, snap.backdropColor, document.documentElement, { windowActive: snap.windowActive });
  }, [snap?.backdropColor, snap?.windowActive]);
  if (!snap) return <div role="status" style={{ padding: 12, font: 'var(--js-type-caption)' }}>Connecting to browser…</div>;
  return <Sidebar snap={snap} />;
}
