import { useBridge } from '../bridge/context';
import type { FavoriteInfo } from '../bridge/types';
import { Icon } from '../design-system/Icon';
import { isMenuKey, useMenu } from '../design-system/Menu';
import { useTooltip } from '../design-system/tooltip';
import { displayHost } from '../lib/brands';
import { Favicon } from './Favicon';
import s from './sidebar.module.css';

function FavoriteTile({ f, index, count }: { f: FavoriteInfo; index: number; count: number }) {
  const b = useBridge();
  const menu = useMenu();
  const name = f.title || displayHost(f.url);
  const label = `Open ${name} website`;
  const tip = useTooltip(label);
  return (
    <li className={s.favCell}>
      <button
        type="button" className={s.favorite} aria-label={label} {...tip}
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

/** Figma 7:87 "Website favorites": 5 × 43×34 tiles. Favorites open WEBSITES; the dock switches workspaces. */
export function FavoritesGrid({ favorites }: { favorites: FavoriteInfo[] }) {
  const b = useBridge();
  const addTip = useTooltip('Add website favorite');
  return (
    <ul className={s.favorites} aria-label="Favorites">
      {favorites.map((f, i) => <FavoriteTile key={f.id} f={f} index={i} count={favorites.length} />)}
      <li className={s.favCell}>
        <button type="button" className={`${s.favorite} ${s.favoriteAdd}`} aria-label="Add current page to favorites" {...addTip}
          onClick={() => b.addFavoriteForActiveTab()}>
          {/* 20:19: 1px dashed stroke, dashes [2, 4], radius 8 */}
          <svg className={s.dashed} aria-hidden="true"><rect x="0.5" y="0.5" width="42" height="33" rx="7.5" /></svg>
          <Icon name="add-favorite" size={18} />
        </button>
      </li>
    </ul>
  );
}
