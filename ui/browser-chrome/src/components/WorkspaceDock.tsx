import { useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import AddIcon from '@atlaskit/icon/core/add';
import AiAgentIcon from '@atlaskit/icon/core/ai-agent';
import HomeIcon from '@atlaskit/icon/core/home';
import AppsIcon from '@atlaskit/icon/core/apps';
import ScreenIcon from '@atlaskit/icon/core/screen';
import ProjectIcon from '@atlaskit/icon/core/project';
import Textfield from '@atlaskit/textfield';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Box, Inline, Stack, Text } from '@atlaskit/primitives/compiled';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { useBridge } from '../bridge/context';
import type { WorkspaceIcon, WorkspaceInfo } from '../bridge/types';

const styles = cssMap({
  dock: { paddingBlockStart: token('space.075'), borderBlockStart: `${token('border.width')} solid ${token('color.border')}` },
});

// No third-party brand marks are bundled (see docs/licensing-and-assets.md);
// ChatGPT / Claude Code workspaces use neutral ADS glyphs plus their names.
const ICONS: Record<WorkspaceIcon, typeof HomeIcon> = {
  personal: HomeIcon, chatgpt: AppsIcon, 'claude-code': ScreenIcon, agent: AiAgentIcon, work: ProjectIcon, generic: ProjectIcon,
};

/** Persistent bottom dock. Icons switch WORKSPACES (not websites, not agent status). */
export function WorkspaceDock({ workspaces, selectedId }: { workspaces: WorkspaceInfo[]; selectedId: string }) {
  const b = useBridge();
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'rename'; ws: WorkspaceInfo } | null>(null);
  const [name, setName] = useState('');
  const selected = workspaces.find(w => w.id === selectedId);
  const submit = () => {
    const n = name.trim();
    if (!n || !dialog) return;
    if (dialog.mode === 'create') b.createWorkspace(n); else b.renameWorkspace(dialog.ws.id, n);
    setDialog(null); setName('');
  };
  return (
    <Box xcss={styles.dock} as="nav" aria-label="Workspaces">
      <Stack space="space.050">
        <Inline spread="space-between" alignBlock="center">
          <Text size="small" weight="semibold" maxLines={1} id="selected-workspace-name">{selected?.name ?? 'No workspace'}</Text>
          {selected && (
            <DropdownMenu shouldRenderToParent trigger={({ triggerRef, ...p }) => <Button {...p} ref={triggerRef as React.Ref<HTMLButtonElement>} spacing="compact" appearance="subtle">Edit</Button>}>
              <DropdownItemGroup>
                <DropdownItem onClick={() => { setName(selected.name); setDialog({ mode: 'rename', ws: selected }); }}>Rename workspace</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          )}
        </Inline>
        <Inline space="space.050" shouldWrap role="toolbar" aria-label="Switch workspace">
          {workspaces.map(w => (
            <IconButton
              key={w.id}
              appearance="subtle"
              icon={ICONS[w.icon]}
              isSelected={w.id === selectedId}
              aria-pressed={w.id === selectedId}
              label={`Switch to ${w.name} workspace${w.agentOwned ? ' (agent)' : ''}`}
              onClick={() => b.selectWorkspace(w.id)}
            />
          ))}
          <IconButton appearance="subtle" icon={AddIcon} label="New workspace" onClick={() => { setName(''); setDialog({ mode: 'create' }); }} />
        </Inline>
      </Stack>
      <ModalTransition>
        {dialog && (
          <ModalDialog onClose={() => setDialog(null)} width="small">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <ModalHeader hasCloseButton><ModalTitle>{dialog.mode === 'create' ? 'New workspace' : 'Rename workspace'}</ModalTitle></ModalHeader>
              <ModalBody>
                <Textfield aria-label="Workspace name" autoFocus maxLength={64} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setDialog(null)}>Cancel</Button>
                <Button appearance="primary" type="submit" isDisabled={!name.trim()}>{dialog.mode === 'create' ? 'Create' : 'Rename'}</Button>
              </ModalFooter>
            </form>
          </ModalDialog>
        )}
      </ModalTransition>
    </Box>
  );
}
