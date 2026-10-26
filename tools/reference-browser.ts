/** Owned CDP browser for original SWF comparisons. Ctrl+C closes only this browser. */
import { chromium } from '@playwright/test';
const port = Number(process.env.BT3_REFERENCE_CDP_PORT ?? 9223);
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--js-flags=--stack-size=4096',
    `--remote-debugging-port=${port}`,
  ],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.goto('http://127.0.0.1:3103');
console.log(`Owned reference browser CDP: http://127.0.0.1:${port}`);
await new Promise<void>((resolve) => {
  process.once('SIGINT', () => {
    void browser.close().finally(resolve);
  });
  browser.once('disconnected', () => resolve());
});
