import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['components/**/*.test.ts?(x)', 'pages/**/*.test.ts?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      exclude: ['public/**'],
      include: ['components/BadgeList.tsx'],
    },
    deps: {
      optimizer: {
        enabled: false,
      },
    },
  },
  esbuild: {
    loader: 'tsx',
  },
});
