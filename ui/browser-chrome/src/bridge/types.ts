// Contract between the trusted sidebar WebUI and the browser process.
// The browser (Chromium + JustSlide services) is authoritative; the UI renders
// snapshots and sends *intents*. Mirrors
// browser/integration/justslide/webui/justslide_shell.mojom (drift-tested in
// src/__tests__/mojom-contract.test.ts).

export type SecurityLevel = 'secure' | 'insecure' | 'internal' | 'dangerous' | 'unknown';
export type OpenedBy = 'user' | 'agent' | 'extension' | 'restore' | 'popup';
export type ColorMode = 'system' | 'light' | 'dark';
export type WorkspaceIcon = 'personal' | 'chatgpt' | 'claude-code' | 'agent' | 'work' | 'generic' | 'codex';
export type ProfileKind = 'personal' | 'agent-isolated';
export type AgentState = 'active' | 'paused' | 'revoked';

export interface TabInfo {
  id: string;
  workspaceId: string;
  url: string;
  title: string;
  pinned: boolean;
  loading: boolean;
  active: boolean;
  openedBy: OpenedBy;
  crashed: boolean;
  audible: boolean;
  hasError: boolean;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  icon: WorkspaceIcon;
  profileKind: ProfileKind;
  agentOwned: boolean;
}

export interface FavoriteInfo {
  id: string;
  url: string;
  title: string;
}

export interface PendingRequestInfo {
  id: string;
  grantId: string;
  workspaceId: string;
  kind: string;
  summary: string;
  origin: string;
}

export interface AgentInfo {
  grantId: string;
  clientName: string;
  workspaceIds: string[];
  state: AgentState;
  lastAction: string;
  pending: PendingRequestInfo[];
}

export interface ShellSnapshot {
  revision: number;
  selectedWorkspaceId: string;
  activeTabId: string;
  sidebarCollapsed: boolean;
  displayUrl: string;
  securityLevel: SecurityLevel;
  origin: string;
  canGoBack: boolean;
  canGoForward: boolean;
  workspaces: WorkspaceInfo[];
  tabs: TabInfo[];
  favorites: FavoriteInfo[];
  agents: AgentInfo[];
  colorMode: ColorMode;
  backdropColor: string;
}

/** Intents the sidebar may send. Every method maps 1:1 to a PageHandler mojom method. */
export interface ShellIntents {
  navigateFromInput(text: string): void;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stopLoading(): void;
  toggleSidebar(): void;
  selectTab(tabId: string): void;
  createTab(): void;
  closeTab(tabId: string): void;
  reopenClosedTab(): void;
  setTabPinned(tabId: string, pinned: boolean): void;
  moveTab(tabId: string, delta: number): void;
  selectWorkspace(workspaceId: string): void;
  createWorkspace(name: string): void;
  renameWorkspace(workspaceId: string, name: string): void;
  addFavoriteForActiveTab(): void;
  /** Drag a sidebar tab onto Favorites; `index` = drop position (-1 = end). */
  addFavoriteFromTab(tabId: string, index: number): void;
  /** Drop a link/URL (from a page or another app) onto Favorites. Browser accepts http/https only. */
  addFavoriteFromUrl(url: string, title: string, index: number): void;
  removeFavorite(favoriteId: string): void;
  moveFavorite(favoriteId: string, delta: number): void;
  openFavorite(favoriteId: string): void;
  resolvePendingRequest(requestId: string, approve: boolean): void;
  setAgentPaused(grantId: string, paused: boolean): void;
  revokeAgent(grantId: string): void;
  setColorMode(mode: ColorMode): void;
  setBackdropColor(cssHex: string): void;
  showPairingDialog(): void;
  showDownloads(): void;
}

export interface ShellBridge extends ShellIntents {
  /** 'native' = browser-process Mojo; 'preview' = simulated dev state (never shipped). */
  readonly kind: 'native' | 'preview';
  getSnapshot(): ShellSnapshot | null;
  subscribe(listener: () => void): () => void;
  onFocusAddressField(listener: () => void): () => void;
}

export const INTENT_NAMES: ReadonlyArray<keyof ShellIntents> = [
  'navigateFromInput', 'goBack', 'goForward', 'reload', 'stopLoading', 'toggleSidebar', 'selectTab', 'createTab',
  'closeTab', 'reopenClosedTab', 'setTabPinned', 'moveTab', 'selectWorkspace', 'createWorkspace',
  'renameWorkspace', 'addFavoriteForActiveTab', 'addFavoriteFromTab', 'addFavoriteFromUrl', 'removeFavorite', 'moveFavorite', 'openFavorite',
  'resolvePendingRequest', 'setAgentPaused', 'revokeAgent', 'setColorMode', 'setBackdropColor',
  'showPairingDialog', 'showDownloads',
];
