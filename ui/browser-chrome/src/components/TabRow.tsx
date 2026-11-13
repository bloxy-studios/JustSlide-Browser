import { useBridge } from '../bridge/context';
import type { TabInfo } from '../bridge/types';
import { IconButton } from '../design-system/IconButton';
import { isMenuKey, useMenu } from '../design-system/Menu';
import { Favicon } from './Favicon';
import { DND_TAB } from './FavoritesGrid';
import s from './sidebar.module.css';

/** Moves keyboard focus to the previous/next tab row across Pinned and Tabs (macOS list navigation). */
function focusSibling(from: HTMLElement, where: 'prev' | 'next' | 'first' | 'last') {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-tab-id] > button:first-of-type'));
  const i = rows.indexOf(from);
  const j = where === 'first' ? 0 : where === 'last' ? rows.length - 1 : i + (where === 'next' ? 1 : -1);
  rows[Math.max(0, Math.min(rows.length - 1, j))]?.focus();
}

/**
 * Figma component set 30:100 "Slide / Tab", refined to macOS sidebar rows:
 * 28 px, constant weight (selection is the fill), no hover fill, close button
 * on hover/selection. State comes from Chromium via the snapshot, never React.
 * Keyboard: ↑/↓ move between tabs, Return/Space select, ⌥↑/⌥↓ reorder,
 * ⌫ close, ⇧F10 / Menu key opens the context menu.
 */
export function TabRow({ tab, index, count }: { tab: TabInfo; index: number; count: number }) {
  const b = useBridge();
  const menu = useMenu({ kind: 'tab', id: tab.id });
  const label = tab.title || tab.url;
  const status = [
    tab.crashed ? 'crashed' : tab.hasError ? 'failed to load' : tab.loading ? 'loading' : '',
    tab.audible ? 'playing audio' : '', tab.openedBy === 'agent' ? 'opened by agent' : '', tab.pinned ? 'pinned' : '',
  ].filter(Boolean).join(', ');
  const web = /^https?:/.test(tab.url);
  return (
    <li className={s.tab} data-selected={tab.active || undefined} data-tab-id={tab.id} data-state={tab.crashed || tab.hasError ? 'error' : undefined}
      draggable
      onDragStart={(e) => {
        // Drag onto Favorites to add it; URL types let other targets receive a link.
        e.dataTransfer.setData(DND_TAB, tab.id);
        if (web) { e.dataTransfer.setData('text/uri-list', tab.url); e.dataTransfer.setData('text/plain', tab.url); }
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      onContextMenu={(e) => menu.open(e, e.currentTarget.querySelector('button') as HTMLElement)}>
      <button
        type="button" className={s.tabMain} aria-current={tab.active ? 'page' : undefined}
        aria-label={status ? `${label}, ${status}` : label}
        title={label !== tab.url && web ? `${label}\n${tab.url}` : label}
        onClick={() => b.selectTab(tab.id)}
        onKeyDown={(e) => {
          if (isMenuKey(e)) menu.open(e, e.currentTarget);
          else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); b.moveTab(tab.id, -1); }
          else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); b.moveTab(tab.id, 1); }
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); focusSibling(e.currentTarget, e.key === 'ArrowUp' ? 'prev' : 'next'); }
          else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); focusSibling(e.currentTarget, e.key === 'Home' ? 'first' : 'last'); }
          else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); b.closeTab(tab.id); }
        }}
      >
        <span className={s.favicon}>
          {tab.loading ? <span className={s.spinner} aria-hidden /> : <Favicon url={tab.url} size={16} />}
          {(tab.crashed || tab.hasError) && <span className={s.errorDot} aria-hidden />}
        </span>
        <span className={s.tabTitle}>{label}</span>
      </button>
      <IconButton className={s.close} size="small" icon="close" iconSize={12} label={`Close ${label}`} tooltip="Close Tab" tabIndex={-1} onClick={() => b.closeTab(tab.id)} />
      {menu.render(`${label} tab`, [
        { label: tab.pinned ? 'Unpin Tab' : 'Pin Tab', onSelect: () => b.setTabPinned(tab.id, !tab.pinned) },
        { label: 'Add to Favorites', disabled: !web, onSelect: () => b.addFavoriteFromTab(tab.id, -1) },
        { separator: true },
        { label: 'Move Up', disabled: index === 0, onSelect: () => b.moveTab(tab.id, -1) },
        { label: 'Move Down', disabled: index === count - 1, onSelect: () => b.moveTab(tab.id, 1) },
        { separator: true },
        { label: 'Reopen Closed Tab', onSelect: () => b.reopenClosedTab() },
        { label: 'Close Tab', onSelect: () => b.closeTab(tab.id) },
      ])}
    </li>
  );
}
