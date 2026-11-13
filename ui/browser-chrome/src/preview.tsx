/** @jsxRuntime classic */
/** @jsx jsx */
// DEV-ONLY UI preview. Simulated state; no web pages are rendered. Not part of
// the native WebUI bundle and not evidence that the browser works.
import { createRoot } from 'react-dom/client';
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import SectionMessage from '@atlaskit/section-message';
import { BridgeProvider, useSnapshot } from './bridge/context';
import { PreviewBridge } from './bridge/preview';
import { SidebarApp } from './app/SidebarApp';
import { applyColorMode } from './app/theme';

const styles = cssMap({
  frame: { display: 'flex', height: '100vh', gap: token('space.100'), padding: token('space.100'), boxSizing: 'border-box', backgroundColor: token('elevation.surface.sunken') },
  side: { width: '240px', flexShrink: 0, height: '100%' },
  sideCollapsed: { width: '48px' },
  viewport: {
    flexGrow: 1, borderRadius: token('radius.xlarge'), backgroundColor: token('elevation.surface'), boxShadow: token('elevation.shadow.raised'),
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: token('space.400'),
  },
});

const params = new URLSearchParams(location.search);
const bridge = new PreviewBridge();
const mode = params.get('mode');
if (mode === 'dark' || mode === 'light') bridge.setColorMode(mode);
if (params.get('backdrop')) bridge.setBackdropColor('#' + params.get('backdrop'));
(globalThis as any).__justslidePreview = bridge;

function Frame() {
  const snap = useSnapshot()!;
  return (
    <div css={styles.frame} style={snap.backdropColor ? { backgroundColor: snap.backdropColor } : undefined}>
      <div css={[styles.side, snap.sidebarCollapsed && styles.sideCollapsed]}><SidebarApp /></div>
      <main css={styles.viewport} aria-label="Page viewport placeholder">
        <SectionMessage appearance="warning" title="UI preview — simulated browser state">
          <p>This is not JustSlide. In the native browser this area is a separate Chromium WebContents surface, never DOM inside the sidebar.</p>
          <p>Active tab (simulated): {snap.displayUrl || 'none'}</p>
        </SectionMessage>
      </main>
    </div>
  );
}
applyColorMode('system');
createRoot(document.getElementById('root')!).render(<BridgeProvider bridge={bridge}><Frame /></BridgeProvider>);
