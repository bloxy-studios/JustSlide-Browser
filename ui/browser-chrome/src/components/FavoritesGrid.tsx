import { useRef, useState } from 'react';
import { useBridge } from '../bridge/context';
import type { FavoriteInfo } from '../bridge/types';
import { Icon } from '../design-system/Icon';
import { isMenuKey, useMenu } from '../design-system/Menu';
import { useTooltip } from '../design-system/tooltip';
import { displayHost } from '../lib/brands';
import { Favicon } from './Favicon';
import s from './sidebar.module.css';

/** Drag payload types. Tabs and favorites come from this trusted document; URLs may come from pages/other apps. */
export const DND_TAB = 'application/x-justslide-tab';
export const DND_FAVORITE = 'application/x-justslide-favorite';

type DropKind = 'tab' | 'favorite' | 'url' | null;
function dropKind(dt: DataTransfer | null): DropKind {
  const types = Array.from(dt?.types ?? []);
  if (types.includes(DND_FAVORITE)) return 'favorite';
  if (types.includes(DND_TAB)) return 'tab';
  if (types.includes('text/uri-list') || types.includes('text/plain')) return 'url';
  return null;
}

function firstUrl(dt: DataTransfer): string | null {
  const list = dt.getData('text/uri-list') || dt.getData('text/plain');
  const line = list.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
  return line && /^https?:\/\//i.test(line) ? line : null;
}

function FavoriteTile({ f, index, count, dropBefore, dragging, onDragState }: {
  f: FavoriteInfo; index: number; count: number; dropBefore: boolean; dragging: boolean; onDragState: (id: string | null) => void;
}) {
  const b = useBridge();
  const menu = useMenu();
  const name = f.title || displayHost(f.url);
  const label = `Open ${name} website`;
  const tip = useTooltip(label);
  return (
    <li className={[s.favCell, dropBefore && s.favDropBefore, dragging && s.favDragging].filter(Boolean).join(' ')} data-fav-index={index}>
      <button
        type="button" className={s.favorite} aria-label={label} {...tip} draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DND_FAVORITE, f.id);
          e.dataTransfer.setData('text/uri-list', f.url);
          e.dataTransfer.effectAllowed = 'move';
          onDragState(f.id);
        }}
        onDragEnd={() => onDragState(null)}
        onClick={() => b.openFavorite(f.id)}
        onContextMenu={(e) => menu.open(e, e.currentTarget)}
        onKeyDown={(e) => { if (isMenuKey(e)) menu.open(e, e.currentTarget); }}
      >
        <Favicon url={f.url} size={18} brandFirst />
      </button>
      {menu.render(`${name} favorite`, [
        { label: 'Open', onSelect: () => b.openFavorite(f.id) },
        { label: 'Move left', disabled: index === 0, onSelect: () => b.moveFavorite(f.id, -1) },
        { label: 'Move right', disabled: index === count - 1, onSelect: () => b.moveFavorite(f.id, 1) },
        { label: 'Remove from favorites', danger: true, onSelect: () => b.removeFavorite(f.id) },
      ])}
    </li>
  );
}

/**
 * Figma 7:87 "Website favorites": 5 × 43×34 tiles. Favorites open WEBSITES; the
 * dock switches workspaces. Owner decision (2026-11-13): there are no preset
 * favorites; people drag a tab (or a link) onto the grid to add one, and drag
 * tiles to reorder. Keyboard alternatives: the + tile (current page), the tab
 * menu "Add to favorites", and Move left/right in a tile's menu.
 */
export function FavoritesGrid({ favorites }: { favorites: FavoriteInfo[] }) {
  const b = useBridge();
  const addTip = useTooltip('Add current page to favorites');
  const listRef = useRef<HTMLUListElement>(null);
  const [drop, setDrop] = useState<{ index: number; kind: DropKind } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const indexAt = (x: number, y: number): number => {
    const cells = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-fav-index]') ?? []);
    for (const c of cells) {
      const r = c.getBoundingClientRect();
      if (y < r.top) return Number(c.dataset.favIndex);
      if (y <= r.bottom && x < r.left + r.width / 2) return Number(c.dataset.favIndex);
    }
    return favorites.length;
  };

  const onDragOver = (e: React.DragEvent) => {
    const kind = dropKind(e.dataTransfer);
    if (!kind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = kind === 'favorite' ? 'move' : 'copy';
    const index = indexAt(e.clientX, e.clientY);
    if (drop?.index !== index || drop?.kind !== kind) setDrop({ index, kind });
  };

  const onDrop = (e: React.DragEvent) => {
    const kind = dropKind(e.dataTransfer);
    const index = drop?.index ?? indexAt(e.clientX, e.clientY);
    setDrop(null);
    if (!kind) return;
    e.preventDefault();
    if (kind === 'favorite') {
      const id = e.dataTransfer.getData(DND_FAVORITE);
      const from = favorites.findIndex(f => f.id === id);
      if (from < 0) return;
      const to = index > from ? index - 1 : index;
      if (to !== from) b.moveFavorite(id, to - from);
    } else if (kind === 'tab') {
      const id = e.dataTransfer.getData(DND_TAB);
      if (id) b.addFavoriteFromTab(id, index);
    } else {
      const url = firstUrl(e.dataTransfer);
      if (url) b.addFavoriteFromUrl(url, '', index);
    }
  };

  return (
    <ul
      ref={listRef} className={s.favorites} aria-label="Favorites" data-drop={drop ? drop.kind : undefined}
      aria-describedby={favorites.length ? undefined : 'favorites-hint'}
      onDragOver={onDragOver}
      onDragLeave={(e) => { if (!listRef.current?.contains(e.relatedTarget as Node | null)) setDrop(null); }}
      onDrop={onDrop}
    >
      {favorites.map((f, i) => (
        <FavoriteTile key={f.id} f={f} index={i} count={favorites.length}
          dropBefore={!!drop && drop.index === i && drop.kind !== null && draggingId !== f.id}
          dragging={draggingId === f.id} onDragState={setDraggingId} />
      ))}
      <li className={s.favCell}>
        <button type="button" className={`${s.favorite} ${s.favoriteAdd}`} aria-label="Add current page to favorites" {...addTip}
          onClick={() => b.addFavoriteForActiveTab()}>
          <Icon name="add-favorite" size={18} />
        </button>
      </li>
      {favorites.length === 0 && (
        <li className={s.favHint} id="favorites-hint" data-testid="favorites-hint">Drag a tab here to add it</li>
      )}
    </ul>
  );
}
