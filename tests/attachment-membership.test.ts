import { expect, test } from 'bun:test';
import { AssetPack, type Raster } from '../src/game/assets/asset-pack';
import { STARTER, partById } from '../src/game/data/catalog';
import { INFECTED_ART, PROTECTION_ART, STATUS_ART } from '../src/game/data/status-art';
import { createTank } from '../src/game/simulation/tank';
import { addTankChild, removeTankChild } from '../src/game/simulation/tank-display';

// Explicit synthetic contact leaves isolate physical membership through the
// existing public provider. These are not original contours or new field geometry.
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
function pack(leaves: [number, Raster][]) {
  const result = new AssetPack('swf');
  Object.assign(result, { leaves: new Map(leaves) });
  return result;
}

test('removed status marks cannot contact through a retained decoration record', () => {
  const assets = pack([[STATUS_ART.jam, raster()]]),
    tank = createTank(1, STARTER, 'enemy');
  tank.statusDecoration = {
    kind: 'jam',
    age: 0,
    artAge: 0,
    duration: 80,
    marks: [{ x: 100, y: 0, angle: 0, frame: 1 }],
  };
  addTankChild(tank, 'status');
  expect(assets.hitTest(tank, 100, 0)).toBe(true);
  removeTankChild(tank, 'status');
  expect(tank.statusDecoration.marks).toHaveLength(1);
  expect(tank.displayChildren.length).toBeGreaterThan(0);
  expect(assets.hitTest(tank, 100, 0)).toBe(false);
  addTankChild(tank, 'status');
  expect(assets.hitTest(tank, 100, 0)).toBe(true);
});

test('removed infection artwork cannot contact through a positive timer', () => {
  const assets = pack([[INFECTED_ART, raster()]]),
    tank = createTank(2, STARTER, 'enemy');
  tank.status.infect = 80;
  addTankChild(tank, 'infection');
  expect(assets.hitTest(tank, 0, 0)).toBe(true);
  removeTankChild(tank, 'infection');
  expect(tank.status.infect).toBe(80);
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
  addTankChild(tank, 'infection');
  expect(assets.hitTest(tank, 0, 0)).toBe(true);
});

test('removed forcefield wrapper cannot contact through stale readiness or a retained clone', () => {
  const design = {
      ...STARTER,
      parts: [
        { ...STARTER.parts[0], x: 40, y: 0 },
        { ...STARTER.parts[1], key: 'field', type: 5005, x: 0, y: 0 },
      ],
    },
    tank = createTank(3, design, 'player'),
    assets = pack([
      [99000, raster()],
      [PROTECTION_ART.forcefield, raster(true, 200)],
    ]);
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
  // The actual live mount is removed; the forcefield's source clone keeps it.
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

test('legacy film and impact require their distinct physical children', () => {
  const assets = pack([
      [PROTECTION_ART.turretShield, raster(false)],
      [PROTECTION_ART.turretShieldHit, raster()],
    ]),
    tank = createTank(4, STARTER, 'enemy');
  tank.shield = 100;
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
  addTankChild(tank, 'shield-film');
  // A transparent film cannot make an absent opaque impact child contact.
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
  addTankChild(tank, 'shield-hit');
  expect(assets.hitTest(tank, 0, 0)).toBe(true);
  removeTankChild(tank, 'shield-film');
  expect(assets.hitTest(tank, 0, 0)).toBe(true);
  removeTankChild(tank, 'shield-hit');
  expect(tank.shield).toBe(100);
  expect(assets.hitTest(tank, 0, 0)).toBe(false);
});
