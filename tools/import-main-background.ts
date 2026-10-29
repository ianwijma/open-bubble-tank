/** Paint parameters only; no extracted paths, images or SWFs are retained. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as {
  symbols: { shapes: { id: number; bounds: unknown; fills: unknown[] }[] };
};
const shape = symbols.shapes.find((s) => s.id === 356)!;
await writeFile(
  'src/game/data/main-background.json',
  JSON.stringify({ symbol: 357, leaf: shape.id, bounds: shape.bounds, fill: shape.fills[0] }) +
    '\n',
);
console.log('Imported Main background numeric paint parameters. No artwork.');
