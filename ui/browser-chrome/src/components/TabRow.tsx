import { useBridge } from '../bridge/context';
import type { TabInfo } from '../bridge/types';
import { IconButton } from '../design-system/IconButton';
import { isMenuKey, useMenu } from '../design-system/Menu';
import { Favicon } from './Favicon';
import { DND_TAB } from './FavoritesGrid';
import s from './sidebar.module.css';

/**
 * Figma component set 30:100 "Slide / Tab": compact 32 px row. Selected
 * persists; hover is lighter; keyboard focus uses a distinct focus glow;
 * the close control appears on hovered or selected tabs. State comes from
 * Chromium (title, URL, loading, crash) via the snapshot, never from React.
 */
export function TabRow({ tab, index, count }: { tab: TabInfo; index: number; count: number }) {
  const b = useBridge();
  const menu = useMenu();
  const label = tab.title || tab.url;
  const status = [
    tab.crashed ? 'crashed' : tab.hasError ? 'failed to load' : tab.loading ? 'loading' : '',
    tab.audible ? 'playing audio' : '', tab.openedBy === 'agent' ? 'opened by agent' : '', tab.pinned ? 'pinned' : '',
  ].filter(Boolean).join(', ');
  const openMenu = (e: React.MouseEvent | React.KeyboardEvent, el: HTMLElement) => menu.open(e, el);
  return (
    <li className={s.tab} data-selected={tab.active || undefined} data-tab-id={tab.id} data-state={tab.crashed || tab.hasError ? 'error' : undefined}
      draggable
      onDragStart={(e) => {
        // Drag onto Favorites to add it. The URL types let other drop targets
        // (e.g. a text field in another app) receive a plain link.
        e.dataTransfer.setData(DND_TAB, tab.id);
        if (/^https?:/.test(tab.url)) { e.dataTransfer.setData('text/uri-list', tab.url); e.dataTransfer.setData('text/plain', tab.url); }
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      onContextMenu={(e) => openMenu(e, e.currentTarget.querySelector('button') as HTMLElement)}>
      <button
        type="button" className={s.tabMain} aria-current={tab.active ? 'page' : undefined}
        aria-label={status ? `${label}, ${status}` : label}
        onClick={() => b.selectTab(tab.id)}
        onKeyDown={(e) => {
          if (isMenuKey(e)) openMenu(e, e.currentTarget);
          else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); b.moveTab(tab.id, -1); }
          else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); b.moveTab(tab.id, 1); }
          else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); b.closeTab(tab.id); }
        }}
      >
        <span className={s.favicon}>
          {tab.loading ? <span className={s.spinner} aria-hidden /> : <Favicon url={tab.url} size={16} />}
          {(tab.crashed || tab.hasError) && <span className={s.errorDot} aria-hidden />}
        </span>
        <span className={s.tabTitle}>{label}</span>
      </button>
      <IconButton className={s.close} size="small" icon="close" iconSize={12} label={`Close ${label}`} tooltip={false} onClick={() => b.closeTab(tab.id)} />
      {menu.render(`${label} tab`, [
        { label: tab.pinned ? 'Unpin tab' : 'Pin tab', onSelect: () => b.setTabPinned(tab.id, !tab.pinned) },
        { label: 'Add to favorites', disabled: !/^https?:/.test(tab.url), onSelect: () => b.addFavoriteFromTab(tab.id, -1) },
        { label: 'Move up', disabled: index === 0, onSelect: () => b.moveTab(tab.id, -1) },
        { label: 'Move down', disabled: index === count - 1, onSelect: () => b.moveTab(tab.id, 1) },
        { label: 'Reopen closed tab', onSelect: () => b.reopenClosedTab() },
        { label: 'Close tab', danger: true, onSelect: () => b.closeTab(tab.id) },
      ])}
    </li>
  );
}
