/** Numeric registrations/bounds only; original menu art is loaded from a supplied SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
function bounds(id: number): { x: number; y: number; width: number; height: number } {
  const leaf = [...symbols.shapes, ...symbols.texts].find((s) => s.id === id);
  if (leaf?.bounds)
    return {
      x: leaf.bounds.xMin / 20,
      y: leaf.bounds.yMin / 20,
      width: (leaf.bounds.xMax - leaf.bounds.xMin) / 20,
      height: (leaf.bounds.yMax - leaf.bounds.yMin) / 20,
    };
  const points = buildDisplayList(sprites.get(id)!, 1).flatMap((p) => {
    const b = bounds(p.charId),
      m = p.matrix;
    return [b.x, b.x + b.width].flatMap((x) =>
      [b.y, b.y + b.height].map((y) => ({
        x: x * m.a + y * m.c + m.tx / 20,
        y: x * m.b + y * m.d + m.ty / 20,
      })),
    );
  });
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
const rootList = buildDisplayList(sprites.get(556)!, 1);
const piece = (name: string) => {
  const p = rootList.find((p) => p.name === name)!;
  return { name, symbol: p.charId, matrix: p.matrix, depth: p.depth, bounds: bounds(p.charId) };
};
const data = {
  background: rootList.find((p) => p.depth === 1)!.charId,
  title: piece('title'),
  controls: [
    'play_btn',
    'settings_btn',
    'partsPacks_btn',
    'credits_btn',
    'enemyCreator_btn',
    'pmg_btn',
  ].map(piece),
};
await writeFile('src/game/data/main-menu-geometry.json', JSON.stringify(data) + '\n');
console.log('Imported numeric main-menu registrations and bounds. No artwork.');
