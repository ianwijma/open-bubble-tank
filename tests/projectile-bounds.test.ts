import { expect, test } from 'bun:test';
import { SwfClip, type ClipSource } from '../src/game/assets/swf-clip';
import { AssetPack, type Bounds, type DisplayPlacement } from '../src/game/assets/asset-pack';
import {
  projectileScriptBounds,
  scriptBounds,
  type ScriptBoundsSource,
} from '../src/game/assets/projectile-bounds';
import type { Projectile } from '../src/game/core/types';
import { overlaps } from '../src/game/simulation/mines';

const bullet = (changes: Partial<Projectile> = {}): Projectile => ({
  uid: 1,
  owner: 1,
  enemy: true,
  kind: 'seekerMine',
  x: 0,
  y: 0,
  angle: 0,
  heading: 0,
  speed: 4,
  damage: 7,
  radius: 2,
  age: 0,
  life: Infinity,
  explode: 0,
  targetId: null,
  hit: new Set(),
  dead: false,
  symbol: 10,
  orbit: 0,
  ...changes,
});
const placement = (
  charId: number,
  depth: number,
  x = 0,
  y = 0,
  name?: string,
): DisplayPlacement => ({
  charId,
  depth,
  frame: 1,
  bornFrame: 1,
  name,
  matrix: { a: 1, b: 0, c: 0, d: 1, tx: x * 20, ty: y * 20 },
});
const source = (
  leaves: Record<number, Bounds>,
  displayList: ScriptBoundsSource['displayList'],
): ScriptBoundsSource => ({
  leafBounds: (id) => leaves[id],
  displayList,
  childAge: (_id, age) => age,
});

test('an empty native frame retains zero width and cannot intercept even at its registration point', () => {
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    sprites: new Map([[10, { id: 10, frameCount: 16, placements: [] }]]),
  });
  const bounds = pack.projectileBounds(bullet({ x: 30, y: 40, artFrame: 7 }));
  expect(bounds).toEqual({ x: 30, y: 40, width: 0, height: 0, empty: true });
  expect(pack.projectileWidth(bullet())).toBe(0);
  expect(overlaps(bounds, { x: 25, y: 35, width: 10, height: 10 })).toBe(false);
  expect(overlaps(bounds, bounds)).toBe(false);
  expect(
    overlaps({ x: 30, y: 40, width: 0, height: 0 }, { x: 30, y: 40, width: 0, height: 0 }),
  ).toBe(true);
});
function close(actual: Bounds | undefined, expected: Bounds) {
  expect(actual).toBeDefined();
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(actual![key]).toBeCloseTo(expected[key], 8);
}

test('composed transforms reach leaves before union, keeping a rotated sparse clip tight', () => {
  const geometry = source({ 1: { x: -1, y: -1, width: 2, height: 2 } }, (id) =>
    id === 10 ? [placement(1, 1, -10, -10), placement(1, 2, 10, 10)] : [],
  );
  const result = projectileScriptBounds(
    geometry,
    bullet({ x: 100, y: 200, angle: 45, artScale: 2 }),
  );
  close(result, {
    x: 100 - 2 * Math.SQRT2,
    y: 200 - 22 * Math.SQRT2,
    width: 4 * Math.SQRT2,
    height: 44 * Math.SQRT2,
  });
  // Rotating the pre-unioned local rectangle would incorrectly produce this width.
  expect(result!.width).toBeLessThan(44 * Math.SQRT2);
});

test('Script bounds include mask and transparent children without clipping or pixel reads', () => {
  const mask = { ...placement(1, 1), clipDepth: 2 },
    hidden = { ...placement(1, 2, 10), color: { mult: [1, 1, 1, 0], add: [0, 0, 0, 0] } };
  const geometry = source({ 1: { x: 0, y: 0, width: 2, height: 2 } }, (id) =>
    id === 10 ? [mask, hidden] : [],
  );
  close(scriptBounds(geometry, 10, 1), { x: 0, y: 0, width: 12, height: 2 });
});

test('held authored frame and grow root scale/heading determine geometric bounds', () => {
  const geometry = source(
    {
      1: { x: 0, y: 0, width: 1, height: 1 },
      2: { x: 0, y: 0, width: 2, height: 1 },
    },
    (id, age) => (id === 10 ? [placement(age === 2 ? 2 : 1, 1)] : []),
  );
  close(
    projectileScriptBounds(
      geometry,
      bullet({ kind: 'grow', age: 900, artFrame: 2, artScale: 1.5, heading: 90, x: 10, y: 20 }),
    ),
    { x: 8.5, y: 20, width: 1.5, height: 3 },
  );
});

test('beam overrides resize line/mask and relocate the cap while retaining their offsets', () => {
  const cases = [
    {
      name: 'line_mc',
      rect: { x: -3, y: -1, width: 10, height: 2 },
      x: 0,
      expected: { x: -1, y: 6, width: 20, height: 2 },
    },
    {
      name: 'mask_mc',
      rect: { x: 0, y: -2, width: 10, height: 4 },
      x: -4,
      expected: { x: 1, y: 5, width: 24, height: 4 },
    },
    {
      name: 'endCap_mc',
      rect: { x: -1, y: -5, width: 2, height: 10 },
      x: 300,
      expected: { x: 24, y: 2, width: 2, height: 10 },
    },
  ];
  for (const entry of cases) {
    const p = placement(1, 1, entry.x, 0, entry.name),
      geometry = source({ 1: entry.rect }, (id) => (id === 10 ? [p] : []));
    close(
      projectileScriptBounds(geometry, bullet({ kind: 'beam', x: 5, y: 7, beamLength: 20 })),
      entry.expected,
    );
    expect(p.matrix.tx).toBe(entry.x * 20);
    expect(p.matrix.a).toBe(1);
  }
});

test('beam Script bounds retain the entire masked strip, then rotate/scale all leaves', () => {
  const geometry = source(
    {
      1: { x: 0, y: -1, width: 100, height: 2 },
      2: { x: 0, y: -2, width: 10, height: 4 },
    },
    (id) =>
      id === 10 ? [placement(1, 1, 0, 0, 'beam_mc'), placement(2, 2, -4, 0, 'mask_mc')] : [],
  );
  close(
    projectileScriptBounds(
      geometry,
      bullet({ kind: 'healBeam', x: 10, y: 20, angle: 90, artScale: 2, beamLength: 20 }),
    ),
    {
      x: 6,
      y: 12,
      width: 8,
      height: 208,
    },
  );
});

test('turret construction selects inner frame and owner-facing barrel rotation', () => {
  const inner = placement(20, 1, 0, 0, 'inner_mc'),
    barrel = placement(1, 1, 0.15, 0, 'turret_mc');
  const geometry = source(
    {
      1: { x: 1, y: -1, width: 10, height: 2 },
      2: { x: -1, y: -1, width: 2, height: 2 },
    },
    (id, age) => (id === 10 ? [inner] : id === 20 ? [age === 4 ? barrel : placement(2, 1)] : []),
  );
  close(projectileScriptBounds(geometry, bullet({ kind: 'turret', build: 3, artFrame: 1 })), {
    x: -1,
    y: -1,
    width: 2,
    height: 2,
  });
  const turret = bullet({ kind: 'turret', build: 4, artFrame: 1, stopped: true });
  close(projectileScriptBounds(geometry, turret), { x: 1.15, y: -1, width: 10, height: 2 });
  close(projectileScriptBounds(geometry, turret, { x: 0, y: 100 }), {
    x: -0.85,
    y: 1,
    width: 2,
    height: 10,
  });
  expect(barrel.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 3, ty: 0 });
});

test('AssetPack uses morph start bounds and derives width from field bounds without a canvas', () => {
  const pack = new AssetPack('swf');
  // Parsed symbol metadata is the only fixture: no browser, raster, or pixel hit data.
  Object.assign(pack, {
    shapes: new Map([
      [
        10,
        {
          startBounds: { xMin: -60, yMin: 20, xMax: 100, yMax: 60 },
          bounds: { xMin: -1000, yMin: -1000, xMax: 1000, yMax: 1000 },
        },
      ],
    ]),
  });
  const b = bullet({ x: 10, y: 20, angle: 90, artScale: 2 });
  close(pack.projectileBounds(b), { x: 4, y: 14, width: 4, height: 16 });
  expect(pack.projectileWidth(b)).toBeCloseTo(4);
  close(new AssetPack('mock').projectileBounds(bullet({ kind: 'shell', x: 10, y: 20 })), {
    x: 8,
    y: 18,
    width: 4,
    height: 4,
  });
});

test('unknown-symbol fallback bounds cover procedural mine/turret strokes and rotated beam', () => {
  const pack = new AssetPack('mock');
  close(pack.projectileBounds(bullet({ x: 10, y: 20 })), {
    x: 5.75,
    y: 15.75,
    width: 8.5,
    height: 8.5,
  });
  close(pack.projectileBounds(bullet({ kind: 'turret', x: 10, y: 20 })), {
    x: 1.5,
    y: 11.5,
    width: 17,
    height: 17,
  });
  close(pack.projectileBounds(bullet({ kind: 'beam', x: 10, y: 20, angle: 90, beamLength: 40 })), {
    x: 9,
    y: 20,
    width: 2,
    height: 40,
  });
});

test('retained child poses drive the same transformed native pixel contact and Script bounds', () => {
  const clips: ClipSource = {
    spriteInfo: (id) => (id === 10000 || id === 10001 ? { frameCount: 30 } : undefined),
    displayList: (id, frame) =>
      id === 10000 ? [placement(10001, 1)] : id === 10001 ? [placement(1, 1, frame * 10)] : [],
  };
  const pose = new SwfClip(10000, clips);
  pose.advance(1);
  pose.gotoAndPlay(20);
  expect(pose.children.get(1)!.clip.frame).toBe(1);
  const b = bullet({
    symbol: 10000,
    artPose: pose,
    artFrame: 20,
    age: 900,
    x: 5,
    y: 7,
    angle: 90,
    artScale: 2,
  });
  const geometry = source({ 1: { x: 0, y: 0, width: 1, height: 1 } }, clips.displayList);
  close(projectileScriptBounds(geometry, b), { x: 3, y: 27, width: 2, height: 2 });
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    sprites: new Map([[10000, { id: 10000, frameCount: 30, placements: [] }]]),
    leaves: new Map([
      [
        1,
        {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          resolution: 1,
          pixels: new Uint8ClampedArray([255, 255, 255, 255]),
          canvas: { width: 1, height: 1 },
        },
      ],
    ]),
  });
  expect(pack.hitProjectile(b, 4, 28)).toBe(true);
  expect(pack.hitProjectile(b, 4, 408)).toBe(false);
});
