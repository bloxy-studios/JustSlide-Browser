import { useState } from 'react';
import { useBridge } from '../bridge/context';
import type { TabInfo } from '../bridge/types';
import { Icon } from '../design-system/Icon';
import { TabRow } from './TabRow';
import s from './sidebar.module.css';

const PINNED_KEY = 'justslide.pinnedOpen';
const MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');

/** Figma 25:4 "Pinned Section": trigger collapses/expands persistent workspace tabs. */
export function PinnedSection({ tabs }: { tabs: TabInfo[] }) {
  // Collapsed/expanded is a presentation preference kept in the sidebar's own storage.
  const [open, setOpenState] = useState(() => { try { return localStorage.getItem(PINNED_KEY) !== '0'; } catch { return true; } });
  const setOpen = (v: boolean) => { setOpenState(v); try { localStorage.setItem(PINNED_KEY, v ? '1' : '0'); } catch { /* storage unavailable */ } };
  if (!tabs.length) return null;
  return (
    <section className={s.pinned} aria-label="Pinned tabs">
      <button type="button" className={s.pinnedTrigger} aria-expanded={open} aria-controls="pinned-tabs" onClick={() => setOpen(!open)}>
        <Icon name="pin" size={11} />
        <span className={s.sectionTitle}>Pinned</span>
        <span className={s.count} aria-label={`${tabs.length} pinned`}>{tabs.length}</span>
        <span className={s.chevron} data-open={open || undefined} aria-hidden><Icon name="chevron-right" size={12} /></span>
      </button>
      {open && (
        <ul id="pinned-tabs" className={s.tabList}>
          {tabs.map((t, i) => <TabRow key={t.id} tab={t} index={i} count={tabs.length} />)}
        </ul>
      )}
    </section>
  );
}

/** Figma 20:82 "Browser Sidebar": New Tab + independently scrolling tab list (12:289). */
export function TabArea({ tabs }: { tabs: TabInfo[] }) {
  const b = useBridge();
  return (
    <div className={s.tabArea}>
      <button type="button" className={s.newTab} title={MAC ? 'New Tab (⌘T)' : 'New Tab (Ctrl+T)'} onClick={() => b.createTab()}>
        <Icon name="new-tab" size={12} />
        <span>New Tab</span>
      </button>
      <ul className={`${s.tabList} ${s.scroll}`} aria-label="Tabs" data-testid="tab-list">
        {tabs.map((t, i) => <TabRow key={t.id} tab={t} index={i} count={tabs.length} />)}
      </ul>
    </div>
  );
}
