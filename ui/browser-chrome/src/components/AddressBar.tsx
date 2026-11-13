import { useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge/context';
import type { SecurityLevel, ShellSnapshot } from '../bridge/types';
import { displayHost } from '../lib/brands';
import s from './sidebar.module.css';

const WARN: Partial<Record<SecurityLevel, string>> = { insecure: 'Not secure', dangerous: 'Dangerous site' };

/**
 * Figma 7:46 "Address Bar". At rest it shows the site's host (as in Figma,
 * e.g. "figma.com"); on focus it shows the full URL for editing and copying.
 * Enter sends the raw text to the browser process, which classifies URL vs
 * search with Chromium's omnibox (AutocompleteClassifier). Insecure and
 * dangerous origins get an explicit marker (not drawn in Figma; derived).
 */
export function AddressBar({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(snap.displayUrl);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setText(snap.displayUrl); }, [snap.displayUrl, editing]);
  useEffect(() => b.onFocusAddressField(() => { ref.current?.focus(); ref.current?.select(); }), [b]);
  const warn = WARN[snap.securityLevel];
  return (
    <form
      className={s.address} role="search" aria-label="Address and search"
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { b.navigateFromInput(text); setEditing(false); ref.current?.blur(); } }}
    >
      {warn && !editing && <span className={s.securityWarn}>{warn}</span>}
      <input
        ref={ref} name="address" aria-label="Address and search bar" placeholder="Search or enter address"
        autoComplete="off" spellCheck={false} className={s.addressInput}
        aria-description={warn}
        value={editing ? text : displayHost(snap.displayUrl)}
        onFocus={(e) => { setEditing(true); setText(snap.displayUrl); requestAnimationFrame(() => e.target.select()); }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setText(snap.displayUrl); setEditing(false); e.currentTarget.blur(); } }}
        onChange={(e) => setText(e.target.value)}
      />
    </form>
  );
}
