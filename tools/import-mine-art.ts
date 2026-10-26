/** Recover mine symbols, frame counts and authored labels without exporting artwork. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF, iterTags, readHeader, u16 } from '../src/game/assets/swf.mjs';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const symbols = JSON.parse(await readFile('src/game/data/symbols.json', 'utf8')) as Record<
  string,
  number
>;
const classes = { enemy: '_-14._-U9', ally: '_-14._-M1', seeker: '_-14._-XK' };
const sprites = new Map<number, { frames: number; labels: Record<string, number> }>();
for (const tag of iterTags(bytes, readHeader(bytes).tagsOffset))
  if (tag.code === 39) {
    let frame = 1;
    const labels: Record<string, number> = {};
    for (const child of iterTags(tag.body, 4)) {
      if (child.code === 1) frame++;
      else if (child.code === 43) {
        const zero = child.body.indexOf(0);
        labels[new TextDecoder().decode(child.body.subarray(0, zero < 0 ? undefined : zero))] =
          frame;
      }
    }
    sprites.set(u16(tag.body, 0), { frames: u16(tag.body, 2), labels });
  }
const result = Object.fromEntries(
  Object.entries(classes).map(([key, className]) => {
    const symbol = symbols[className],
      sprite = sprites.get(symbol);
    if (!sprite) throw new Error(`Missing mine ${className}`);
    return [key, { symbol, ...sprite }];
  }),
);
await writeFile('src/game/data/mine-art.json', JSON.stringify(result) + '\n');
console.log(JSON.stringify(result));
