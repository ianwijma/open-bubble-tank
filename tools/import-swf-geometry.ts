/** Extract numerical emitter geometry from the research SWF, never artwork. */
import { readFile, writeFile } from 'node:fs/promises';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { decodeTankCode } from '../src/game/services/tank-code';
import { PARTS } from '../src/game/data/catalog';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const hud = sprites.get(1534)!;
const minimap = hud.placements.find((p) => p.name === 'minimap_mc')!;
const minimapSprite = sprites.get(minimap.charId!)!;
const modes = Array.from({ length: minimapSprite.frameCount }, (_, index) => {
  const list = new Map<number, (typeof minimapSprite.placements)[number]>();
  for (const p of minimapSprite.placements) {
    if (p.frame > index + 1) break;
    if (p.remove) list.delete(p.depth);
    else list.set(p.depth, { ...list.get(p.depth), ...p });
  }
  const map = [...list.values()].find((p) => p.name === 'map_mc')!;
  const border = list.get(8)?.charId;
  const bounds = symbols.shapes.find((s) => s.id === border)?.bounds;
  return {
    center: { x: map.matrix!.tx / 20, y: map.matrix!.ty / 20 },
    scale: map.matrix!.a,
    size: bounds
      ? { width: (bounds.xMax - bounds.xMin) / 20, height: (bounds.yMax - bounds.yMin) / 20 }
      : null,
  };
});
await writeFile(
  'src/game/data/minimap-geometry.json',
  JSON.stringify({
    symbol: minimap.charId,
    button: 1527,
    dot: 1512,
    connector: 1937,
    origin: { x: minimap.matrix!.tx / 20, y: minimap.matrix!.ty / 20 },
    modes,
  }) + '\n',
);
const field = sprites.get(1551)!;
const travelMask = sprites.get(field.placements.find((p) => p.name === '_-SQ')!.charId!)!;
const maskShape = symbols.shapes.find((shape) => shape.id === travelMask.placements[0].charId)!;
const maskBounds = maskShape.bounds!;
await writeFile(
  'src/game/data/field-geometry.json',
  JSON.stringify({
    // BTAGameWorld.MoveAvatarToNewBubblefieldLocation spaces fields by _-SQ.width,
    // including the exterior mask, rather than the visible 847.5px bubble diameter.
    transitDiameter: (maskBounds.xMax - maskBounds.xMin) / 20,
  }) + '\n',
);
const emitters: Record<number, { x: number; y: number }[]> = {};
for (const part of PARTS.filter((p) => p.id >= 2000)) {
  const s = sprites.get(part.symbol);
  const order = (name: string | undefined) =>
    name === (part.id === 3008 ? 'bullet_mc' : '_-Vk')
      ? -1
      : Number(name?.replace('emitter', '')) || 100;
  const positions =
    s?.placements
      .filter(
        (p) =>
          p.frame === 1 && p.matrix && p.name && /^(?:_-Vk|emitter\d+|bullet_mc)$/.test(p.name),
      )
      .sort((a, b) => order(a.name) - order(b.name))
      .map((p) => ({ x: p.matrix!.tx / 20, y: p.matrix!.ty / 20 })) ?? [];
  if (positions.length) emitters[part.id] = positions;
}
await writeFile('src/game/data/emitters.json', JSON.stringify(emitters) + '\n');
const whip = sprites.get(2035)!;
const whipFrames = Array.from({ length: whip.frameCount }, (_, i) => {
  const placed = new Map<number, (typeof whip.placements)[number]>();
  for (const p of whip.placements) {
    if (p.frame > i + 1) break;
    if (p.remove) placed.delete(p.depth);
    else placed.set(p.depth, { ...placed.get(p.depth), ...p });
  }
  return [...placed.values()]
    .filter((p) => p.matrix)
    .map((p) => ({ x: p.matrix!.tx / 20, y: p.matrix!.ty / 20 }));
});
await writeFile('src/game/data/whip.json', JSON.stringify(whipFrames) + '\n');
const allies = {};
for (const [id, filename] of [
  ['swarm', '_-Va'],
  ['mine', '_-AW'],
]) {
  const code = (
    await readFile(`${root}/re/bt3/export_scripts_deobf/scripts/_-ct/${filename}.as`, 'utf8')
  ).match(/String = "([0-9a-f]{100,})"/)?.[1];
  if (!code) throw new Error(`Missing ${filename} tank code`);
  Object.assign(allies, { [id]: { ...(await decodeTankCode(code)), life: 15 } });
}
await writeFile('src/game/data/allies.json', JSON.stringify(allies) + '\n');
console.log(
  `Imported ${Object.keys(emitters).length} emitter layouts and two original ally tanks.`,
);
