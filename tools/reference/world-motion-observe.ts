/** Arm before the declared REA load/F8 scenario; observe only our owned viewer.
 * BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9835 node tools/reference/world-motion-observe.ts
 * Output is ignored. This collector does not load, focus, press keys, or own Chrome.
 */
import { chromium } from '@playwright/test';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
// Node's type stripper requires the extension; this repo's tsc rejects literal
// .ts imports. Keep the explicit runtime path outside the import expression.
const identityModulePath = './loaded-module-identity.ts';
const { loadedReferenceModules } = await import(identityModulePath);

const out = process.env.BT3_PROBE_OUT ?? 'reference-captures/world-motion-runtime';
const endpoint = process.env.BT3_REFERENCE_CDP_ENDPOINT ?? 'http://127.0.0.1:9835';
const origin = process.env.BT3_REFERENCE_URL ?? 'http://127.0.0.1:3835';
// Fresh capture directories only: never append to a prior caller's raw evidence.
await mkdir(dirname(out), { recursive: true });
await mkdir(out);
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
let resolveDone!: () => void;
const completed = new Promise<void>((resolve) => {
  resolveDone = resolve;
});
await page.exposeBinding('bt3ProbeTraceBatch', (_, lines: string[]) => {
  if (lines.some((line) => line.includes('BT3_MOTION_DONE'))) resolveDone();
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
// Completion must arrive after arming; a retained previous DONE is not fresh evidence.
let deadline: ReturnType<typeof setTimeout> | undefined;
try {
  await Promise.race([
    completed,
    new Promise<never>((_, reject) => {
      deadline = setTimeout(
        () => reject(new Error('No fresh completion within 180 seconds.')),
        180_000,
      );
    }),
  ]);
} catch (error) {
  await durable;
  await writeFile(
    out + '/failed-observation.json',
    JSON.stringify({ trace, errors, messages, reason: String(error) }, null, 2),
  );
  await browser.close();
  throw error;
} finally {
  clearTimeout(deadline);
}
await page.waitForTimeout(300);
const modules = await loadedReferenceModules(page);
modules.method = 'Passive post-DONE CDP Debugger inventory/getScriptSource in the same page realm';
const debug = await page.context().newCDPSession(page);
const scripts: { scriptId: string; url: string; scriptLanguage?: string }[] = [];
debug.on('Debugger.scriptParsed', (script) => scripts.push(script));
await debug.send('Debugger.enable');
const viewerModules = [];
try {
  for (const script of scripts.filter((s) => s.url === origin + '/reference.js')) {
    const { scriptSource } = await debug.send('Debugger.getScriptSource', {
      scriptId: script.scriptId,
    });
    const bytes = Buffer.from(scriptSource, 'utf8');
    viewerModules.push({
      url: script.url,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
} finally {
  await debug.send('Debugger.disable').finally(() => debug.detach());
}

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
      viewerModules,
      responses,
      trace,
      messages,
      errors,
      denied,
      status: await page.locator('#status').textContent(),
      limitations: [
        'Manual Playwright collector; not itself an REA Evidence record.',
        'MutationObserver batches can coalesce; verifier requires the complete ordered sample matrix.',
        'Debugger byte inventory occurs after DONE and does not establish wall-clock frame timing.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    samples: trace.filter((s) => s.startsWith('BT3_MOTION_BITS ')).length,
    errors,
    avmErrors: messages.filter((m) => /Error #/.test(m.text)),
    observedModules: modules.modules.length,
  }),
);
await browser.close();
