/** @jsxRuntime classic */
/** @jsx jsx */
// DEV-ONLY state gallery: tab rows, favorites, workspace buttons, address
// input, menus, agent request, activity status, disabled/loading/error states.
import { createRoot } from 'react-dom/client';
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import Heading from '@atlaskit/heading';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AddIcon from '@atlaskit/icon/core/add';
import { Stack, Inline, Text } from '@atlaskit/primitives/compiled';
import { BridgeProvider } from './bridge/context';
import { PreviewBridge, previewSeed } from './bridge/preview';
import type { ShellSnapshot, TabInfo } from './bridge/types';
import { TabRow } from './components/TabRow';
import { FavoritesGrid } from './components/FavoritesGrid';
import { WorkspaceDock } from './components/WorkspaceDock';
import { AddressField } from './components/AddressField';
import { AgentStatus } from './components/AgentStatus';
import { NavControls } from './components/NavControls';
import { applyColorMode } from './app/theme';

const styles = cssMap({
  page: { padding: token('space.300'), display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: token('space.300'), backgroundColor: token('elevation.surface.sunken'), minHeight: '100vh', boxSizing: 'border-box' },
  cell: { width: '240px', padding: token('space.100'), backgroundColor: token('elevation.surface'), borderRadius: token('radius.large'), boxShadow: token('elevation.shadow.raised') },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: token('space.025') },
});

const params = new URLSearchParams(location.search);
applyColorMode(params.get('mode') === 'dark' ? 'dark' : params.get('mode') === 'light' ? 'light' : 'system');
const seed: ShellSnapshot = previewSeed();
const bridge = new PreviewBridge(seed);
const base: TabInfo = { ...seed.tabs[1], active: false };
const variants: Array<[string, TabInfo]> = [
  ['Default', base],
  ['Selected (active)', { ...base, id: 'tab_g2', active: true }],
  ['Loading', { ...base, id: 'tab_g3', loading: true }],
  ['Load error', { ...base, id: 'tab_g4', hasError: true, title: 'This site can’t be reached' }],
  ['Renderer crashed', { ...base, id: 'tab_g5', crashed: true }],
  ['Agent-opened', { ...base, id: 'tab_g6', openedBy: 'agent', title: 'Example research page' }],
  ['Long title', { ...base, id: 'tab_g7', title: 'An extremely long page title that must truncate cleanly without breaking the compact 240px sidebar layout at all' }],
];

function Cell({ title, children }: { title: string; children: React.ReactNode }) {
  return <section css={styles.cell} aria-label={title}><Stack space="space.100"><Heading size="xxsmall">{title}</Heading>{children}</Stack></section>;
}

createRoot(document.getElementById('root')!).render(
  <BridgeProvider bridge={bridge}>
    <div css={styles.page}>
      <Cell title="Tab rows"><ul css={styles.list}>{variants.map(([k, t], i) => <TabRow key={k} tab={t} index={i} count={variants.length} />)}</ul></Cell>
      <Cell title="Navigation (enabled / disabled)"><NavControls snap={seed} /><NavControls snap={{ ...seed, canGoBack: false, canGoForward: false, sidebarCollapsed: true }} /></Cell>
      <Cell title="Address field (secure / insecure / dangerous)">
        <AddressField snap={seed} />
        <AddressField snap={{ ...seed, displayUrl: 'http://neverssl.com/', securityLevel: 'insecure' }} />
        <AddressField snap={{ ...seed, displayUrl: 'https://malware.testing.google.test/testing/malware/', securityLevel: 'dangerous' }} />
      </Cell>
      <Cell title="Favorites"><FavoritesGrid favorites={seed.favorites} /></Cell>
      <Cell title="Workspace dock"><WorkspaceDock workspaces={seed.workspaces} selectedId="ws_personal01" /></Cell>
      <Cell title="Agent status + pending request"><AgentStatus agents={seed.agents} workspaces={seed.workspaces} /><AgentStatus agents={[{ ...seed.agents[0], grantId: 'g2', state: 'paused', pending: [] }]} workspaces={seed.workspaces} /></Cell>
      <Cell title="Buttons (default / disabled / loading / selected)">
        <Inline space="space.050" shouldWrap>
          <Button>Default</Button><Button isDisabled>Disabled</Button><Button isLoading>Loading</Button><Button isSelected>Selected</Button>
          <IconButton icon={AddIcon} label="Icon button" /><IconButton icon={AddIcon} label="Selected icon button" isSelected />
        </Inline>
      </Cell>
      <Cell title="Inputs (invalid / disabled)"><Textfield aria-label="Invalid" isInvalid isCompact defaultValue="not a url" /><Textfield aria-label="Disabled" isDisabled isCompact defaultValue="disabled" /><Text size="small" color="color.text.subtle">Tab through this page to check focus rings.</Text></Cell>
    </div>
  </BridgeProvider>,
);
