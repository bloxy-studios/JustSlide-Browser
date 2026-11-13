/** @jsxRuntime classic */
/** @jsx jsx */
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { Stack } from '@atlaskit/primitives/compiled';
import { IconButton } from '@atlaskit/button/new';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import ArrowLeftIcon from '@atlaskit/icon/core/arrow-left';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import AddIcon from '@atlaskit/icon/core/add';
import { useBridge } from '../bridge/context';
import type { ShellSnapshot } from '../bridge/types';
import { NavControls } from './NavControls';
import { AddressField } from './AddressField';
import { FavoritesGrid } from './FavoritesGrid';
import { PinnedSection, TabList } from './TabSections';
import { AgentStatus } from './AgentStatus';
import { WorkspaceDock } from './WorkspaceDock';
import { Mascot } from './Mascot';

const styles = cssMap({
  root: {
    height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: token('space.100'),
    paddingBlock: token('space.100'), paddingInline: token('space.100'), minWidth: 0,
    color: token('color.text'), font: token('font.body'),
  },
  rail: { height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: token('space.050'), paddingBlock: token('space.100') },
  grow: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: token('space.100') },
});

export const RAIL_WIDTH_PX = 48;

/**
 * Collapsed mode keeps an accessible rail (the native host shrinks the WebUI
 * view to RAIL_WIDTH_PX) so navigation is never hidden without an alternative.
 */
function CollapsedRail({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  return (
    <nav css={styles.rail} aria-label="Browser controls" data-testid="sidebar-rail">
      <IconButton appearance="subtle" icon={SidebarExpandIcon} label="Show sidebar" onClick={() => b.toggleSidebar()} />
      <IconButton appearance="subtle" icon={ArrowLeftIcon} label="Back" isDisabled={!snap.canGoBack} onClick={() => b.goBack()} />
      <IconButton appearance="subtle" icon={ArrowRightIcon} label="Forward" isDisabled={!snap.canGoForward} onClick={() => b.goForward()} />
      <IconButton appearance="subtle" icon={RefreshIcon} label="Reload" onClick={() => b.reload()} />
      <IconButton appearance="subtle" icon={AddIcon} label="New tab" onClick={() => b.createTab()} />
    </nav>
  );
}

/** Sidebar order is a product invariant (DESIGN.md §2). */
export function Sidebar({ snap }: { snap: ShellSnapshot }) {
  if (snap.sidebarCollapsed) return <CollapsedRail snap={snap} />;
  const tabs = snap.tabs.filter(t => t.workspaceId === snap.selectedWorkspaceId);
  const pinned = tabs.filter(t => t.pinned);
  const unpinned = tabs.filter(t => !t.pinned);
  return (
    <div css={styles.root} data-testid="sidebar">
      <Stack space="space.100">
        <NavControls snap={snap} />
        <AddressField snap={snap} />
        <FavoritesGrid favorites={snap.favorites} />
      </Stack>
      <div css={styles.grow}>
        <PinnedSection tabs={pinned} />
        <TabList tabs={unpinned} />
      </div>
      <AgentStatus agents={snap.agents} workspaces={snap.workspaces} />
      <Mascot />
      <WorkspaceDock workspaces={snap.workspaces} selectedId={snap.selectedWorkspaceId} />
    </div>
  );
}
