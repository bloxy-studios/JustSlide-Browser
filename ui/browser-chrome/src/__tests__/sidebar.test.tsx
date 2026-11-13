import { describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BridgeProvider } from '../bridge/context';
import { PreviewBridge } from '../bridge/preview';
import { SidebarApp } from '../app/SidebarApp';

function setup() {
  const bridge = new PreviewBridge();
  const user = userEvent.setup();
  render(<BridgeProvider bridge={bridge}><SidebarApp /></BridgeProvider>);
  return { bridge, user };
}

describe('Sidebar', () => {
  it('renders sections in the product order', () => {
    setup();
    const sb = screen.getByTestId('sidebar');
    const order = [
      within(sb).getByRole('button', { name: 'Hide sidebar' }),
      within(sb).getByRole('button', { name: 'Back' }),
      sb.querySelector('form[role="search"]'),
      sb.querySelector('ul[aria-label="Favorites"]'),
      sb.querySelector('#pinned-tabs'),
      sb.querySelector('ul[aria-label="Tabs"]'),
      sb.querySelector('[aria-label="Agent activity"]'),
      sb.querySelector('nav[aria-label="Workspaces"]'),
    ];
    order.forEach((el, i) => expect(el, `section ${i}`).not.toBeNull());
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('distinguishes favorite websites from workspace switches by accessible name', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Open ChatGPT website' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Claude website' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to ChatGPT workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Claude Code workspace' })).toBeTruthy();
  });

  it('sends raw address text to the browser and keeps the full URL inspectable', async () => {
    const { bridge, user } = setup();
    const input = screen.getByRole('textbox', { name: 'Address and search bar' }) as HTMLInputElement;
    expect(input.value).toBe('https://github.com/bloxy-studios/JustSlide');
    await user.clear(input);
    await user.type(input, 'chromium site isolation{Enter}');
    expect(bridge.log.find(([n]) => n === 'navigateFromInput')?.[1]).toEqual(['chromium site isolation']);
  });

  it('Escape reverts an edited address', async () => {
    const { user } = setup();
    const input = screen.getByRole('textbox', { name: 'Address and search bar' }) as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'xyz');
    await user.keyboard('{Escape}');
    expect(input.value).toBe('https://github.com/bloxy-studios/JustSlide');
  });

  it('shows only tabs of the selected workspace and marks the active tab', () => {
    setup();
    const tabs = screen.getByRole('list', { name: 'Tabs' });
    expect(within(tabs).queryByText('Example research page')).toBeNull();
    const current = tabs.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain('bloxy-studios/JustSlide');
  });

  it('pinned section is collapsible and shows a count', async () => {
    const { user } = setup();
    const header = screen.getByRole('button', { expanded: true });
    expect(header.textContent).toContain('Pinned');
    expect(header.textContent).toContain('1');
    await user.click(header);
    expect(document.getElementById('pinned-tabs')).toBeNull();
  });

  it('closes a tab with its labelled close button and supports keyboard reordering', async () => {
    const { bridge, user } = setup();
    await user.click(screen.getByRole('button', { name: /^Close Components/ }));
    expect(bridge.getSnapshot()!.tabs.some(t => t.id === 'tab_preview03')).toBe(false);
    const row = screen.getByRole('button', { name: /^bloxy-studios\/JustSlide/ });
    row.focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(bridge.log.some(([n, a]) => n === 'moveTab' && (a as unknown[])[1] === -1)).toBe(true);
  });

  it('reflects changes that originate outside React (agent/native) without switching the user', () => {
    const { bridge } = setup();
    act(() => bridge.simulateExternalTab('ws_personal01', 'https://example.org/bg'));
    const s = bridge.getSnapshot()!;
    expect(s.activeTabId).toBe('tab_preview02');
    expect(s.selectedWorkspaceId).toBe('ws_personal01');
    expect(screen.getByRole('list', { name: 'Tabs' }).textContent).toContain('https://example.org/bg');
  });

  it('pending agent requests need an explicit human decision', async () => {
    const { bridge, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(bridge.log.some(([n]) => n === 'resolvePendingRequest')).toBe(false);
    await user.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(bridge.log.find(([n]) => n === 'resolvePendingRequest')?.[1]).toEqual(['req_preview01', false]);
  });

  it('agent status disappears after revocation', async () => {
    const { bridge } = setup();
    expect(screen.queryByRole('region', { name: 'Agent activity' })).not.toBeNull();
    act(() => bridge.revokeAgent('grant_preview1'));
    expect(screen.queryByRole('region', { name: 'Agent activity' })).toBeNull();
  });

  it('workspace switching is explicit and reflected as pressed state', async () => {
    const { bridge, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Switch to Research agent workspace (agent)' }));
    expect(bridge.getSnapshot()!.selectedWorkspaceId).toBe('ws_agent0001');
    expect(screen.getByRole('button', { name: 'Switch to Research agent workspace (agent)' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('collapsing keeps an accessible way back (rail)', async () => {
    const { bridge, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Hide sidebar' }));
    expect(screen.getByTestId('sidebar-rail')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show sidebar' }));
    expect(bridge.getSnapshot()!.sidebarCollapsed).toBe(false);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });
});
