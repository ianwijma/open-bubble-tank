/** Read-only original actor constructor, catalog and authored-tree identities. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
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
  const sourceHashes = {};
  async function source(name) {
    const result = {};
    for (const [folder, ext] of [
      ['export_scripts/scripts', '.as'],
      ['export_scripts_deobf/scripts', '.as'],
      ['export_pcode/scripts', '.pcode'],
    ]) {
      const path = folder + '/' + name.replaceAll('.', '/') + ext;
      const raw = await readFile(resolve(dirname(original), path));
      sourceHashes[path] = sha(raw);
      result[folder] = raw.toString();
    }
    return result;
  }
  for (const name of [
    'Main',
    'BTAGameWorld',
    'TankData',
    '_-0D',
    '_-HJ',
    '_-Zx',
    'EnemyAI',
    'Weapon',
    'Bubblefield',
  ])
    await source(name);
  const catalog = JSON.parse(
    await readFile(new URL('../../src/game/data/parts.json', import.meta.url)),
  );
  const mounts = [];
  for (const id of [1501, 4015, 1001, 1102]) {
    const p = catalog.find((p) => p.id === id),
      seen = new Set();
    function walk(id) {
      if (seen.has(id) || !sprites.has(id)) return;
      seen.add(id);
      for (const child of sprites.get(id).placements)
        if (child.charId !== undefined) walk(child.charId);
    }
    walk(p.symbol);
    const tree = [];
    for (const symbol of [...seen]) {
      const className = symbols.symbolNames[symbol] ?? null;
      const src = className ? await source(className) : null;
      const as = src?.['export_scripts_deobf/scripts'] ?? '';
      tree.push({
        symbol,
        className,
        frames: sprites.get(symbol).frameCount,
        frameScript: /addFrameScript/.test(as),
        stop: /\bstop\(/.test(as),
        random: /Math.random/.test(as),
      });
    }
    mounts.push({ id, name: p.name, symbol: p.symbol, tree });
  }
  const library = await readFile(
    resolve(dirname(original), 'export_scripts/scripts/_-HJ.as'),
    'utf8',
  );
  const code = [...library.matchAll(/this\._-UH\.push\("([^"\n]+)"/g)][13][1];
  const npc = JSON.parse(
    await readFile(new URL('../../src/game/data/tanks.json', import.meta.url)),
  ).enemy_tanks.find((e) => e.id === 'E10000033');
  assert.equal(code, npc.sourceCode, 'Original built-in library index changed');
  return {
    sourceHashes,
    mounts,
    npc: {
      id: npc.id,
      name: npc.name,
      library: '_-UH',
      index: 13,
      mode: 3,
      sourceCodeSha256: sha(code),
      partTypes: npc.parts.map((p) => p.type),
    },
    controlled: {
      mode: 0,
      parts: [
        ['wiggle-negative', 1501, 0, -20],
        ['wiggle-positive', 1501, 0, 20],
        ['rotor', 4015, 30, 0],
      ],
    },
    scope:
      'Genuine TankData._-Tr; no actor/World.Run. Field Deactivate and _-G0 actual calls; departure, parent add/remove and cache-record construction are controlled glue. Binary original getters only, no recreation poses.',
  };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await audit(process.argv[2]);
  await writeFile(process.argv[3], JSON.stringify(result, null, 2) + '\n');
}
