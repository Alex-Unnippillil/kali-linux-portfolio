import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['utilities/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['utilities/**/*.ts'],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
});
