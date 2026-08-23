
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['**/inject-usage.test.ts'],
    environment: 'node',
  },
});
