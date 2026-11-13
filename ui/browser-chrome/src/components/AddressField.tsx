import { useEffect, useRef, useState } from 'react';
import Textfield from '@atlaskit/textfield';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import LockUnlockedIcon from '@atlaskit/icon/core/lock-unlocked';
import GlobeIcon from '@atlaskit/icon/core/globe';
import WarningIcon from '@atlaskit/icon/core/warning';
import Tooltip from '@atlaskit/tooltip';
import { Box } from '@atlaskit/primitives/compiled';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { useBridge } from '../bridge/context';
import type { SecurityLevel, ShellSnapshot } from '../bridge/types';

const styles = cssMap({ icon: { paddingInlineStart: token('space.075'), display: 'flex', alignItems: 'center' } });

const SECURITY_COPY: Record<SecurityLevel, string> = {
  secure: 'Connection is secure',
  insecure: 'Connection is not secure',
  internal: 'JustSlide internal page',
  dangerous: 'Dangerous site',
  unknown: 'Security state unknown',
};

function SecurityIcon({ level }: { level: SecurityLevel }) {
  const label = SECURITY_COPY[level];
  const Icon = level === 'secure' ? LockLockedIcon : level === 'insecure' ? LockUnlockedIcon : level === 'dangerous' ? WarningIcon : GlobeIcon;
  const color = level === 'dangerous' || level === 'insecure' ? token('color.icon.danger') : token('color.icon.subtle');
  return (
    <Tooltip content={label}>
      {(p) => <Box {...p} xcss={styles.icon} role="img" aria-label={label}><Icon label="" color={color} size="small" /></Box>}
    </Tooltip>
  );
}

/**
 * Real address/search field. Shows the full URL (never elided) so it can be
 * inspected, copied and edited; Enter sends the raw text to the browser, which
 * classifies URL-vs-search with Chromium's omnibox logic.
 */
export function AddressField({ snap }: { snap: ShellSnapshot }) {
  const b = useBridge();
  const [text, setText] = useState(snap.displayUrl);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setText(snap.displayUrl); }, [snap.displayUrl, editing]);
  useEffect(() => b.onFocusAddressField(() => { ref.current?.focus(); ref.current?.select(); }), [b]);
  return (
    <form role="search" aria-label="Address and search" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { b.navigateFromInput(text); setEditing(false); ref.current?.blur(); } }}>
      <Textfield
        ref={ref}
        isCompact
        name="address"
        aria-label="Address and search bar"
        placeholder="Search or enter address"
        autoComplete="off"
        spellCheck={false}
        value={text}
        elemBeforeInput={<SecurityIcon level={snap.securityLevel} />}
        onFocus={(e) => { setEditing(true); (e.target as HTMLInputElement).select(); }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setText(snap.displayUrl); setEditing(false); (e.target as HTMLInputElement).blur(); } }}
        onChange={(e) => setText((e.target as HTMLInputElement).value)}
      />
    </form>
  );
}
