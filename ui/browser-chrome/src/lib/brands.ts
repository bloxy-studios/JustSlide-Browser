import type { IconName } from '../generated/icons';
import { hasIcon } from '../design-system/Icon';

// Curated brand shortcuts present in the Figma favorites grid (7:87) and
// workspace dock (20:17). Ordinary sites use their real favicon instead.
const HOST_BRANDS: Array<[RegExp, string]> = [
  [/(^|\.)youtube\.com$/, 'brand-youtube'],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, 'brand-chatgpt'],
  [/(^|\.)claude\.ai$/, 'brand-claude'],
  [/^mail\.google\.com$/, 'brand-gmail'],
  [/(^|\.)aws\.amazon\.com$/, 'brand-aws'],
  [/(^|\.)github\.com$/, 'brand-github'],
  [/(^|\.)slack\.com$/, 'brand-slack'],
  [/(^|\.)notion\.(so|com)$/, 'brand-notion'],
  [/(^|\.)discord\.com$/, 'brand-discord'],
  [/(^|\.)netflix\.com$/, 'brand-netflix'],
  [/(^|\.)supabase\.com$/, 'brand-supabase'],
  [/(^|\.)convex\.dev$/, 'brand-convex'],
];

export function brandForUrl(url: string): IconName | null {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  for (const [re, name] of HOST_BRANDS) if (re.test(host) && hasIcon(name)) return name;
  return null;
}

export function displayHost(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.hostname.replace(/^www\./, '');
    return url;
  } catch { return url; }
}
