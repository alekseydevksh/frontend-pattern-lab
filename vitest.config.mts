import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      '@content': fromRoot('./content'),
      '@messages': fromRoot('./messages'),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'content/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
