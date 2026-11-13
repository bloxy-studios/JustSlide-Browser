/** @jsxRuntime classic */
/** @jsx jsx */
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Tooltip from '@atlaskit/tooltip';
import { Pressable } from '@atlaskit/primitives/compiled';
import { useBridge } from '../bridge/context';
import type { FavoriteInfo } from '../bridge/types';
import { Favicon } from './Favicon';
import { hostOf } from '../lib/input';

const styles = cssMap({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: token('space.075'), listStyle: 'none', margin: 0, padding: 0, alignItems: 'stretch' },
  // css-reset adds `li + li { margin-top }`; grid cells must not inherit it.
  cell: { display: 'flex', minWidth: 0, marginBlockStart: token('space.0') },
  tile: {
    width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: token('radius.large'), backgroundColor: token('color.background.neutral.subtle'),
    border: `${token('border.width')} solid ${token('color.border')}`,
    '&:hover': { backgroundColor: token('color.background.neutral.subtle.hovered') },
    '&:active': { backgroundColor: token('color.background.neutral.subtle.pressed') },
  },
});

/**
 * Website favorites (profile-wide). Top ChatGPT/Claude tiles open WEBSITES;
 * they are distinct from the workspace dock. Context menu offers keyboard
 * alternatives to drag reordering.
 */
export function FavoritesGrid({ favorites }: { favorites: FavoriteInfo[] }) {
  const b = useBridge();
  if (!favorites.length) return null;
  return (
    <ul css={styles.grid} aria-label="Favorites">
      {favorites.map((f, i) => (
        <li key={f.id} css={styles.cell}>
          <DropdownMenu
            shouldRenderToParent
            trigger={({ triggerRef, ...p }) => (
              <Tooltip content={`Open ${f.title || hostOf(f.url)} website`}>
                {(tp) => (
                  <Pressable
                    {...tp}
                    ref={(el: HTMLButtonElement | null) => {
                      if (typeof triggerRef === 'function') triggerRef(el);
                      else if (triggerRef) (triggerRef as { current: HTMLElement | null }).current = el;
                    }}
                    xcss={styles.tile}
                    aria-label={`Open ${f.title || hostOf(f.url)} website`}
                    aria-haspopup="false"
                    onClick={() => b.openFavorite(f.id)}
                    onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); (p.onClick as (e: React.MouseEvent) => void)?.(e); }}
                    onKeyDown={(e: React.KeyboardEvent) => { if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); (p.onClick as (e: unknown) => void)?.(e); } }}
                  >
                    <Favicon url={f.url} size={20} />
                  </Pressable>
                )}
              </Tooltip>
            )}
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => b.openFavorite(f.id)}>Open</DropdownItem>
              <DropdownItem isDisabled={i === 0} onClick={() => b.moveFavorite(f.id, -1)}>Move left</DropdownItem>
              <DropdownItem isDisabled={i === favorites.length - 1} onClick={() => b.moveFavorite(f.id, 1)}>Move right</DropdownItem>
              <DropdownItem onClick={() => b.removeFavorite(f.id)}>Remove from favorites</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
