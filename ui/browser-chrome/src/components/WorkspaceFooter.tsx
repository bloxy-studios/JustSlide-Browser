import { useEffect, useState } from 'react';
import { useBridge } from '../bridge/context';
import type { AgentInfo, WorkspaceIcon, WorkspaceInfo } from '../bridge/types';
import { Button, Dialog, TextInput } from '../design-system/Dialog';
import { Icon, type IconName } from '../design-system/Icon';
import { IconButton } from '../design-system/IconButton';
import { isMenuKey, useMenu } from '../design-system/Menu';
import { useTooltip } from '../design-system/tooltip';
import s from './sidebar.module.css';

// A workspace bearing a service logo does not mean that service is connected
// or running; it is an organisational label chosen by the user.
export const WORKSPACE_ICONS: Partial<Record<WorkspaceIcon, IconName>> = {
  personal: 'workspace-personal', codex: 'brand-codex', 'claude-code': 'brand-claude-code', chatgpt: 'brand-chatgpt',
};

function WorkspaceButton({ ws, selected, busy }: { ws: WorkspaceInfo; selected: boolean; busy: boolean }) {
  const b = useBridge();
  const menu = useMenu();
  const label = `Switch to ${ws.name} workspace${busy ? ', agent working' : ''}`;
  const tip = useTooltip(`Switch to ${ws.name} workspace`, 'above');
  const icon = WORKSPACE_ICONS[ws.icon];
  return (
    <span className={s.wsItem}>
      <button
        type="button" aria-label={label} aria-pressed={selected} data-selected={selected || undefined} className={s.wsButton} {...tip}
        onClick={() => b.selectWorkspace(ws.id)}
        onContextMenu={(e) => menu.open(e, e.currentTarget)}
        onKeyDown={(e) => { if (isMenuKey(e)) menu.open(e, e.currentTarget); }}
      >
        {icon ? <Icon name={icon} size={16} /> : <span className={s.wsLetter} aria-hidden>{ws.name.slice(0, 1).toUpperCase()}</span>}
      </button>
      {busy && <span className={s.activityDot} aria-hidden data-testid={`activity-${ws.id}`} />}
      {menu.render(`${ws.name} workspace`, [{ label: 'Rename workspace…', onSelect: () => window.dispatchEvent(new CustomEvent('js-rename-ws', { detail: ws })) }])}
    </span>
  );
}

/** Figma 12:290 "Workspace footer": overline + current name, then Downloads · switcher · New workspace. */
export function WorkspaceFooter({ workspaces, selectedId, agents }: { workspaces: WorkspaceInfo[]; selectedId: string; agents: AgentInfo[] }) {
  const b = useBridge();
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'rename'; ws: WorkspaceInfo } | null>(null);
  const [name, setName] = useState('');
  const selected = workspaces.find(w => w.id === selectedId);
  const busy = new Set(agents.filter(a => a.state === 'active').flatMap(a => a.workspaceIds));
  const dlTip = useTooltip('Downloads', 'above');
  const newTip = useTooltip('Create a new workspace', 'above');
  const submit = () => {
    const n = name.trim(); if (!n || !dialog) return;
    if (dialog.mode === 'create') b.createWorkspace(n); else b.renameWorkspace(dialog.ws.id, n);
    setDialog(null); setName('');
  };
  return (
    <nav className={s.footer} aria-label="Workspaces">
      <div className={s.wsHeading}>
        <span className={s.overline} aria-hidden>Workspaces</span>
        <span className={s.currentWs} data-testid="current-workspace">{selected?.name ?? ''}</span>
      </div>
      <div className={s.wsControls}>
        <IconButton icon="downloads" label="Downloads" tooltip={false} {...dlTip} onClick={() => b.showDownloads()} />
        <div className={s.switcher} role="group" aria-label="Switch workspace">
          {workspaces.map(w => <WorkspaceButton key={w.id} ws={w} selected={w.id === selectedId} busy={busy.has(w.id)} />)}
        </div>
        <IconButton icon="new-workspace" label="Create a new workspace" tooltip={false} {...newTip} onClick={() => { setName(''); setDialog({ mode: 'create' }); }} />
      </div>
      <RenameListener onRename={(ws) => { setName(ws.name); setDialog({ mode: 'rename', ws }); }} />
      {dialog && (
        <Dialog
          title={dialog.mode === 'create' ? 'New workspace' : 'Rename workspace'} onClose={() => setDialog(null)}
          actions={<><Button onClick={() => setDialog(null)}>Cancel</Button><Button primary disabled={!name.trim()} onClick={submit}>{dialog.mode === 'create' ? 'Create' : 'Rename'}</Button></>}
        >
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <TextInput aria-label="Workspace name" autoFocus maxLength={64} value={name} onChange={(e) => setName(e.target.value)} />
          </form>
          <span>Workspaces organise tabs. They share this profile's cookies and permissions.</span>
        </Dialog>
      )}
    </nav>
  );
}

function RenameListener({ onRename }: { onRename: (ws: WorkspaceInfo) => void }) {
  useEffect(() => {
    const h = (e: Event) => onRename((e as CustomEvent).detail as WorkspaceInfo);
    window.addEventListener('js-rename-ws', h);
    return () => window.removeEventListener('js-rename-ws', h);
  }, [onRename]);
  return null;
}
