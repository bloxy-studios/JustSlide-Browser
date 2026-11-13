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
  // Mint is the only theme; the backdrop (solid or glass) comes from the browser pref.
  useEffect(() => { if (snap) applyTheme(snap.colorMode, snap.backdropColor); }, [snap?.backdropColor]);
  if (!snap) return <div role="status" style={{ padding: 12, font: 'var(--js-type-address)' }}>Connecting to browser…</div>;
  return <Sidebar snap={snap} />;
}
