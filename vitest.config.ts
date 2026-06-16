import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/tests': new URL('./tests', import.meta.url).pathname,
      '@': new URL('./src', import.meta.url).pathname,
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url)
        .pathname
    }
  },
  test: {
    coverage: {
      exclude: [
        '.next/**',
        'app/**/page.tsx',
        'app/**/layout.tsx',
        'app/error.tsx',
        'app/loading.tsx',
        'app/not-found.tsx',
        'eslint.config.mjs',
        'next.config.ts',
        'playwright.config.ts',
        'prettier.config.mjs',
        'scripts/**',
        'tests/**',
        'vitest.config.ts'
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        branches: 60,
        functions: 80,
        lines: 75,
        statements: 75
      }
    },
    exclude: ['.next/**', 'node_modules/**', 'tests/e2e/**']
  }
});
