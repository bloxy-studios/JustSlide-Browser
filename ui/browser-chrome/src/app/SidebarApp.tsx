/** @jsxRuntime classic */
/** @jsx jsx */
import { useEffect } from 'react';
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { useSnapshot } from '../bridge/context';
import { Sidebar } from '../components/Sidebar';
import { applyColorMode } from './theme';

const styles = cssMap({
  root: { height: '100%', backgroundColor: token('elevation.surface.sunken') },
  loading: { padding: token('space.200'), color: token('color.text.subtle'), font: token('font.body.small') },
});

/**
 * Root of the trusted sidebar WebUI. In the native browser this document
 * fills only the sidebar region; page WebContents are separate native views.
 */
export function SidebarApp() {
  const snap = useSnapshot();
  useEffect(() => { if (snap) applyColorMode(snap.colorMode); }, [snap?.colorMode]);
  if (!snap) return <div css={styles.loading} role="status">Connecting to browser…</div>;
  // A user backdrop color tints only the frame behind controls; controls keep
  // semantic surface tokens so text and focus/selection states stay readable.
  return (
    <div css={styles.root} style={snap.backdropColor ? { backgroundColor: snap.backdropColor } : undefined}>
      <Sidebar snap={snap} />
    </div>
  );
}
