/** @jsxRuntime classic */
/** @jsx jsx */
import { cssMap, jsx } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import { useBridge } from '../bridge/context';
import { hostOf } from '../lib/input';

const styles = cssMap({
  img: { width: '16px', height: '16px', flexShrink: 0, borderRadius: token('radius.xsmall') },
  letter: {
    width: '16px', height: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: token('radius.xsmall'), backgroundColor: token('color.background.neutral'), color: token('color.text.subtle'),
    font: token('font.body.small'), fontWeight: token('font.weight.semibold'),
  },
});

/** Native: Chromium's favicon2 data source (added by the WebUI controller). Preview: letter tile. */
export function Favicon({ url, size = 16 }: { url: string; size?: number }) {
  const bridge = useBridge();
  if (bridge.kind === 'native' && /^https?:/.test(url)) {
    const src = `chrome://favicon2/?size=${size}&scaleFactor=2x&pageUrl=${encodeURIComponent(url)}&allowGoogleServerFallback=0`;
    return <img css={styles.img} src={src} alt="" aria-hidden />;
  }
  const letter = (hostOf(url).replace(/^www\./, '')[0] ?? '•').toUpperCase();
  return <span css={styles.letter} aria-hidden>{letter}</span>;
}
