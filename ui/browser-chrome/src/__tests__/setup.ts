import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
// jsdom lacks these; ADS popups/tooltips probe them.
(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any;
// Fail tests on any network access attempt from UI code.
(globalThis as any).fetch = () => { throw new Error('network access from sidebar UI is not allowed'); };
