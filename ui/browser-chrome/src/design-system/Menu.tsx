import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import s from './menu.module.css';

export type MenuItem = { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean };

/**
 * Accessible context menu rendered inside the trusted sidebar document.
 * Figma defines no menu component; this uses the address-bar surface, the
 * strong border and the 13 px tab type (documented as derived in
 * docs/design-system.md). Keyboard: arrows/Home/End move, Enter/Space select,
 * Escape/Tab close and return focus to the trigger.
 */
export function Menu({ label, items, anchor, onClose }: { label: string; items: MenuItem[]; anchor: { x: number; y: number }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(anchor);
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter(i => i >= 0);
  const [active, setActive] = useState(enabled[0] ?? -1);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.focus();
    const host = el.offsetParent?.getBoundingClientRect(); const r = el.getBoundingClientRect();
    if (!host || !host.width) return;
    const x = Math.max(8, Math.min(anchor.x, host.width - r.width - 8));
    const y = anchor.y + r.height > host.height - 8 ? Math.max(8, anchor.y - r.height) : anchor.y;
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
    setActive(enabled[(at + d + enabled.length) % enabled.length]);
  };
  return (
    <div
      ref={ref} role="menu" aria-label={label} tabIndex={-1} className={s.menu} style={{ left: pos.x, top: pos.y }}
      aria-activedescendant={active >= 0 ? `menu-item-${active}` : undefined}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]); }
        else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const it = items[active]; if (it && !it.disabled) { onClose(); it.onSelect(); } }
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose(); }
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.label} id={`menu-item-${i}`} role="menuitem" aria-disabled={it.disabled || undefined}
          className={s.item} data-active={i === active || undefined} data-danger={it.danger || undefined}
          onPointerEnter={() => !it.disabled && setActive(i)}
          onClick={() => { if (!it.disabled) { onClose(); it.onSelect(); } }}
        >{it.label}</div>
      ))}
    </div>
  );
}

/** Hook managing one open menu + focus restoration. */
export function useMenu() {
  const [state, setState] = useState<{ anchor: { x: number; y: number }; trigger: HTMLElement | null } | null>(null);
  const open = (e: React.MouseEvent | React.KeyboardEvent, el: HTMLElement) => {
    e.preventDefault();
    const host = (el.closest('[data-menu-host]') as HTMLElement | null)?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const pt = 'clientX' in e && e.clientX ? { x: e.clientX, y: e.clientY } : { x: r.left + 8, y: r.bottom };
    setState({ anchor: { x: pt.x - (host?.left ?? 0), y: pt.y - (host?.top ?? 0) }, trigger: el });
  };
  // Restore focus to the trigger. If the action moved the item (e.g. pinning
  // re-parents a tab row), follow it by its stable data-tab-id/data-focus-key.
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
  const render = (label: string, items: MenuItem[]): ReactNode => (state ? <Menu label={label} items={items} anchor={state.anchor} onClose={close} /> : null);
  return { open, close, render, isOpen: !!state };
}

export const isMenuKey = (e: React.KeyboardEvent) => e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey);
