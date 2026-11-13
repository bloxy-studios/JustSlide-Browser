// TEST-ONLY stand-in for the Chromium-generated justslide_shell.mojom-webui.js.
// Lets tests/visual/webui-csp.ts exercise the production sidebar bundle under
// the real WebUI CSP in Chrome for Testing. It is not Mojo and never ships.
const snapshot = {
  revision: 1n, selectedWorkspaceId: 'ws_personal01', activeTabId: 'tab_a', sidebarCollapsed: false,
  displayUrl: 'https://example.com/a', securityLevel: 1, origin: 'example.com', canGoBack: true, canGoForward: false,
  workspaces: [
    { id: 'ws_personal01', name: 'Personal', icon: 0, profileKind: 0, agentOwned: false },
    { id: 'ws_chatgpt001', name: 'ChatGPT', icon: 1, profileKind: 0, agentOwned: false },
    { id: 'ws_claude0001', name: 'Claude Code', icon: 2, profileKind: 0, agentOwned: false },
    { id: 'ws_agent0001', name: 'Research agent', icon: 3, profileKind: 1, agentOwned: true },
  ],
  tabs: [
    { id: 'tab_p', workspaceId: 'ws_personal01', url: { url: 'https://example.com/pinned' }, title: 'Pinned example', pinned: true, loading: false, active: false, openedBy: 0, crashed: false, audible: false, hasError: false },
    { id: 'tab_a', workspaceId: 'ws_personal01', url: { url: 'https://example.com/a' }, title: 'Example A — a long title that should truncate inside the compact sidebar', pinned: false, loading: false, active: true, openedBy: 0, crashed: false, audible: false, hasError: false },
    { id: 'tab_b', workspaceId: 'ws_personal01', url: { url: 'https://example.com/b' }, title: 'Example B', pinned: false, loading: true, active: false, openedBy: 1, crashed: false, audible: false, hasError: false },
  ],
  favorites: [
    { id: 'fav_1', url: { url: 'https://chatgpt.com/' }, title: 'ChatGPT' },
    { id: 'fav_2', url: { url: 'https://claude.ai/' }, title: 'Claude' },
  ],
  agents: [{ grantId: 'g1', clientName: 'Cursor (local MCP)', workspaceIds: ['ws_agent0001'], state: 0, lastAction: 'Opened example.com/b in the background', pending: [] }],
  colorMode: Number(new URLSearchParams(location.search).get('mode') ?? 0), backdropColor: '',
};
const calls = (globalThis.__mojoCalls = []);
const listeners = [];
export class PageCallbackRouter {
  constructor() { this.$ = { bindNewPipeAndPassRemote: () => ({}) }; this.snapshotChanged = { addListener: (f) => listeners.push(f) }; this.focusAddressField = { addListener: () => 0 }; }
}
export class PageHandlerRemote {
  constructor() {
    this.$ = { bindNewPipeAndPassReceiver: () => ({}) };
    return new Proxy(this, { get: (t, k) => k in t ? t[k] : (...a) => { calls.push([k, a]); } });
  }
  getSnapshot() { return Promise.resolve({ snapshot }); }
}
export const PageHandlerFactory = { getRemote: () => ({ createPageHandler: () => {} }) };
