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
  useEffect(() => {
    if (!snap) return;
    applyTheme(snap.colorMode, snap.backdropColor);
    if (snap.colorMode !== 'system' || typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const h = () => applyTheme(snap.colorMode, snap.backdropColor);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [snap?.colorMode, snap?.backdropColor]);
  if (!snap) return <div role="status" style={{ padding: 12, font: 'var(--js-type-address)' }}>Connecting to browser…</div>;
  return <Sidebar snap={snap} />;
}
