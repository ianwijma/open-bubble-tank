import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3101',
    viewport: { width: 1200, height: 1000 },
    headless: true,
    launchOptions: {
      executablePath: existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    ...(process.env.BT3_REFERENCE
      ? [
          {
            command: 'bun run reference',
            url: 'http://127.0.0.1:3103',
            reuseExistingServer: true,
            timeout: 120000,
          },
        ]
      : []),
    {
      command: 'bun run start --port 3101',
      url: 'http://localhost:3101',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'bun tools/visual-fixtures.ts',
      url: 'http://127.0.0.1:3102',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
