// PREVIEW-ONLY fixtures reproducing the content of Figma frames for visual
// comparison (tests/visual/figma-compare.ts). Titles/URLs are the design's
// sample content (one questionable sample domain is replaced by example.org).
import type { ShellSnapshot, TabInfo } from '../bridge/types';

const P = 'ws_personal01', CX = 'ws_codex00001', CC = 'ws_claudecode1', GPT = 'ws_chatgpt001';
const tab = (id: string, url: string, title: string, extra: Partial<TabInfo> = {}): TabInfo => ({
  id, workspaceId: P, url, title, pinned: false, loading: false, active: false, openedBy: 'user', crashed: false, audible: false, hasError: false, ...extra,
});

function base(): ShellSnapshot {
  return {
    revision: 1, selectedWorkspaceId: P, activeTabId: 'tab_figma0001', sidebarCollapsed: false,
    displayUrl: 'https://www.figma.com/design/nw47hqMLTtmBMksJ4BnJKb/Slide', securityLevel: 'secure', origin: 'www.figma.com',
    canGoBack: true, canGoForward: true,
    workspaces: [
      { id: P, name: 'Personal', icon: 'personal', profileKind: 'personal', agentOwned: false },
      { id: CX, name: 'Codex', icon: 'codex', profileKind: 'personal', agentOwned: false },
      { id: CC, name: 'Claude Code', icon: 'claude-code', profileKind: 'personal', agentOwned: false },
      { id: GPT, name: 'ChatGPT', icon: 'chatgpt', profileKind: 'personal', agentOwned: false },
    ],
    tabs: [
      tab('tab_pin00001', 'https://lobehub.com/components/action-icon-group', 'ActionIconGroup - Lobe', { pinned: true }),
      tab('tab_pin00002', 'https://github.com/pulls', 'Pull Requests', { pinned: true }),
      tab('tab_pin00003', 'https://nextjs.org/docs/app', 'Next.js - App router', { pinned: true }),
      tab('tab_pin00004', 'https://github.com/mantrakp/ardia', 'mantrakp/ardia: A free C...', { pinned: true }),
      tab('tab_pin00005', 'https://www.aliexpress.com/', 'Ali express', { pinned: true }),
      tab('tab_figma0001', 'https://www.figma.com/design/nw47hqMLTtmBMksJ4BnJKb/Slide', 'Slide - Figma', { active: true }),
      tab('tab_lucide001', 'https://lucide.dev/icons/', 'Icons - Lucide'),
      tab('tab_phosph001', 'https://phosphoricons.com/', 'Phosphor Icons'),
      tab('tab_nucleo001', 'https://nucleoapp.com/app', 'Web App | Nucleo'),
      tab('tab_facebk001', 'https://www.facebook.com/', '(1) Facebook'),
      tab('tab_youtub001', 'https://www.youtube.com/watch?v=sample', '(1230) ⚡️⚡️I awaken super attribute body'),
      tab('tab_github001', 'https://github.com/mantrakp04/ardia', 'mantrakp04/ardia: A free Chromium browser'),
      tab('tab_exampl001', 'https://example.org/', 'example.org'),
      tab('tab_chatgp001', 'https://chatgpt.com/c/sample', 'Create Facebook Page Idea'),
      tab('tab_antigr001', 'https://antigravity.google/', 'Antigravity'),
    ],
    favorites: [
      ['youtube', 'https://www.youtube.com/', 'YouTube'], ['chatgpt', 'https://chatgpt.com/', 'ChatGPT'], ['claude', 'https://claude.ai/', 'Claude'],
      ['gmail', 'https://mail.google.com/', 'Gmail'], ['aws', 'https://aws.amazon.com/', 'AWS'], ['github', 'https://github.com/', 'GitHub'],
      ['slack', 'https://app.slack.com/', 'Slack'], ['notion', 'https://www.notion.so/', 'Notion'], ['discord', 'https://discord.com/app', 'Discord'],
      ['netflix', 'https://www.netflix.com/', 'Netflix'], ['supabase', 'https://supabase.com/dashboard', 'Supabase'], ['convex', 'https://dashboard.convex.dev/', 'Convex'],
    ].map(([id, url, title]) => ({ id: `fav_${id}`, url, title })),
    agents: [], colorMode: 'light', backdropColor: '',
  };
}

/** Figma 1:6 "Desktop - 1" (1440×1024, mint, pinned expanded). */
export function figmaDesktopSeed(): ShellSnapshot {
  try { localStorage.setItem('justslide.pinnedOpen', '1'); } catch { /* preview only */ }
  return base();
}

/** Figma 35:13 / 55:120 / 55:411 (1100×720, pinned collapsed, Claude Code agent working in its own workspace). */
export function figmaCompactSeed(): ShellSnapshot {
  try { localStorage.setItem('justslide.pinnedOpen', '0'); } catch { /* preview only */ }
  const s = base();
  s.tabs.push(
    { ...s.tabs[0], id: 'tab_agent0001', workspaceId: CC, url: 'https://example.com/a', title: 'Agent tab A', pinned: false, openedBy: 'agent' },
    { ...s.tabs[0], id: 'tab_agent0002', workspaceId: CC, url: 'https://example.com/b', title: 'Agent tab B', pinned: false, openedBy: 'agent' },
    { ...s.tabs[0], id: 'tab_agent0003', workspaceId: CC, url: 'https://example.com/c', title: 'Agent tab C', pinned: false, openedBy: 'agent' },
  );
  s.agents = [{ grantId: 'grant_claude01', clientName: 'Claude Code', workspaceIds: [CC], state: 'active', lastAction: 'Opened 3 background tabs', pending: [] }];
  return s;
}
