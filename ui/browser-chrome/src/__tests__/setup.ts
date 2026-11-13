import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any;
// Fail tests on any network access attempt from UI code.
(globalThis as any).fetch = () => { throw new Error('network access from sidebar UI is not allowed'); };
(globalThis as any).CSS ??= { escape: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c) };
