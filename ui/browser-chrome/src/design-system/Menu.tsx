import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useBridge } from '../bridge/context';
import type { ContextMenuKind } from '../bridge/types';
import s from './menu.module.css';

export type MenuItem = { label: string; onSelect: () => void; disabled?: boolean } | { separator: true };
const isSep = (i: MenuItem): i is { separator: true } => 'separator' in i;

/**
 * PREVIEW fallback menu that imitates NSMenu. In the browser (`bridge.kind ===
 * 'native'`) `useMenu` asks the browser process for a native context menu
 * instead, so this only renders in the UI preview and tests. Keyboard:
 * arrows/Home/End move, Enter/Space select, Escape/Tab close and return focus.
 */
export function Menu({ label, items, anchor, onClose, keyboard = false }: { label: string; items: MenuItem[]; anchor: { x: number; y: number }; onClose: () => void; keyboard?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(anchor);
  const enabled = items.map((it, i) => (isSep(it) || it.disabled ? -1 : i)).filter(i => i >= 0);
  // Keyboard-opened menus highlight the first item (as NSMenu does); mouse-opened ones don't.
  const [active, setActive] = useState(keyboard ? (enabled[0] ?? -1) : -1);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.focus();
    const host = el.offsetParent?.getBoundingClientRect(); const r = el.getBoundingClientRect();
    if (!host || !host.width) return;
    const x = Math.max(4, Math.min(anchor.x, host.width - r.width - 4));
    const y = anchor.y + r.height > host.height - 4 ? Math.max(4, anchor.y - r.height) : anchor.y;
    setPos({ x, y });
  }, [anchor.x, anchor.y]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('blur', onClose);
    return () => { window.removeEventListener('pointerdown', away, true); window.removeEventListener('blur', onClose); };
  }, [onClose]);
  const move = (d: number) => {
    if (!enabled.length) return;
    const at = enabled.indexOf(active);
    setActive(at < 0 ? enabled[d > 0 ? 0 : enabled.length - 1] : enabled[(at + d + enabled.length) % enabled.length]);
  };
  const choose = (i: number) => { const it = items[i]; if (it && !isSep(it) && !it.disabled) { onClose(); it.onSelect(); } };
  return (
    <div
      ref={ref} role="menu" aria-label={label} tabIndex={-1} className={s.menu} style={{ left: pos.x, top: pos.y }}
      aria-activedescendant={active >= 0 ? `menu-item-${active}` : undefined}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]); }
        else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active >= 0 ? active : enabled[0]); }
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose(); }
      }}
    >
      {items.map((it, i) => isSep(it)
        ? <div key={`sep-${i}`} role="separator" className={s.separator} />
        : (
          <div
            key={it.label} id={`menu-item-${i}`} role="menuitem" aria-disabled={it.disabled || undefined}
            className={s.item} data-active={i === active || undefined}
            onPointerEnter={() => setActive(it.disabled ? -1 : i)}
            onPointerLeave={() => setActive(-1)}
            onPointerUp={() => choose(i)}
            onClick={() => choose(i)}
          >{it.label}</div>
        ))}
    </div>
  );
}

/**
 * One context menu per item. In the browser: a native menu built by the
 * browser process from authoritative state (SidebarContextMenu, NSMenu on
 * macOS). In the preview: the fallback above, with the same items.
 */
export function useMenu(target?: { kind: ContextMenuKind; id: string }) {
  const bridge = useBridge();
  const [state, setState] = useState<{ anchor: { x: number; y: number }; trigger: HTMLElement | null; keyboard: boolean } | null>(null);
  const open = (e: React.MouseEvent | React.KeyboardEvent, el: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    const fromKeyboard = !('clientX' in e) || !e.clientX;
    const pt = fromKeyboard ? { x: r.left + 8, y: r.bottom } : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    if (bridge.kind === 'native' && target) { bridge.showContextMenu(target.kind, target.id, pt.x, pt.y, fromKeyboard); return; }
    if (target) bridge.showContextMenu(target.kind, target.id, pt.x, pt.y, fromKeyboard); // recorded in preview
    const host = (el.closest('[data-menu-host]') as HTMLElement | null)?.getBoundingClientRect();
    setState({ anchor: { x: pt.x - (host?.left ?? 0), y: pt.y - (host?.top ?? 0) }, trigger: el, keyboard: fromKeyboard });
  };
  // Restore focus to the trigger. If the action moved the item (e.g. pinning
  // re-parents a tab row), follow it by its stable data-tab-id.
  const close = () => {
    const t = state?.trigger;
    const key = t?.closest('[data-tab-id]')?.getAttribute('data-tab-id');
    setState(null);
    const refocus = () => {
      if (t?.isConnected) { t.focus(); return; }
      if (key) (document.querySelector(`[data-tab-id="${CSS.escape(key)}"] button`) as HTMLElement | null)?.focus();
    };
    refocus();
    queueMicrotask(() => setTimeout(refocus, 0));
  };
  const render = (label: string, items: MenuItem[]): ReactNode => (state ? <Menu label={label} items={items} anchor={state.anchor} onClose={close} keyboard={state.keyboard} /> : null);
  return { open, close, render, isOpen: !!state };
}

export const isMenuKey = (e: React.KeyboardEvent) => e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey);
