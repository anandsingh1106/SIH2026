import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // SQLite writes to one file; parallel suites would race on it.
    fileParallelism: false,
    include: ['tests/**/*.test.js'],
  },
});
