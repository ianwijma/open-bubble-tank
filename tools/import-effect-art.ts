/** Recover effect IDs/lifetimes from the SWF; output contains no artwork. */
import { readFile, writeFile } from 'node:fs/promises';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const classes = {
  impact: '_-4z',
  seekerExplosion: 'seeker_explosion',
  mineExplosion: '_-6j',
  explosion: '_-1g',
  damageBurst: 'damage_burst',
  leech: '_-4L',
  rocketTrail: '_-cy',
  areaBurst: '_-5',
  teleport: '_-Tv',
  conversion: 'effect_convert',
  ripple: '_-Cd',
  neutralize: '_-Xh',
} as const;
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const ids = JSON.parse(await readFile('src/game/data/symbols.json', 'utf8')) as Record<
  string,
  number
>;
const catalog = Object.fromEntries(
  Object.entries(classes).map(([key, name]) => {
    const symbol = ids[name];
    const frames = symbols.sprites.find((s) => s.id === symbol)?.frameCount;
    if (!symbol || !frames) throw new Error(`Missing effect ${name}`);
    return [key, { className: name, symbol, frames }];
  }),
);
await writeFile('src/game/data/effect-art.json', JSON.stringify(catalog) + '\n');
console.log(`Imported ${Object.keys(catalog).length} effect timelines.`);
const screenClasses = { ink: 'ink_effect', collapseFlash: '_-Qw', collapse: '_-MC' } as const;
const screenCatalog = Object.fromEntries(
  Object.entries(screenClasses).map(([key, name]) => {
    const symbol = ids[name],
      sprite = symbols.sprites.find((s) => s.id === symbol);
    if (!symbol || !sprite) throw new Error(`Missing screen effect ${name}`);
    return [
      key,
      {
        className: name,
        symbol,
        frames: sprite.frameCount,
        // Procedural fallback uses the authored root alpha; original paths are never exported.
        opacity: Array.from({ length: sprite.frameCount }, (_, i) =>
          Math.max(
            0,
            ...buildDisplayList(sprite, i + 1).map((p) =>
              Math.min(1, (p.color?.mult[3] ?? 1) + (p.color?.add[3] ?? 0) / 255),
            ),
          ),
        ),
      },
    ];
  }),
);
await writeFile('src/game/data/screen-effect-art.json', JSON.stringify(screenCatalog) + '\n');
console.log(`Imported ${Object.keys(screenCatalog).length} screen timelines.`);
