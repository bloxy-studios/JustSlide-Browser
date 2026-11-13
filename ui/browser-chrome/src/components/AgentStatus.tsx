import { useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Box, Inline, Stack, Text } from '@atlaskit/primitives/compiled';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { useBridge } from '../bridge/context';
import type { AgentInfo, PendingRequestInfo, WorkspaceInfo } from '../bridge/types';

const styles = cssMap({
  card: {
    paddingBlock: token('space.075'), paddingInline: token('space.100'), borderRadius: token('radius.large'),
    backgroundColor: token('elevation.surface.raised'), boxShadow: token('elevation.shadow.raised'),
  },
});

/**
 * Conditional background-agent status. Appears only while an authorized agent
 * grant exists. Pending requests are human decisions rendered in trusted
 * browser UI; agents can never approve them.
 */
export function AgentStatus({ agents, workspaces }: { agents: AgentInfo[]; workspaces: WorkspaceInfo[] }) {
  const b = useBridge();
  const [reviewing, setReviewing] = useState<PendingRequestInfo | null>(null);
  const visible = agents.filter(a => a.state !== 'revoked');
  if (!visible.length) return null;
  const wsName = (id: string) => workspaces.find(w => w.id === id)?.name ?? 'Unknown workspace';
  return (
    <Stack space="space.075" role="region" aria-label="Agent activity">
      {visible.map(a => (
        <Box key={a.grantId} xcss={styles.card}>
          <Stack space="space.050">
            <Inline spread="space-between" alignBlock="center">
              <Inline space="space.075" alignBlock="center">
                <Lozenge appearance={a.state === 'paused' ? 'moved' : 'inprogress'}>{a.state === 'paused' ? 'Paused' : 'Agent working'}</Lozenge>
              </Inline>
              <DropdownMenu
                shouldRenderToParent
                trigger={({ triggerRef, ...p }) => <IconButton {...p} ref={triggerRef as React.Ref<HTMLButtonElement>} appearance="subtle" spacing="compact" icon={ShowMoreHorizontalIcon} label={`Agent controls for ${a.clientName}`} />}
              >
                <DropdownItemGroup>
                  <DropdownItem onClick={() => b.setAgentPaused(a.grantId, a.state !== 'paused')}>{a.state === 'paused' ? 'Resume agent' : 'Pause agent'}</DropdownItem>
                  <DropdownItem onClick={() => b.revokeAgent(a.grantId)}>Revoke access</DropdownItem>
                </DropdownItemGroup>
              </DropdownMenu>
            </Inline>
            <Text size="small" weight="semibold">{a.clientName}</Text>
            <Text size="small" color="color.text.subtle" maxLines={2}>{a.lastAction || 'Idle'}</Text>
            <Text size="small" color="color.text.subtlest">In {a.workspaceIds.map(wsName).join(', ')}</Text>
            {a.pending.map(p => (
              <Inline key={p.id} spread="space-between" alignBlock="center" space="space.050">
                <Text size="small" maxLines={2}>{p.summary}</Text>
                <Button spacing="compact" appearance="primary" onClick={() => setReviewing(p)}>Review</Button>
              </Inline>
            ))}
          </Stack>
        </Box>
      ))}
      <ModalTransition>
        {reviewing && (
          <ModalDialog onClose={() => setReviewing(null)} width="small">
            <ModalHeader hasCloseButton><ModalTitle>Agent request</ModalTitle></ModalHeader>
            <ModalBody>
              <Stack space="space.100">
                <Text>{reviewing.summary}</Text>
                <Text size="small" color="color.text.subtle">Origin: {reviewing.origin || 'n/a'} · Workspace: {wsName(reviewing.workspaceId)}</Text>
                <Text size="small" color="color.text.subtlest">Approving applies only to this request. Website content cannot approve requests.</Text>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => { b.resolvePendingRequest(reviewing.id, false); setReviewing(null); }}>Deny</Button>
              <Button appearance="primary" onClick={() => { b.resolvePendingRequest(reviewing.id, true); setReviewing(null); }}>Allow once</Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </Stack>
  );
}
