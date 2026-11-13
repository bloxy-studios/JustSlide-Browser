// PREVIEW-ONLY approximation of omnibox input classification. In the native
// browser the raw text is sent to the browser process, which uses Chromium's
// AutocompleteClassifier / URL fixup; this module is never used there.
export type Classified = { kind: 'url'; url: string } | { kind: 'search'; url: string } | { kind: 'rejected'; reason: string };

const SEARCH = 'https://duckduckgo.com/?q=';

export function classifyInputForPreview(raw: string, searchPrefix = SEARCH): Classified {
  const text = raw.trim();
  if (!text) return { kind: 'rejected', reason: 'empty' };
  if (/^(javascript|data|vbscript|file):/i.test(text)) return { kind: 'rejected', reason: 'scheme not allowed from the address field preview' };
  if (/^https?:\/\//i.test(text)) {
    try { return { kind: 'url', url: new URL(text).href }; } catch { return { kind: 'search', url: searchPrefix + encodeURIComponent(text) }; }
  }
  if (!/\s/.test(text) && /^(localhost|\d{1,3}(\.\d{1,3}){3}|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(text)) {
    try { return { kind: 'url', url: new URL('https://' + text).href }; } catch { /* fall through */ }
  }
  return { kind: 'search', url: searchPrefix + encodeURIComponent(text) };
}

export function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
