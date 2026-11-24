import {defineConfig} from 'vitest/config';

// Separate from vite.config.ts so tests don't load the PWA / Tailwind plugins.
// Domain modules are pure TypeScript and run in plain Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
