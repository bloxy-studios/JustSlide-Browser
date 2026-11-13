import { describe, expect, it } from 'vitest';
import { classifyInputForPreview } from '../lib/input';

describe('preview input classification (native uses Chromium omnibox)', () => {
  it('handles urls, hosts and searches', () => {
    expect(classifyInputForPreview('https://example.com')).toEqual({ kind: 'url', url: 'https://example.com/' });
    expect(classifyInputForPreview('example.com/a')).toEqual({ kind: 'url', url: 'https://example.com/a' });
    expect(classifyInputForPreview('what is gn').kind).toBe('search');
  });
  it('rejects script-bearing schemes', () => {
    for (const s of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd']) expect(classifyInputForPreview(s).kind).toBe('rejected');
  });
});
