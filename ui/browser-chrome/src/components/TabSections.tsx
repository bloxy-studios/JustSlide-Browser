/** @jsxRuntime classic */
/** @jsx jsx */
import { useState } from 'react';
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Badge from '@atlaskit/badge';
import AddIcon from '@atlaskit/icon/core/add';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import { Inline, Pressable, Stack, Text } from '@atlaskit/primitives/compiled';
import { useBridge } from '../bridge/context';
import type { TabInfo } from '../bridge/types';
import { TabRow } from './TabRow';

const styles = cssMap({
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: token('space.025') },
  header: {
    display: 'flex', alignItems: 'center', gap: token('space.050'), width: '100%', backgroundColor: 'transparent',
    paddingBlock: token('space.050'), paddingInline: token('space.050'), borderRadius: token('radius.small'),
    '&:hover': { backgroundColor: token('color.background.neutral.subtle.hovered') },
  },
  scroll: { flexGrow: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' },
});

export function PinnedSection({ tabs }: { tabs: TabInfo[] }) {
  const [open, setOpen] = useState(true);
  if (!tabs.length) return null;
  return (
    <Stack space="space.025">
      <Pressable xcss={styles.header} aria-expanded={open} aria-controls="pinned-tabs" onClick={() => setOpen(!open)}>
        {open ? <ChevronDownIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
        <Text size="small" weight="semibold" color="color.text.subtle">Pinned</Text>
        <Badge>{tabs.length}</Badge>
      </Pressable>
      {open && (
        <ul id="pinned-tabs" css={styles.list} aria-label="Pinned tabs">
          {tabs.map((t, i) => <TabRow key={t.id} tab={t} index={i} count={tabs.length} />)}
        </ul>
      )}
    </Stack>
  );
}

export function TabList({ tabs }: { tabs: TabInfo[] }) {
  const b = useBridge();
  return (
    <Stack space="space.050" xcss={styles.scroll}>
      <Inline>
        <Button appearance="subtle" spacing="compact" iconBefore={AddIcon} onClick={() => b.createTab()}>New tab</Button>
      </Inline>
      <ul css={styles.list} aria-label="Tabs">
        {tabs.map((t, i) => <TabRow key={t.id} tab={t} index={i} count={tabs.length} />)}
      </ul>
    </Stack>
  );
}
