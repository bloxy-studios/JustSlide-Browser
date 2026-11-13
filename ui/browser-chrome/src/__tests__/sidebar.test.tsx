import { act, render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { BridgeProvider } from '../bridge/context';
import { PreviewBridge, previewSeed } from '../bridge/preview';
import { SidebarApp } from '../app/SidebarApp';
import { figmaCompactSeed, figmaDesktopSeed } from '../fixtures/figma';
import { applyTheme, parseBackdrop } from '../app/theme';

function setup(seed = previewSeed()) {
  const bridge = new PreviewBridge(seed);
  const user = userEvent.setup();
  const utils = render(<BridgeProvider bridge={bridge}><SidebarApp /></BridgeProvider>);
  return { bridge, user, ...utils };
}

beforeEach(() => { try { localStorage.clear(); } catch { /* jsdom */ } });

describe('Sidebar (Figma 1:9 structure)', () => {
  it('renders sections in the Figma order', () => {
    setup(figmaDesktopSeed());
    const root = screen.getByTestId('sidebar');
    const order = [
      screen.getByRole('toolbar', { name: 'Navigation' }),
      screen.getByRole('search', { name: 'Address and search' }),
      screen.getByRole('list', { name: 'Favorites' }),
      screen.getByRole('region', { name: 'Pinned tabs' }),
      screen.getByRole('button', { name: 'New Tab' }),
      screen.getByRole('list', { name: 'Tabs' }),
      screen.getByRole('navigation', { name: 'Workspaces' }),
    ];
    const pos = order.map(el => Array.from(root.querySelectorAll('*')).indexOf(el));
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
  });

  it('favorites open websites; dock buttons switch workspaces (distinct accessible names)', () => {
    setup(figmaDesktopSeed());
    expect(screen.getByRole('button', { name: 'Open ChatGPT website' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to ChatGPT workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Claude website' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Claude Code workspace' })).toBeTruthy();
    // Figma 7:87 fixture: 12 favorites + the add tile
    expect(within(screen.getByRole('list', { name: 'Favorites' })).getAllByRole('button')).toHaveLength(13);
  });

  it('curated favorites render theSVG brand marks, not letter tiles', () => {
    setup(figmaDesktopSeed());
    const yt = screen.getByRole('button', { name: 'Open YouTube website' });
    expect(yt.querySelector('svg[data-icon="brand-youtube"]')).toBeTruthy();
  });

  it('address bar shows the host at rest and the full URL while editing', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    const input = screen.getByRole('textbox', { name: 'Address and search bar' }) as HTMLInputElement;
    expect(input.value).toBe('figma.com');
    await user.click(input);
    expect(input.value).toBe('https://www.figma.com/design/nw47hqMLTtmBMksJ4BnJKb/Slide');
    await user.clear(input);
    await user.type(input, 'justslide.app{Enter}');
    expect(bridge.log.at(-1)).toEqual(['navigateFromInput', ['justslide.app']]);
  });

  it('Escape reverts an edited address', async () => {
    const { user } = setup(figmaDesktopSeed());
    const input = screen.getByRole('textbox', { name: 'Address and search bar' }) as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'xyz');
    await user.keyboard('{Escape}');
    expect(input.value).toBe('figma.com');
  });

  it('insecure origins are marked (not drawn in Figma; derived)', () => {
    const seed = figmaDesktopSeed(); seed.securityLevel = 'insecure';
    setup(seed);
    expect(screen.getByText('Not secure')).toBeTruthy();
  });

  it('shows only tabs of the selected workspace and marks the active tab', () => {
    setup(figmaDesktopSeed());
    const tabs = within(screen.getByRole('list', { name: 'Tabs' })).getAllByRole('button', { current: 'page' });
    expect(tabs).toHaveLength(1);
    expect(tabs[0].textContent).toContain('Slide - Figma');
    expect(screen.queryByText('Agent tab A')).toBeNull();
  });

  it('pinned section collapses, persists the choice and shows a count', async () => {
    const { user } = setup(figmaDesktopSeed());
    const trigger = screen.getByRole('button', { name: /Pinned/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(within(trigger).getByText('5')).toBeTruthy();
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem('justslide.pinnedOpen')).toBe('0');
  });

  it('compact fixture: pinned collapsed, agent card and activity dot on its workspace', () => {
    setup(figmaCompactSeed());
    expect(screen.getByRole('button', { name: /Pinned/ }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Claude Code · Working')).toBeTruthy();
    expect(screen.getByText('3 tabs in its workspace')).toBeTruthy();
    expect(screen.getByTestId('activity-ws_claudecode1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Personal workspace' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('closes a tab with its labelled close button and supports keyboard reordering', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    // Close is visible on the selected tab (and on hover/focus); hidden ones are out of the a11y tree.
    expect(screen.queryByRole('button', { name: 'Close Icons - Lucide' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close Slide - Figma' }));
    expect(bridge.log.at(-1)).toEqual(['closeTab', ['tab_figma0001']]);
    const tab = screen.getByRole('button', { name: 'Phosphor Icons' });
    tab.focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(bridge.log.at(-1)).toEqual(['moveTab', ['tab_phosph001', -1]]);
  });

  it('tab context menu is keyboard operable (Shift+F10, arrows, Enter)', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    const tab = screen.getByRole('button', { name: 'Phosphor Icons' });
    tab.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    const menu = screen.getByRole('menu', { name: 'Phosphor Icons tab' });
    expect(within(menu).getByRole('menuitem', { name: 'Pin Tab' })).toBeTruthy();
    await user.keyboard('{Enter}');
    expect(bridge.log.at(-1)).toEqual(['setTabPinned', ['tab_phosph001', true]]);
    expect(screen.queryByRole('menu')).toBeNull();
    // The row moved into Pinned; focus follows the same tab.
    await act(async () => { await new Promise(r => setTimeout(r, 5)); });
    expect(document.activeElement?.closest('[data-tab-id]')?.getAttribute('data-tab-id')).toBe('tab_phosph001');
    expect(document.activeElement?.closest('#pinned-tabs')).toBeTruthy();
  });

  it('reflects changes that originate outside React (agent) without switching the user', () => {
    const { bridge } = setup(figmaDesktopSeed());
    act(() => bridge.simulateExternalTab('ws_claudecode1', 'https://example.com/agent'));
    expect(screen.getByRole('button', { current: 'page' }).textContent).toContain('Slide - Figma');
    expect(bridge.getSnapshot().selectedWorkspaceId).toBe('ws_personal01');
  });

  it('pending agent requests need an explicit human decision in trusted UI', async () => {
    const { user, bridge } = setup();
    await user.click(screen.getByRole('button', { name: /Needs approval\. Show activity details/ }));
    await user.click(screen.getByRole('button', { name: 'Allow Once' }));
    expect(bridge.log.at(-1)).toEqual(['resolvePendingRequest', ['req_preview01', true]]);
  });

  it('pause and revoke control the agent; revoked agents disappear', async () => {
    const { user, bridge } = setup(figmaCompactSeed());
    await user.click(screen.getByRole('button', { name: 'Pause Claude Code' }));
    expect(bridge.getSnapshot().agents[0].state).toBe('paused');
    expect(screen.getByRole('button', { name: 'Resume Claude Code' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Show activity details/ }));
    await user.click(screen.getByRole('button', { name: 'Revoke Access' }));
    expect(screen.queryByRole('region', { name: 'Agent activity' })).toBeNull();
  });

  it('workspace switching is explicit and reflected as pressed state + current name', async () => {
    const { user } = setup(figmaDesktopSeed());
    await user.click(screen.getByRole('button', { name: 'Switch to Codex workspace' }));
    expect(screen.getByRole('button', { name: 'Switch to Codex workspace' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('current-workspace').textContent).toBe('Codex');
  });

  it('creates a workspace through the dialog', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    await user.click(screen.getByRole('button', { name: 'Create a new workspace' }));
    await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Research');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(bridge.log.at(-1)).toEqual(['createWorkspace', ['Research']]);
  });

  it('reload becomes stop while the active tab loads; downloads opens the download manager', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    await user.click(screen.getByRole('button', { name: 'Stop loading' }));
    expect(bridge.log.at(-1)).toEqual(['stopLoading', []]);
    await user.click(screen.getByRole('button', { name: 'Downloads' }));
    expect(bridge.log.at(-1)).toEqual(['showDownloads', []]);
  });

  it('hover labels are native help tags (title), with shortcuts on toolbar buttons', () => {
    setup(figmaDesktopSeed());
    expect(screen.getByRole('button', { name: 'Open Notion website' }).getAttribute('title')).toBe('Notion');
    expect(screen.getByRole('button', { name: 'Switch to Codex workspace' }).getAttribute('title')).toBe('Codex');
    expect(screen.getByRole('button', { name: 'Reload' }).getAttribute('title')).toMatch(/^Reload \(/);
    expect(screen.queryByTestId('tooltip')).toBeNull();
  });

  it('arrow keys move between tab rows like a macOS list', async () => {
    const { user } = setup(figmaDesktopSeed());
    screen.getByRole('button', { name: 'Icons - Lucide' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.closest('[data-tab-id]')?.getAttribute('data-tab-id')).toBe('tab_phosph001');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(document.activeElement?.closest('[data-tab-id]')?.getAttribute('data-tab-id')).toBe('tab_figma0001');
  });

  it('suppresses the web context menu on chrome surfaces', () => {
    setup(figmaDesktopSeed());
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    screen.getByTestId('current-workspace').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('context menus request the native menu with the item identity', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Phosphor Icons' }), { clientX: 40, clientY: 300 });
    expect(bridge.log.at(-1)).toEqual(['showContextMenu', ['tab', 'tab_phosph001', 40, 300, false]]);
    await user.keyboard('{Escape}');
  });

  it('native rename request from the browser opens the rename dialog', () => {
    const { bridge } = setup(figmaDesktopSeed());
    act(() => bridge.startRenameWorkspace('ws_codex00001'));
    expect((screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement).value).toBe('Codex');
  });

  it('inactive window mutes selection (data-window)', () => {
    const { bridge } = setup(figmaDesktopSeed());
    expect(document.documentElement.dataset.window).toBe('active');
    act(() => bridge.setWindowActive(false));
    expect(document.documentElement.dataset.window).toBe('inactive');
  });

  it('collapsing keeps an accessible way back (rail)', async () => {
    const { user } = setup(figmaDesktopSeed());
    await user.click(screen.getByRole('button', { name: 'Hide sidebar' }));
    expect(screen.getByTestId('sidebar-rail')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show sidebar' }));
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });

  it('every icon-only control has an accessible name', () => {
    setup(figmaCompactSeed());
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-label') || b.textContent?.trim(), b.outerHTML.slice(0, 80)).toBeTruthy();
  });

  it('renders SVG icons as elements (no innerHTML)', () => {
    const { container } = setup(figmaDesktopSeed());
    expect(container.querySelectorAll('svg[data-icon]').length).toBeGreaterThan(20);
  });
});

describe('appearance: mint + customisable backdrop (owner decision 2026-11-13)', () => {
  it('parses solid and glass backdrops', () => {
    expect(parseBackdrop('')).toEqual({ material: 'solid', color: '#acfff7' });
    expect(parseBackdrop('#B8F0D8')).toEqual({ material: 'solid', color: '#b8f0d8' });
    expect(parseBackdrop('glass')).toEqual({ material: 'glass', color: '#acfff7' });
    expect(parseBackdrop('glass:#eff3f5')).toEqual({ material: 'glass', color: '#eff3f5' });
    expect(parseBackdrop('javascript:alert(1)')).toEqual({ material: 'solid', color: '#acfff7' });
  });
  it('always uses the mint theme; glass makes the frame translucent', () => {
    const el = document.createElement('html');
    applyTheme('dark', 'glass', el);
    expect(el.dataset.theme).toBe('mint');
    expect(el.dataset.material).toBe('glass');
    expect(el.style.getPropertyValue('--js-color-sidebar')).toContain('rgba(172, 255, 247');
    applyTheme('system', '', el);
    expect(el.dataset.material).toBe('solid');
    expect(el.style.getPropertyValue('--js-color-sidebar')).toBe('');
  });
});

function dt(data: Record<string, string>) {
  return { types: Object.keys(data), getData: (k: string) => data[k] ?? '', setData() {}, dropEffect: 'none', effectAllowed: 'all' };
}

describe('favorites by drag and drop (owner decision 2026-11-13)', () => {
  it('starts empty with a hint and the add tile', () => {
    setup();
    expect(screen.getByTestId('favorites-hint').textContent).toBe('Drag tabs here to add favorites');
    expect(within(screen.getByRole('list', { name: 'Favorites' })).getAllByRole('button')).toHaveLength(1);
  });
  it('dropping a tab adds it as a favorite', () => {
    const { bridge } = setup();
    const grid = screen.getByRole('list', { name: 'Favorites' });
    const data = dt({ 'application/x-justslide-tab': 'tab_preview02', 'text/uri-list': 'https://github.com/bloxy-studios/JustSlide-Browser' });
    fireEvent.dragOver(grid, { dataTransfer: data });
    expect(grid.getAttribute('data-drop')).toBe('tab');
    fireEvent.drop(grid, { dataTransfer: data });
    expect(bridge.log.at(-1)).toEqual(['addFavoriteFromTab', ['tab_preview02', 0]]);
    expect(screen.queryByTestId('favorites-hint')).toBeNull();
    expect(screen.getByRole('button', { name: /^Open .* website$/ })).toBeTruthy();
  });
  it('tab rows are draggable and carry their id and URL', () => {
    setup(figmaDesktopSeed());
    const row = screen.getByRole('button', { name: 'Phosphor Icons' }).closest('li')!;
    const set: Record<string, string> = {};
    fireEvent.dragStart(row, { dataTransfer: { setData: (k: string, v: string) => { set[k] = v; }, effectAllowed: '' } });
    expect(set['application/x-justslide-tab']).toBe('tab_phosph001');
    expect(set['text/uri-list']).toBe('https://phosphoricons.com/');
  });
  it('dropping a link from a page adds it (http/https only)', () => {
    const { bridge } = setup();
    const grid = screen.getByRole('list', { name: 'Favorites' });
    fireEvent.drop(grid, { dataTransfer: dt({ 'text/uri-list': 'javascript:alert(1)' }) });
    expect(bridge.log.some(([n]) => n === 'addFavoriteFromUrl')).toBe(false);
    fireEvent.drop(grid, { dataTransfer: dt({ 'text/uri-list': '# comment\nhttps://example.com/x' }) });
    expect(bridge.log.at(-1)).toEqual(['addFavoriteFromUrl', ['https://example.com/x', '', 0]]);
  });
  it('dragging a favorite onto another position reorders it', () => {
    const { bridge } = setup(figmaDesktopSeed());
    const grid = screen.getByRole('list', { name: 'Favorites' });
    // jsdom has no layout: drop index falls back to the end of the list.
    fireEvent.drop(grid, { dataTransfer: dt({ 'application/x-justslide-favorite': 'fav_youtube' }) });
    expect(bridge.log.at(-1)).toEqual(['moveFavorite', ['fav_youtube', 11]]);
    expect(bridge.getSnapshot().favorites.at(-1)?.id).toBe('fav_youtube');
  });
  it('keyboard alternative: tab menu "Add to favorites"', async () => {
    const { user, bridge } = setup(figmaDesktopSeed());
    const tab = screen.getByRole('button', { name: 'Phosphor Icons' });
    tab.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}{ArrowDown}{Enter}');
    expect(bridge.log.at(-1)).toEqual(['addFavoriteFromTab', ['tab_phosph001', -1]]);
  });
});
