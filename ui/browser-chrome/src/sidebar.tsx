// Production entry for chrome://justslide-sidebar.top-chrome (trusted WebUI).
// No Trusted Types policy is installed: nothing in the shell writes HTML strings.
import { createRoot } from 'react-dom/client';
import { BridgeProvider } from './bridge/context';
import { connectMojoBridge } from './bridge/mojo';
import { SidebarApp } from './app/SidebarApp';
import { applyTheme } from './app/theme';

applyTheme('system', '');
const root = createRoot(document.getElementById('root')!);
connectMojoBridge().then(
  (bridge) => root.render(<BridgeProvider bridge={bridge}><SidebarApp /></BridgeProvider>),
  (err) => { console.error('JustSlide sidebar: Mojo bridge unavailable', err); document.getElementById('root')!.textContent = 'Browser connection unavailable.'; },
);
