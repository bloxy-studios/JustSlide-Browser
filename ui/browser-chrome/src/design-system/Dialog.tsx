import { useEffect, useRef, type ReactNode } from 'react';
import s from './dialog.module.css';

/**
 * Modal dialog using the platform <dialog> element (focus trap, Escape, inert
 * background are native). Rendered in the trusted sidebar document only;
 * permission decisions are never shown inside web content.
 */
export function Dialog({ title, children, actions, onClose }: { title: string; children: ReactNode; actions: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    const cancel = (e: Event) => { e.preventDefault(); onClose(); };
    d.addEventListener('cancel', cancel);
    return () => d.removeEventListener('cancel', cancel);
  }, [onClose]);
  return (
    <dialog ref={ref} className={s.dialog} aria-labelledby="js-dialog-title">
      <h2 id="js-dialog-title" className={s.title}>{title}</h2>
      <div className={s.body}>{children}</div>
      <div className={s.actions}>{actions}</div>
    </dialog>
  );
}

export function Button({ children, primary, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" className={s.button} data-primary={primary || undefined} {...rest}>{children}</button>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={s.input} {...props} />;
}
