// PREVIEW bridge: simulated, in-memory browser state for `bun run dev:ui` and
// component tests. It is NOT JustSlide, does not render web pages and must
// never be bundled into the WebUI resources (enforced by scripts/ui/finalize-webui.ts).
import { classifyInputForPreview } from '../lib/input';
import type { ColorMode, ContextMenuKind, ShellBridge, ShellSnapshot, TabInfo } from './types';

let counter = 100;
const nid = (p: string) => `${p}_preview${(counter++).toString(36).padStart(4, '0')}`;

export function previewSeed(): ShellSnapshot {
  const tabs: TabInfo[] = [
    { id: 'tab_preview01', workspaceId: 'ws_personal01', url: 'https://www.figma.com/', title: 'Figma', pinned: true, loading: false, active: false, openedBy: 'user', crashed: false, audible: false, hasError: false },
    { id: 'tab_preview02', workspaceId: 'ws_personal01', url: 'https://github.com/bloxy-studios/JustSlide-Browser', title: 'bloxy-studios/JustSlide-Browser: a Chromium-based everyday browser with permission-controlled programmability', pinned: false, loading: false, active: true, openedBy: 'user', crashed: false, audible: false, hasError: false },
    { id: 'tab_preview03', workspaceId: 'ws_personal01', url: 'https://nucleoapp.com/', title: 'Nucleo – icon manager', pinned: false, loading: true, active: false, openedBy: 'user', crashed: false, audible: true, hasError: false },
    { id: 'tab_preview04', workspaceId: 'ws_agent0001', url: 'https://example.com/research', title: 'Example research page', pinned: false, loading: false, active: false, openedBy: 'agent', crashed: false, audible: false, hasError: false },
  ];
  return {
    revision: 1,
    selectedWorkspaceId: 'ws_personal01',
    activeTabId: 'tab_preview02',
    sidebarCollapsed: false,
    displayUrl: 'https://github.com/bloxy-studios/JustSlide-Browser',
    securityLevel: 'secure',
    origin: 'github.com',
    canGoBack: true,
    canGoForward: false,
    workspaces: [
      { id: 'ws_personal01', name: 'Personal', icon: 'personal', profileKind: 'personal', agentOwned: false },
      { id: 'ws_codex00001', name: 'Codex', icon: 'codex', profileKind: 'personal', agentOwned: false },
      { id: 'ws_claude0001', name: 'Claude Code', icon: 'claude-code', profileKind: 'personal', agentOwned: false },
      { id: 'ws_chatgpt001', name: 'ChatGPT', icon: 'chatgpt', profileKind: 'personal', agentOwned: false },
      { id: 'ws_agent0001', name: 'Research agent', icon: 'agent', profileKind: 'agent-isolated', agentOwned: true },
    ],
    tabs,
    favorites: [], // users add favorites by dragging tabs or links onto the grid
    agents: [
      { grantId: 'grant_preview1', clientName: 'Cursor (local MCP)', workspaceIds: ['ws_agent0001'], state: 'active', lastAction: 'Opened example.com/research in the background', pending: [
        { id: 'req_preview01', grantId: 'grant_preview1', workspaceId: 'ws_agent0001', kind: 'download', summary: 'Download report.pdf from example.com', origin: 'https://example.com' },
      ] },
    ],
    colorMode: 'system',
    backdropColor: '',
    windowActive: true,
  };
}

export class PreviewBridge implements ShellBridge {
  readonly kind = 'preview' as const;
  private snap: ShellSnapshot;
  private listeners = new Set<() => void>();
  private focusListeners = new Set<() => void>();
  private renameListeners = new Set<(id: string) => void>();
  private closed: TabInfo[] = [];
  readonly log: Array<[string, unknown[]]> = [];

  constructor(seed: ShellSnapshot = previewSeed()) { this.snap = seed; }

  getSnapshot() { return this.snap; }
  subscribe(l: () => void) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  onFocusAddressField(l: () => void) { this.focusListeners.add(l); return () => { this.focusListeners.delete(l); }; }
  requestFocusAddressField() { this.focusListeners.forEach(l => l()); }
  onRenameWorkspace(l: (id: string) => void) { this.renameListeners.add(l); return () => { this.renameListeners.delete(l); }; }
  /** Preview: the UI falls back to its own menu; this records the request. */
  showContextMenu(kind: ContextMenuKind, id: string, x: number, y: number, fromKeyboard: boolean) { this.log.push(['showContextMenu', [kind, id, x, y, fromKeyboard]]); }
  startRenameWorkspace(id: string) { this.renameListeners.forEach(l => l(id)); }
  setWindowActive(active: boolean) { this.update('external:windowActive', [active], s => ({ ...s, windowActive: active })); }

  private update(name: string, args: unknown[], fn: (s: ShellSnapshot) => ShellSnapshot) {
    this.log.push([name, args]);
    this.snap = { ...fn(structuredClone(this.snap)), revision: this.snap.revision + 1 };
    this.listeners.forEach(l => l());
  }
  private syncActive(s: ShellSnapshot): ShellSnapshot {
    const t = s.tabs.find(x => x.id === s.activeTabId);
    s.tabs = s.tabs.map(x => ({ ...x, active: x.id === s.activeTabId }));
    s.displayUrl = t?.url ?? '';
    try { const u = new URL(s.displayUrl); s.origin = u.host; s.securityLevel = u.protocol === 'https:' ? 'secure' : 'insecure'; } catch { s.origin = ''; s.securityLevel = 'unknown'; }
    return s;
  }
  /** Simulates an agent change arriving from the browser (not from React). */
  simulateExternalTab(workspaceId: string, url: string) {
    this.update('external:tab.created', [workspaceId, url], s => { s.tabs.push({ id: nid('tab'), workspaceId, url, title: url, pinned: false, loading: true, active: false, openedBy: 'agent', crashed: false, audible: false, hasError: false }); return s; });
  }

  navigateFromInput(text: string) {
    const c = classifyInputForPreview(text);
    if (c.kind === 'rejected') { this.log.push(['navigateFromInput:rejected', [text]]); return; }
    this.update('navigateFromInput', [text], s => { s.tabs = s.tabs.map(t => t.id === s.activeTabId ? { ...t, url: c.url, title: c.url, loading: true } : t); return this.syncActive(s); });
  }
  stopLoading() { this.update('stopLoading', [], s => { s.tabs = s.tabs.map(t => t.id === s.activeTabId ? { ...t, loading: false } : t); return s; }); }
  showDownloads() { this.log.push(['showDownloads', []]); }
  goBack() { this.update('goBack', [], s => s); }
  goForward() { this.update('goForward', [], s => s); }
  reload() { this.update('reload', [], s => { s.tabs = s.tabs.map(t => t.id === s.activeTabId ? { ...t, loading: true } : t); return s; }); }
  toggleSidebar() { this.update('toggleSidebar', [], s => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed })); }
  selectTab(id: string) { this.update('selectTab', [id], s => this.syncActive({ ...s, activeTabId: id })); }
  createTab() { this.update('createTab', [], s => { const id = nid('tab'); s.tabs.push({ id, workspaceId: s.selectedWorkspaceId, url: 'chrome://newtab/', title: 'New Tab', pinned: false, loading: false, active: true, openedBy: 'user', crashed: false, audible: false, hasError: false }); return this.syncActive({ ...s, activeTabId: id }); }); }
  closeTab(id: string) {
    this.update('closeTab', [id], s => {
      const i = s.tabs.findIndex(t => t.id === id);
      if (i < 0) return s;
      this.closed.push(s.tabs[i]);
      s.tabs.splice(i, 1);
      if (s.activeTabId === id) { const next = s.tabs.filter(t => t.workspaceId === s.selectedWorkspaceId)[Math.max(0, i - 1)]; s.activeTabId = next?.id ?? ''; }
      return this.syncActive(s);
    });
  }
  reopenClosedTab() { const t = this.closed.pop(); if (t) this.update('reopenClosedTab', [], s => { s.tabs.push({ ...t, openedBy: 'restore' }); return this.syncActive({ ...s, activeTabId: t.id }); }); }
  setTabPinned(id: string, pinned: boolean) { this.update('setTabPinned', [id, pinned], s => { s.tabs = s.tabs.map(t => t.id === id ? { ...t, pinned } : t); return s; }); }
  moveTab(id: string, delta: number) { this.update('moveTab', [id, delta], s => { const i = s.tabs.findIndex(t => t.id === id); const j = i + delta; if (i < 0 || j < 0 || j >= s.tabs.length) return s; const [t] = s.tabs.splice(i, 1); s.tabs.splice(j, 0, t); return s; }); }
  selectWorkspace(id: string) { this.update('selectWorkspace', [id], s => { const first = s.tabs.find(t => t.workspaceId === id); return this.syncActive({ ...s, selectedWorkspaceId: id, activeTabId: first?.id ?? '' }); }); }
  createWorkspace(name: string) { this.update('createWorkspace', [name], s => { s.workspaces.push({ id: nid('ws'), name, icon: 'generic', profileKind: 'personal', agentOwned: false }); return s; }); }
  renameWorkspace(id: string, name: string) { this.update('renameWorkspace', [id, name], s => { s.workspaces = s.workspaces.map(w => w.id === id ? { ...w, name } : w); return s; }); }
  addFavoriteForActiveTab() { this.update('addFavoriteForActiveTab', [], s => { const t = s.tabs.find(x => x.id === s.activeTabId); if (t && !s.favorites.some(f => f.url === t.url)) s.favorites.push({ id: nid('fav'), url: t.url, title: t.title }); return s; }); }
  private insertFavorite(s: ShellSnapshot, url: string, title: string, index: number) {
    if (!/^https?:\/\//i.test(url) || s.favorites.some(f => f.url === url)) return s;
    const fav = { id: nid('fav'), url, title: title.slice(0, 256) };
    const at = index < 0 || index > s.favorites.length ? s.favorites.length : index;
    s.favorites.splice(at, 0, fav);
    return s;
  }
  addFavoriteFromTab(tabId: string, index: number) { this.update('addFavoriteFromTab', [tabId, index], s => { const t = s.tabs.find(x => x.id === tabId); return t ? this.insertFavorite(s, t.url, t.title, index) : s; }); }
  addFavoriteFromUrl(url: string, title: string, index: number) { this.update('addFavoriteFromUrl', [url, title, index], s => this.insertFavorite(s, url, title, index)); }
  removeFavorite(id: string) { this.update('removeFavorite', [id], s => { s.favorites = s.favorites.filter(f => f.id !== id); return s; }); }
  moveFavorite(id: string, delta: number) { this.update('moveFavorite', [id, delta], s => { const i = s.favorites.findIndex(f => f.id === id); const j = Math.max(0, Math.min(s.favorites.length - 1, i + delta)); if (i < 0 || j === i) return s; const [f] = s.favorites.splice(i, 1); s.favorites.splice(j, 0, f); return s; }); }
  openFavorite(id: string) { const f = this.snap.favorites.find(x => x.id === id); if (f) this.navigateFromInput(f.url); }
  resolvePendingRequest(id: string, approve: boolean) { this.update('resolvePendingRequest', [id, approve], s => { s.agents = s.agents.map(a => ({ ...a, pending: a.pending.filter(p => p.id !== id) })); return s; }); }
  setAgentPaused(grantId: string, paused: boolean) { this.update('setAgentPaused', [grantId, paused], s => { s.agents = s.agents.map(a => a.grantId === grantId && a.state !== 'revoked' ? { ...a, state: paused ? 'paused' : 'active' } : a); return s; }); }
  revokeAgent(grantId: string) { this.update('revokeAgent', [grantId], s => { s.agents = s.agents.map(a => a.grantId === grantId ? { ...a, state: 'revoked', pending: [] } : a); return s; }); }
  setColorMode(mode: ColorMode) { this.update('setColorMode', [mode], s => ({ ...s, colorMode: mode })); }
  setBackdropColor(hex: string) { this.update('setBackdropColor', [hex], s => ({ ...s, backdropColor: /^(#[0-9a-f]{6}|glass|glass:#[0-9a-f]{6})?$/i.test(hex) ? hex : s.backdropColor })); }
  showPairingDialog() { this.log.push(['showPairingDialog', []]); }
}
