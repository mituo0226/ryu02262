import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js', '**/*.test.ts'],
    exclude: ['node_modules', '.wrangler', '.cursor'],
  },
  esbuild: {
    target: 'node18',
  },
});
