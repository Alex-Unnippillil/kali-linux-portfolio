import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
