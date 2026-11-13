import { useBridge } from '../bridge/context';
import type { ShellSnapshot } from '../bridge/types';
import { IconButton } from '../design-system/IconButton';
import { TooltipLayer } from '../design-system/tooltip';
import { AddressBar } from './AddressBar';
import { AgentActivity } from './AgentActivity';
import { FavoritesGrid } from './FavoritesGrid';
import { NavControls } from './NavControls';
import { PinnedSection, TabArea } from './TabSections';
import { WorkspaceFooter } from './WorkspaceFooter';
import s from './sidebar.module.css';

/** Native host width of the sidebar WebUI view: 6 px frame padding + 240 px column + 6 px gap. */
export const SIDEBAR_VIEW_WIDTH_PX = 252;
/** Collapsed rail width (6 + 32 + 6). Figma does not define a collapsed sidebar yet. */
export const RAIL_WIDTH_PX = 44;

function CollapsedRail({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  return (
    <nav className={s.rail} aria-label="Browser controls" data-testid="sidebar-rail">
      <IconButton icon="sidebar-toggle" label="Show sidebar" tooltip={false} onClick={() => b.toggleSidebar()} />
      <IconButton icon="back" label="Back" tooltip={false} disabled={!snap.canGoBack} onClick={() => b.goBack()} />
      <IconButton icon="forward" label="Forward" tooltip={false} disabled={!snap.canGoForward} onClick={() => b.goForward()} />
      <IconButton icon="reload" label="Reload" tooltip={false} onClick={() => b.reload()} />
      <IconButton icon="new-tab" iconSize={12} label="New tab" tooltip={false} onClick={() => b.createTab()} />
    </nav>
  );
}

/** Sidebar order follows Figma 1:9 "Sidebar" (DESIGN.md §2). */
export function Sidebar({ snap }: { snap: ShellSnapshot }) {
  if (snap.sidebarCollapsed) return <CollapsedRail snap={snap} />;
  const tabs = snap.tabs.filter(t => t.workspaceId === snap.selectedWorkspaceId);
  const pinned = tabs.filter(t => t.pinned);
  return (
    <TooltipLayer>
      <div className={s.root} data-testid="sidebar" data-menu-host>
        <NavControls snap={snap} />
        <AddressBar snap={snap} />
        <FavoritesGrid favorites={snap.favorites} />
        <PinnedSection tabs={pinned} />
        {pinned.length > 0 && <hr className={s.separator} />}
        <TabArea tabs={tabs.filter(t => !t.pinned)} />
        <AgentActivity agents={snap.agents} workspaces={snap.workspaces} tabs={snap.tabs} />
        <WorkspaceFooter workspaces={snap.workspaces} selectedId={snap.selectedWorkspaceId} agents={snap.agents} />
      </div>
    </TooltipLayer>
  );
}
