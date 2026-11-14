import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const report = fileURLToPath(new URL('../../docs/thread-report/report.html', import.meta.url));
const stats = JSON.parse(
  await readFile(new URL('../../docs/thread-report/stats.json', import.meta.url), 'utf8'),
);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [],
  network = [];
let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions++;
}
try {
  for (const width of [1100, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    await page.goto(pathToFileURL(report).href);
    const expected = stats.scopes.all.kinds.command_execution.toLocaleString('en-US');
    check(
      await page
        .locator('#cards')
        .innerText()
        .then((text) => text.includes(expected)),
      'all-agent counts render',
    );
    check(
      await page
        .locator('#cost')
        .innerText()
        .then((text) => text.includes(stats.pricing.short_standard_scenario_usd.toFixed(2))),
      'published short-rate scenario renders',
    );
    await page.selectOption('#scope', 'root');
    check(
      await page
        .locator('#cards .card')
        .nth(1)
        .locator('strong')
        .innerText()
        .then((text) => text === '0'),
      'root scope excludes children',
    );
    check(
      await page
        .locator('#cards')
        .innerText()
        .then((text) =>
          text.includes(stats.scopes.root.kinds.command_execution.toLocaleString('en-US')),
        ),
      'root commands recalculate',
    );
    await page.selectOption('#scope', 'all');
    await page.selectOption('#metric', 'file_read_candidates');
    await page.fill('#search', 'docs/fidelity.md');
    check((await page.locator('#results tr').count()) === 1, 'search filters candidate paths');
    check(
      await page
        .locator('#results tr td')
        .last()
        .innerText()
        .then(
          (text) =>
            text ===
            stats.scopes.all.file_read_candidates['docs/fidelity.md'].toLocaleString('en-US'),
        ),
      'search result matches archived analysis',
    );
    for (const id of ['input-rate', 'cache-rate', 'output-rate', 'write-rate'])
      await page.fill(`#${id}`, '0');
    check(
      await page
        .locator('#cost')
        .innerText()
        .then((text) => text === '$0.00 USD'),
      'price calculator responds to inputs',
    );
    await page.fill('#output-rate', '10');
    check(
      await page
        .locator('#cost')
        .innerText()
        .then(
          (text) =>
            text ===
            ((stats.scopes.all.usage.totals.outputTokens * 10) / 1e6).toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            }) +
              ' USD',
        ),
      'output tokens priced once',
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `no horizontal overflow at ${width}px`,
    );
    check(
      (await page.locator('#daily .day').count()) === Object.keys(stats.scopes.all.daily).length,
      'daily chart preserves calendar gaps',
    );
    check(
      await page
        .locator('#results td')
        .last()
        .evaluate((node) => getComputedStyle(node).whiteSpace === 'nowrap'),
      'counts do not break across lines',
    );
    await page.close();
  }
  check(errors.length === 0, `no JavaScript or console errors: ${errors.join('; ')}`);
  check(network.length === 0, `no network requests: ${network.join('; ')}`);
  process.stdout.write(
    JSON.stringify({ assertions, widths: [1100, 390], errors, networkRequests: network.length }) +
      '\n',
  );
} finally {
  await browser.close();
}
