import { expect, test } from 'bun:test';
import { AssetPack, type Raster } from '../src/game/assets/asset-pack';
import { STARTER, partById } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { addTankChild, removeTankChild } from '../src/game/simulation/tank-display';

// Explicit synthetic contact leaves isolate physical membership through the
// existing public provider. These are not new field geometry.
function raster(opaque = true, size = 20): Raster {
  const pixels = new Uint8ClampedArray(size * size * 4);
  if (opaque) for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  return {
    x: -size / 2,
    y: -size / 2,
    width: size,
    height: size,
    resolution: 1,
    canvas: { width: size, height: size } as HTMLCanvasElement,
    pixels,
    url: '',
  };
}
function pack(leaves: [number, Raster][], frames: [number, Raster[]][] = []) {
  const result = new AssetPack();
  Object.assign(result, { leaves: new Map(leaves), frames: new Map(frames) });
  return result;
}

test('removed forcefield wrapper cannot contact through stale readiness or a retained clone', () => {
  const design = {
      ...STARTER,
      parts: [
        { ...STARTER.parts[0], x: 40, y: 0 },
        { ...STARTER.parts[1], key: 'field', type: 5005, x: 0, y: 0 },
      ],
    },
    tank = createTank(3, design, 'player'),
    // The stand-in field part paints nothing of its own here.
    assets = pack([[99000, raster()]], [[5005, [raster(false)]]]);
  const bodySymbol = partById(design.parts[0].type)!.symbol;
  Object.assign(assets, {
    sprites: new Map([
      [
        bodySymbol,
        {
          id: bodySymbol,
          frameCount: 1,
          placements: [
            { charId: 99000, depth: 1, frame: 1, matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } },
          ],
        },
      ],
    ]),
  });
  // The actual live mount is removed; the forcefield's clone keeps it.
  tank.removedParts.add(design.parts[0].key);
  removeTankChild(tank, `part:${design.parts[0].key}`);
  expect(assets.hitTest(tank, 40, 0)).toBe(true);
  removeTankChild(tank, 'forcefield');
  expect(tank.forcefieldAttached).toBe(true);
  expect(tank.forcefieldReady).toBe(true);
  expect(assets.hitTest(tank, 40, 0)).toBe(false);
  addTankChild(tank, 'forcefield');
  expect(assets.hitTest(tank, 40, 0)).toBe(true);
});

test('stand-in shield film contacts only while its physical child is attached', () => {
  const assets = pack([], [[1001, [raster(false)]]]),
    tank = createTank(4, STARTER, 'enemy');
  for (const part of tank.design.parts) removeTankChild(tank, `part:${part.key}`);
  tank.shield = 100;
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
  addTankChild(tank, 'shield-film');
  expect(assets.hitTest(tank, 0, 0)).toBe(true);
  // The stand-in impact child has no contact geometry of its own.
  addTankChild(tank, 'shield-hit');
  removeTankChild(tank, 'shield-film');
  expect(tank.shield).toBe(100);
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
});
