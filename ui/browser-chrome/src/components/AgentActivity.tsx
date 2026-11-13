import { useState } from 'react';
import { useBridge } from '../bridge/context';
import type { AgentInfo, TabInfo, WorkspaceInfo } from '../bridge/types';
import { Button, Dialog } from '../design-system/Dialog';
import { Icon } from '../design-system/Icon';
import { IconButton } from '../design-system/IconButton';
import { WORKSPACE_ICONS } from './WorkspaceFooter';
import s from './sidebar.module.css';

function stateText(a: AgentInfo): string {
  if (a.pending.length) return 'Needs approval';
  return a.state === 'paused' ? 'Paused' : 'Working';
}

/**
 * Figma 35:313 "Background agent activity": compact, contextual card shown
 * only while an authorised agent grant exists. Opening it shows details,
 * pending requests (human decisions in trusted UI; agents cannot approve),
 * pause/resume and revocation.
 */
export function AgentActivity({ agents, workspaces, tabs }: { agents: AgentInfo[]; workspaces: WorkspaceInfo[]; tabs: TabInfo[] }) {
  const b = useBridge();
  const [open, setOpen] = useState<string | null>(null);
  const visible = agents.filter(a => a.state !== 'revoked');
  if (!visible.length) return null;
  const wsName = (id: string) => workspaces.find(w => w.id === id)?.name ?? 'another workspace';
  const detail = visible.find(a => a.grantId === open);
  return (
    <div className={s.agents} role="region" aria-label="Agent activity">
      {visible.map(a => {
        const ws = workspaces.find(w => a.workspaceIds.includes(w.id));
        const icon = ws ? WORKSPACE_ICONS[ws.icon] : undefined;
        const n = tabs.filter(t => a.workspaceIds.includes(t.workspaceId)).length;
        const paused = a.state === 'paused';
        return (
          <div key={a.grantId} className={s.agentCard} data-state={a.pending.length ? 'pending' : a.state}>
            <span className={s.agentIcon}>{icon ? <Icon name={icon === 'brand-claude-code' ? 'agent-claude-code' : icon} size={16} /> : <span className={s.wsLetter} aria-hidden>{a.clientName.slice(0, 1)}</span>}</span>
            <button type="button" className={s.agentText} onClick={() => setOpen(a.grantId)} aria-label={`${a.clientName}, ${stateText(a)}. Show activity details`}>
              <span className={s.agentState}>{a.clientName} · {stateText(a)}</span>
              <span className={s.agentScope}>{n} {n === 1 ? 'tab' : 'tabs'} in {a.workspaceIds.length === 1 ? 'its workspace' : `${a.workspaceIds.length} workspaces`}</span>
            </button>
            <IconButton className={s.agentControl} size="small" icon={paused ? 'resume' : 'pause'} iconSize={14} tooltip={false}
              label={paused ? `Resume ${a.clientName}` : `Pause ${a.clientName}`} onClick={() => b.setAgentPaused(a.grantId, !paused)} />
          </div>
        );
      })}
      {detail && (
        <Dialog title={detail.clientName} onClose={() => setOpen(null)}
          actions={<><Button onClick={() => { b.revokeAgent(detail.grantId); setOpen(null); }}>Revoke access</Button><Button primary onClick={() => setOpen(null)}>Done</Button></>}>
          <span>{stateText(detail)} in {detail.workspaceIds.map(wsName).join(', ')}.</span>
          <span>Last action: {detail.lastAction || 'none yet'}</span>
          {detail.pending.map(p => (
            <div key={p.id} className={s.request}>
              <strong>{p.summary}</strong>
              <span>{p.origin || 'no origin'} · {wsName(p.workspaceId)}</span>
              <span>Allowing applies to this request only. Web pages cannot approve requests.</span>
              <span className={s.requestActions}>
                <Button onClick={() => b.resolvePendingRequest(p.id, false)}>Deny</Button>
                <Button primary onClick={() => b.resolvePendingRequest(p.id, true)}>Allow once</Button>
              </span>
            </div>
          ))}
          <span>Revoking blocks future requests. It cannot undo actions already completed.</span>
        </Dialog>
      )}
    </div>
  );
}
