import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3099',
  },
  webServer: {
    command: 'node e2e/mock-server.js',
    port: 3099,
    reuseExistingServer: false,
  },
});
