/** Creator969 controls: placements, primitive bounds/colors and text advances only; no paths/media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SymbolResult } from '../src/game/assets/asset-pack';
import { createSwfLayout } from './lib/swf-layout';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const { collect, bounds } = createSwfLayout(symbols);
const names = [
  'SymmetricMode_mc',
  'LoadTank_mc',
  'SaveExit_mc',
  'Exit_mc',
  'DeleteButton_mc',
  'BringFront_mc',
  'SendBack_mc',
  'AlignCenter_mc',
  'Undo_mc',
  'Left_mc',
  'Right_mc',
];
const placements = buildDisplayList(sprites.get(969)!, 1);
const controls = names.map((name) => {
  const p = placements.find((p) => p.name === name)!;
  const variants = Object.fromEntries(
    [1, 2].flatMap((frame) =>
      (['up', 'over', 'down'] as const).map((state) => [
        `${frame}:${state}`,
        collect(p.charId, frame, state),
      ]),
    ),
  );
  return { name, symbol: p.charId, matrix: p.matrix, bounds: bounds(variants['1:up']), variants };
});
const sliders = ['Resize_mc', 'Rotate_mc'].map((name) => {
  const p = placements.find((p) => p.name === name)!,
    children = buildDisplayList(sprites.get(p.charId)!, 1),
    handle = children.find((p) => p.name)!;
  return {
    name,
    symbol: p.charId,
    matrix: p.matrix,
    track: children.filter((p) => !p.name).flatMap((p) => collect(p.charId, 1, 'up', p.matrix)),
    handle: {
      symbol: handle.charId,
      matrix: handle.matrix,
      variants: [collect(handle.charId, 1, 'up'), collect(handle.charId, 2, 'up')],
    },
  };
});
await writeFile(
  'src/game/data/creator-controls.json',
  JSON.stringify({
    symbol: 969,
    workspace: placements.find((p) => p.name === 'rings_mc')!.matrix,
    controls,
    sliders,
  }) + '\n',
);
console.log(
  `Imported ${controls.length} creator controls and ${sliders.length} transform sliders. No artwork.`,
);
