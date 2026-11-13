/** Read-only source/binding audit. Emits pure identities, never SWF/media. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { decompressSWF } from '../../src/game/assets/swf.mjs';
import { extractSymbols } from '../../src/game/assets/swf-symbols.mjs';
const sha = (b) => createHash('sha256').update(b).digest('hex');
export async function audit(original) {
  const raw = await readFile(original);
  assert.equal(sha(raw), 'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153');
  const { bytes } = await decompressSWF(new Uint8Array(raw));
  const { symbols, errors } = await extractSymbols(bytes, { svg: false });
  assert.deepEqual(errors, []);
  const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
  const catalog = {};
  for (const file of ['effect-art.json', 'screen-effect-art.json'])
    Object.assign(
      catalog,
      JSON.parse(await readFile(new URL('../../src/game/data/' + file, import.meta.url))),
    );
  const sourceHashes = {},
    roots = [];
  async function source(name) {
    const result = {};
    for (const [folder, ext] of [
      ['export_scripts_deobf/scripts', '.as'],
      ['export_pcode/scripts', '.pcode'],
    ]) {
      const path = folder + '/' + name.replaceAll('.', '/') + ext;
      const raw = await readFile(resolve(dirname(original), path));
      sourceHashes[path] = sha(raw);
      result[ext] = raw.toString();
    }
    return result;
  }
  for (const [key, { className, symbol, frames }] of Object.entries(catalog)) {
    assert.equal(
      symbols.symbolNames[symbol],
      className,
      'Catalog differs from original SymbolClass',
    );
    assert.equal(sprites.get(symbol).frameCount, frames);
    const src = await source(className);
    assert(src['.as'].includes(`symbol="symbol${symbol}"`));
    assert.match(src['.as'], /extends MovieClip/);
    assert.match(
      src['.as'],
      new RegExp(
        'public function ' +
          className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '\\(\\)\\s*\\{\\s*super\\(\\);\\s*\\}',
      ),
    );
    assert(!/addFrameScript|\bstop\(|\bplay\(|gotoAnd/.test(src['.as']));
    assert(!/"(?:addFrameScript|stop|play|gotoAndStop|gotoAndPlay)"/.test(src['.pcode']));
    const codes = [...src['.pcode'].matchAll(/code\s*\n([\s\S]*?)end ; code/g)].map((m) =>
      m[1]
        .trim()
        .split('\n')
        .map((s) => s.trim()),
    );
    assert(
      codes.some(
        (c) =>
          JSON.stringify(c) ===
          JSON.stringify([
            'getlocal0',
            'pushscope',
            'getlocal0',
            'constructsuper 0',
            'returnvoid',
            'returnvoid',
          ]),
      ),
    );
    const seen = new Set();
    function walk(id) {
      if (seen.has(id)) return;
      seen.add(id);
      for (const p of sprites.get(id)?.placements ?? []) if (p.charId !== undefined) walk(p.charId);
    }
    walk(symbol);
    const descendants = [];
    for (const id of [...seen].filter((id) => id !== symbol && sprites.has(id))) {
      const name = symbols.symbolNames[id] ?? null;
      const s = name ? await source(name) : null;
      descendants.push({
        symbol: id,
        frames: sprites.get(id).frameCount,
        className: name,
        frameScript: s ? /addFrameScript/.test(s['.as']) : false,
        random: s ? /Math\.random/.test(s['.as']) : false,
      });
    }
    roots.push({ key, className, symbol, frames, constructorOnlySuper: true, descendants });
  }
  for (const name of ['Main', 'BTAGameWorld', 'Bubblefield', '_-0D', '_-2c']) await source(name);
  return { originalSha256: sha(raw), roots, sourceHashes };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [original, output] = process.argv.slice(2);
  if (!output || resolve(original) === resolve(output)) throw new Error('Supply ORIGINAL OUTPUT');
  await writeFile(output, JSON.stringify(await audit(original), null, 2) + '\n');
}
