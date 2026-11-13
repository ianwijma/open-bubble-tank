/** Arm before the declared REA load/F8 scenario; observe only our owned viewer.
 * BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9255 node tools/reference/projectile-frame-observe.ts
 * Output is ignored. This collector does not load, focus, press keys, or own Chrome.
 */
import { chromium } from '@playwright/test';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Node's type stripper requires the extension; this repo's tsc rejects literal
// .ts imports. Keep the explicit runtime path outside the import expression.
const identityModulePath = './loaded-module-identity.ts';
const { loadedReferenceModules } = await import(identityModulePath);

const out = process.env.BT3_PROBE_OUT ?? 'reference-captures/projectile-frame-runtime';
const endpoint = process.env.BT3_REFERENCE_CDP_ENDPOINT ?? 'http://127.0.0.1:9255';
const origin = 'http://127.0.0.1:3255';
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url() === origin + '/');
if (!page) throw new Error('Owned reference page is absent.');
const messages: { type: string; text: string }[] = [];
const errors: string[] = [];
const denied: string[] = [];
const responses: unknown[] = [];
const pending: Promise<void>[] = [];
const trace: string[] = [];
let durable = Promise.resolve();
page.on('console', (m) => messages.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => errors.push(String(e)));
await page.context().route('**/*', async (route) => {
  const url = route.request().url();
  if (url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)) await route.continue();
  else {
    denied.push(url);
    await route.abort('blockedbyclient');
  }
});
page.on('response', (r) => {
  if (!r.url().startsWith(origin + '/') || !/\.(js|wasm|swf)$/.test(new URL(r.url()).pathname))
    return;
  pending.push(
    (async () => {
      try {
        const bytes = await r.body();
        responses.push({
          url: r.url(),
          status: r.status(),
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      } catch (e) {
        responses.push({ url: r.url(), error: String(e) });
      }
    })(),
  );
});
await page.exposeBinding('bt3ProbeTraceBatch', (_, lines: string[]) => {
  trace.push(...lines);
  durable = durable.then(() =>
    appendFile(out + '/trace.jsonl', lines.map((line) => JSON.stringify(line)).join('\n') + '\n'),
  );
});
const installTraceObserver = () => {
  let previous: string[] = [];
  const install = () => {
    const target = document.querySelector('#trace');
    if (!target) return;
    new MutationObserver(() => {
      const now = (target.textContent ?? '').split('\n').filter(Boolean);
      let overlap = Math.min(previous.length, now.length);
      while (overlap && previous.slice(-overlap).join('\n') !== now.slice(0, overlap).join('\n'))
        overlap--;
      const added = now.slice(overlap);
      previous = now;
      if (added.length)
        void (
          window as unknown as { bt3ProbeTraceBatch(lines: string[]): Promise<void> }
        ).bt3ProbeTraceBatch(added);
    }).observe(target, { childList: true, characterData: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
};
await page.addInitScript(installTraceObserver);
await page.evaluate(installTraceObserver);
await writeFile(
  out + '/armed.json',
  JSON.stringify({ endpoint, origin, version: browser.version(), observerPid: process.pid }) + '\n',
);
console.log('Observer armed; awaiting the declared external load/F8 scenario.');
await page.waitForFunction(
  () => document.querySelector('#trace')?.textContent?.includes('BT3_PROJECTILE_DONE 40'),
  undefined,
  { timeout: 0 },
);
await page.waitForTimeout(300);
const modules = await loadedReferenceModules(page);
await Promise.all(pending);
await durable;
await page.screenshot({ path: out + '/probe.png' });
await writeFile(
  out + '/observation.json',
  JSON.stringify(
    {
      endpoint,
      origin,
      version: browser.version(),
      modules,
      responses,
      trace,
      messages,
      errors,
      denied,
      status: await page.locator('#status').textContent(),
      limitations: [
        'Manual Playwright collector; not itself an REA Evidence record.',
        'MutationObserver batches can coalesce; verifier requires the complete numbered sample matrix.',
        'Debugger byte inventory occurs after DONE and does not establish wall-clock frame timing.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    samples: trace.filter((s) => s.startsWith('BT3_PROJECTILE_SAMPLE')).length,
    errors,
    avmErrors: messages.filter((m) => /Error #/.test(m.text)),
    observedModules: modules.modules.length,
  }),
);
await browser.close();
