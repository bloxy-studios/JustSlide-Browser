// DEV-ONLY UI preview with simulated browser state. No web pages are rendered;
// not part of the WebUI bundle and not evidence that the browser works.
//   ?fixture=figma-desktop | figma-compact   reproduce Figma frames 1:6 / 35:13
//   ?backdrop=rrggbb | glass | glass:rrggbb   (mint theme only; owner decision 2026-11-13)
//   ?platform=mac|win|linux   (window-control placement; default mac)
//   ?inactive=1               (non-key window appearance)
import { createRoot } from 'react-dom/client';
import { BridgeProvider, useSnapshot } from './bridge/context';
import { PreviewBridge, previewSeed } from './bridge/preview';
import { figmaCompactSeed, figmaDesktopSeed } from './fixtures/figma';
import { SidebarApp } from './app/SidebarApp';

const params = new URLSearchParams(location.search);
// Emulate the target platform's window chrome (default macOS).
document.documentElement.dataset.platformOverride = params.get('platform') ?? 'mac';
const fixture = params.get('fixture');
const seed = fixture === 'figma-desktop' ? figmaDesktopSeed() : fixture === 'figma-compact' ? figmaCompactSeed() : previewSeed();
const bridge = new PreviewBridge(seed);
const mode = params.get('mode');
if (mode === 'dark' || mode === 'light') bridge.setColorMode(mode);
const bd = params.get('backdrop');
if (params.get('inactive')) bridge.setWindowActive(false);
if (bd) bridge.setBackdropColor(bd.startsWith('glass') ? bd.replace(/:(?!#)/, ':#') : '#' + bd);
(globalThis as any).__justslidePreview = bridge;

function Frame() {
  const snap = useSnapshot()!;
  return (
    <div className="frame" data-fixture={fixture || undefined}>
      <span className="trafficLights" aria-hidden />
      <span className="winControls" aria-hidden />
      <div className="side" data-collapsed={snap.sidebarCollapsed || undefined}><SidebarApp /></div>
      <main className="page" aria-label="Page viewport placeholder">
        <p className="note">UI preview with simulated state. In JustSlide this area is a separate Chromium WebContents surface. Active tab: {snap.displayUrl || 'none'}</p>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<BridgeProvider bridge={bridge}><Frame /></BridgeProvider>);
