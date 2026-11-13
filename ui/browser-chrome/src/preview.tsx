// DEV-ONLY UI preview with simulated browser state. No web pages are rendered;
// not part of the WebUI bundle and not evidence that the browser works.
//   ?fixture=figma-desktop | figma-compact   reproduce Figma frames 1:6 / 35:13
//   ?mode=light|dark  ?backdrop=rrggbb
import { createRoot } from 'react-dom/client';
import { BridgeProvider, useSnapshot } from './bridge/context';
import { PreviewBridge, previewSeed } from './bridge/preview';
import { figmaCompactSeed, figmaDesktopSeed } from './fixtures/figma';
import { SidebarApp } from './app/SidebarApp';

const params = new URLSearchParams(location.search);
const fixture = params.get('fixture');
const seed = fixture === 'figma-desktop' ? figmaDesktopSeed() : fixture === 'figma-compact' ? figmaCompactSeed() : previewSeed();
const bridge = new PreviewBridge(seed);
const mode = params.get('mode');
if (mode === 'dark' || mode === 'light') bridge.setColorMode(mode);
if (params.get('backdrop')) bridge.setBackdropColor('#' + params.get('backdrop'));
(globalThis as any).__justslidePreview = bridge;

function Frame() {
  const snap = useSnapshot()!;
  return (
    <div className="frame" data-fixture={fixture || undefined}>
      <div className="side" data-collapsed={snap.sidebarCollapsed || undefined}><SidebarApp /></div>
      <main className="page" aria-label="Page viewport placeholder">
        <p className="note">UI preview with simulated state. In JustSlide this area is a separate Chromium WebContents surface. Active tab: {snap.displayUrl || 'none'}</p>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<BridgeProvider bridge={bridge}><Frame /></BridgeProvider>);
