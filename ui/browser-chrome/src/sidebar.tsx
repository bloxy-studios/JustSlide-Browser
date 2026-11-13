// Production entry for chrome://justslide-sidebar.top-chrome (trusted WebUI).
// Built from src/sidebar.html (Compiled injects extracted CSS into HTML).
// Must be first: installs the Trusted Types policy before React/ADS run.
import "./trusted-types";
import { createRoot } from "react-dom/client";
import { BridgeProvider } from './bridge/context';
import { connectMojoBridge } from './bridge/mojo';
import { SidebarApp } from './app/SidebarApp';
import { applyColorMode } from './app/theme';

applyColorMode('system');
const root = createRoot(document.getElementById('root')!);
connectMojoBridge().then(
  (bridge) => root.render(<BridgeProvider bridge={bridge}><SidebarApp /></BridgeProvider>),
  (err) => { console.error('JustSlide sidebar: Mojo bridge unavailable', err); document.getElementById('root')!.textContent = 'Browser connection unavailable.'; },
);
