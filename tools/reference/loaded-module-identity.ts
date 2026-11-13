import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

/** Observe loaded bytes independently of installed/configured runtime metadata. */
export async function loadedReferenceModules(page: Page) {
  const session = await page.context().newCDPSession(page),
    scripts: {
      scriptId: string;
      url: string;
      scriptLanguage?: string;
      executionContextId: number;
    }[] = [],
    runtimeRoot = resolve('node_modules/@ruffle-rs/ruffle'),
    wasmFiles = (await readdir(runtimeRoot)).filter((file) => file.endsWith('.wasm')),
    digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  const modules = [];
  session.on('Debugger.scriptParsed', (script) => scripts.push(script));
  try {
    // Enabling Debugger replays parsed-script identities for this page's runtime.
    await session.send('Debugger.enable', { maxScriptsCacheSize: 64 * 1024 * 1024 });
    for (const script of scripts) {
      const wasm = script.scriptLanguage === 'WebAssembly';
      if (!wasm && !/^https?:\/\/[^/]+\/ruffle\/[^/]+\.js$/.test(script.url)) continue;
      const source = await session.send('Debugger.getScriptSource', { scriptId: script.scriptId }),
        bytes = source.bytecode
          ? Buffer.from(source.bytecode, 'base64')
          : Buffer.from(source.scriptSource, 'utf8'),
        sha256 = digest(bytes),
        candidates = wasm ? wasmFiles : [basename(new URL(script.url).pathname)],
        installedComparisons = await Promise.all(
          candidates.map(async (name) => {
            const installed = await readFile(resolve(runtimeRoot, name)),
              installedSha256 = digest(installed);
            return {
              name,
              bytes: installed.length,
              sha256: installedSha256,
              matchesObserved: installedSha256 === sha256,
            };
          }),
        );
      modules.push({
        url: script.url,
        language: script.scriptLanguage,
        executionContextId: script.executionContextId,
        representation: wasm ? 'CDP-exposed-WASM-bytecode' : 'CDP-scriptSource-UTF8',
        bytes: bytes.length,
        sha256,
        installedComparisons,
      });
    }
  } finally {
    await session.send('Debugger.disable').finally(() => session.detach());
  }
  if (!modules.some((module) => module.language === 'WebAssembly'))
    throw new Error('No loaded reference WASM module was observed.');
  if (modules.some((module) => !module.installedComparisons.some((file) => file.matchesObserved)))
    throw new Error('Loaded reference module bytes do not match the installed runtime.');
  return {
    method: 'Passive CDP Debugger inventory/getScriptSource before controlled reference inputs',
    modules,
    limitations: [
      'Loaded byte identity is not complete execution coverage or wire provenance.',
      'Debugger attachment may perturb runtime performance; captures do not establish frame timing.',
      'This observation applies only to this capture session, not earlier reference captures.',
    ],
  };
}
