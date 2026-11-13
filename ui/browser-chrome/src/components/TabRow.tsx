/** @jsxRuntime classic */
/** @jsx jsx */
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { IconButton } from '@atlaskit/button/new';
import CrossIcon from '@atlaskit/icon/core/cross';
import Spinner from '@atlaskit/spinner';
import StatusErrorIcon from '@atlaskit/icon/core/status-error';
import AiAgentIcon from '@atlaskit/icon/core/ai-agent';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import { Pressable, Text } from '@atlaskit/primitives/compiled';
import { useBridge } from '../bridge/context';
import type { TabInfo } from '../bridge/types';
import { Favicon } from './Favicon';

const styles = cssMap({
  row: {
    display: 'flex', alignItems: 'center', gap: token('space.050'), minHeight: '32px', marginBlockStart: token('space.0'),
    borderRadius: token('radius.medium'), paddingInlineEnd: token('space.025'),
    '&:hover': { backgroundColor: token('color.background.neutral.subtle.hovered') },
  },
  rowActive: { backgroundColor: token('color.background.selected'), '&:hover': { backgroundColor: token('color.background.selected.hovered') } },
  main: {
    flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: token('space.075'),
    paddingBlock: token('space.050'), paddingInlineStart: token('space.075'), backgroundColor: 'transparent', borderRadius: token('radius.medium'),
  },
  actions: { display: 'flex', alignItems: 'center', flexShrink: 0 },
});

export function TabRow({ tab, index, count }: { tab: TabInfo; index: number; count: number }) {
  const b = useBridge();
  const label = tab.title || tab.url;
  const status = tab.crashed ? 'crashed' : tab.hasError ? 'failed to load' : tab.loading ? 'loading' : '';
  return (
    <li css={[styles.row, tab.active && styles.rowActive]} data-tab-id={tab.id}>
      <Pressable
        xcss={styles.main}
        aria-current={tab.active ? 'page' : undefined}
        aria-label={`${label}${status ? `, ${status}` : ''}${tab.audible ? ', playing audio' : ''}${tab.openedBy === 'agent' ? ', opened by agent' : ''}`}
        onClick={() => b.selectTab(tab.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); b.moveTab(tab.id, -1); }
          if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); b.moveTab(tab.id, 1); }
        }}
      >
        {tab.loading ? <Spinner size="small" label="Loading" /> : <Favicon url={tab.url} />}
        <Text maxLines={1} size="medium" color={tab.active ? 'color.text.selected' : 'color.text'}>{label}</Text>
        {(tab.crashed || tab.hasError) && <StatusErrorIcon label="" color={token('color.icon.danger')} size="small" />}
        {tab.openedBy === 'agent' && <AiAgentIcon label="" color={token('color.icon.discovery')} size="small" />}
      </Pressable>
      <span css={styles.actions}>
        <DropdownMenu
          shouldRenderToParent
          trigger={({ triggerRef, ...p }) => (
            <IconButton {...p} ref={triggerRef as React.Ref<HTMLButtonElement>} appearance="subtle" spacing="compact" icon={ShowMoreHorizontalIcon} label={`More actions for ${label}`} />
          )}
        >
          <DropdownItemGroup>
            <DropdownItem onClick={() => b.setTabPinned(tab.id, !tab.pinned)}>{tab.pinned ? 'Unpin tab' : 'Pin tab'}</DropdownItem>
            <DropdownItem isDisabled={index === 0} onClick={() => b.moveTab(tab.id, -1)}>Move up</DropdownItem>
            <DropdownItem isDisabled={index === count - 1} onClick={() => b.moveTab(tab.id, 1)}>Move down</DropdownItem>
            <DropdownItem onClick={() => b.closeTab(tab.id)}>Close tab</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>
        <IconButton appearance="subtle" spacing="compact" icon={CrossIcon} label={`Close ${label}`} onClick={() => b.closeTab(tab.id)} />
      </span>
    </li>
  );
}
