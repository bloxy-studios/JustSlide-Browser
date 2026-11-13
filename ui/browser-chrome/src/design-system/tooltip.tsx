import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import s from './tooltip.module.css';

// Figma "Slide / Tooltip" (30:122): a hover label that distinguishes website
// launchers from workspace switchers. One label at a time, positioned inside
// the sidebar column (the sidebar WebUI cannot draw over page content).
type Placement = 'below' | 'above';
type Tip = { text: string; top: number; placement: Placement } | null;
const Ctx = createContext<{ show(el: HTMLElement, text: string, p: Placement, delay: number): void; hide(): void } | null>(null);

export function TooltipLayer({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip>(null);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const hide = useCallback(() => { window.clearTimeout(timer.current); setTip(null); }, []);
  const show = useCallback((el: HTMLElement, text: string, placement: Placement, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const host = root.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!host) return;
      // Figma: label sits 6px below a favorite row / 37px above the dock.
      const top = placement === 'below' ? r.bottom - host.top + 6 : r.top - host.top - 6;
      setTip({ text, top, placement });
    }, delay);
  }, []);
  return (
    <Ctx.Provider value={{ show, hide }}>
      <div ref={root} className={s.layer}>
        {children}
        {tip && (
          <div className={s.tip} data-placement={tip.placement} style={{ top: tip.top }} aria-hidden="true" data-testid="tooltip">
            <span className={s.label}>{tip.text}</span>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

/** Returns props that show `text` on hover (after a delay) and immediately on keyboard focus. */
export function useTooltip(text: string, placement: Placement = 'below') {
  const ctx = useContext(Ctx);
  if (!ctx) return {};
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => ctx.show(e.currentTarget, text, placement, 450),
    onPointerLeave: () => ctx.hide(),
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(':focus-visible')) ctx.show(e.currentTarget, text, placement, 0); },
    onBlur: () => ctx.hide(),
  };
}
