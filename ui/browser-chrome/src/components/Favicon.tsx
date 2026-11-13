import { useState } from 'react';
import { useBridge } from '../bridge/context';
import { Icon } from '../design-system/Icon';
import { brandForUrl, displayHost } from '../lib/brands';
import s from './favicon.module.css';

/**
 * Website identity. Native: Chromium's favicon2 data source (the site's real
 * favicon). Preview builds have no favicon service, so a known brand mark or
 * a letter tile stands in. `brandFirst` is used for curated favorite tiles.
 */
export function Favicon({ url, size = 16, brandFirst = false }: { url: string; size?: number; brandFirst?: boolean }) {
  const bridge = useBridge();
  const [failed, setFailed] = useState(false);
  const brand = brandForUrl(url);
  if (brand && (brandFirst || bridge.kind === 'preview')) return <Icon name={brand} size={size} />;
  if (bridge.kind === 'native' && /^https?:/.test(url) && !failed) {
    const src = `chrome://favicon2/?size=${size}&scaleFactor=2x&pageUrl=${encodeURIComponent(url)}&allowGoogleServerFallback=0`;
    return <img className={s.img} width={size} height={size} src={src} alt="" aria-hidden onError={() => setFailed(true)} />;
  }
  const letter = (displayHost(url)[0] ?? '•').toUpperCase();
  return <span className={s.letter} style={{ width: size, height: size }} aria-hidden>{letter}</span>;
}
