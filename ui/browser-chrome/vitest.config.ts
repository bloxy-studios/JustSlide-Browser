import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', globals: true, include: ['src/__tests__/**/*.test.{ts,tsx}'], setupFiles: ['src/__tests__/setup.ts'],
    // Keep CSS-module class names readable in assertions.
    css: { include: [/\.module\.css$/], modules: { classNameStrategy: 'non-scoped' } },
  },
});
