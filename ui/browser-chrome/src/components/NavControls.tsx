import { IconButton } from '@atlaskit/button/new';
import ArrowLeftIcon from '@atlaskit/icon/core/arrow-left';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import SidebarCollapseIcon from '@atlaskit/icon/core/sidebar-collapse';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import { Inline } from '@atlaskit/primitives/compiled';
import { useBridge } from '../bridge/context';
import type { ShellSnapshot } from '../bridge/types';

export function NavControls({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  return (
    <Inline space="space.050" alignBlock="center" spread="space-between">
      <IconButton
        appearance="subtle" spacing="compact"
        icon={snap.sidebarCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
        label={snap.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        onClick={() => b.toggleSidebar()}
      />
      <Inline space="space.025">
        <IconButton appearance="subtle" spacing="compact" icon={ArrowLeftIcon} label="Back" isDisabled={!snap.canGoBack} onClick={() => b.goBack()} />
        <IconButton appearance="subtle" spacing="compact" icon={ArrowRightIcon} label="Forward" isDisabled={!snap.canGoForward} onClick={() => b.goForward()} />
        <IconButton appearance="subtle" spacing="compact" icon={RefreshIcon} label="Reload" onClick={() => b.reload()} />
      </Inline>
    </Inline>
  );
}
