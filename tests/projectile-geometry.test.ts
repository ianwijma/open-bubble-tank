import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { AssetPack, type Bounds, type SpriteInfo } from '../src/game/assets/asset-pack';
import {
  authoredProjectileBounds,
  mockProjectileShapes,
  projectileGeometrySource,
} from '../src/game/assets/projectile-geometry';
import { SwfClip } from '../src/game/assets/swf-clip';
import data from '../src/game/data/projectile-geometry.json';
import type { Projectile } from '../src/game/core/types';
import { createProjectile } from '../src/game/simulation/create-projectile';

function bullet(symbol: number, values: Partial<Projectile> = {}) {
  return createProjectile(1, {
    owner: 1,
    enemy: false,
    kind: 'shell',
    symbol,
    x: 0,
    y: 0,
    angle: 0,
    speed: 10,
    damage: 1,
    ...values,
  });
}
function close(actual: Bounds | undefined, expected: Bounds) {
  expect(actual).toBeDefined();
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(actual![key]).toBeCloseTo(expected[key], 8);
  expect(actual!.empty).toBe(expected.empty);
}
function nativeBoundsPack() {
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    sprites: new Map(Object.values(data.sprites).map((s) => [s.id, s as SpriteInfo])),
    shapes: new Map(Object.entries(data.shapes).map(([id, shape]) => [Number(id), shape])),
  });
  return pack;
}

test('basic and scaled shells retain authored strokes, dimensions, offset and source palette', () => {
  close(authoredProjectileBounds(bullet(1721)), { x: -6, y: -6, width: 12, height: 12 });
  close(authoredProjectileBounds(bullet(1717)), { x: -4.25, y: -4.25, width: 8.5, height: 8.5 });
  close(authoredProjectileBounds(bullet(1721, { x: 10, y: 20, angle: 90, artScale: 2.5 })), {
    x: -5,
    y: 5,
    width: 30,
    height: 30,
  });
  const [basic] = mockProjectileShapes(bullet(1721))!;
  expect([basic.color, basic.lineColor, basic.lineWidth, basic.alpha]).toEqual([
    0xd3477c, 0xffffff, 1, 1,
  ]);
  const [enemy] = mockProjectileShapes(bullet(1717))!;
  expect(enemy.color).toBe(0x89324d);
  // Root scale, translation and rotation belong to the consumer, exactly once.
  expect(mockProjectileShapes(bullet(1721, { x: 100, y: -50, angle: 45, artScale: 2.5 }))).toEqual([
    basic,
  ]);
});

test('seeker and orbital roots retain their distinct bubble clusters and transparent Script helper', () => {
  const enemy = bullet(1809),
    friendly = bullet(1827),
    orbital = bullet(2016);
  const enemyShapes = mockProjectileShapes(enemy)!;
  expect(enemyShapes).toHaveLength(3); // Fourth root child1808 is fully transparent.
  expect(mockProjectileShapes(friendly)).toHaveLength(5);
  expect(mockProjectileShapes(orbital)).toHaveLength(4);
  expect(enemyShapes.map((s) => [s.matrix.tx, s.matrix.ty])).toEqual([
    [-171, -171],
    [-249, -193],
    [-249, 31],
  ]);
  close(authoredProjectileBounds(enemy), {
    x: -17.550072479248048,
    y: -11.450060272216797,
    width: 29.200144958496093,
    height: 23.000120544433596,
  });
  close(authoredProjectileBounds(friendly), {
    x: -10.457659912109374,
    y: -7.957659912109375,
    width: 20.918307495117187,
    height: 15.918307495117187,
  });
  close(authoredProjectileBounds(orbital), {
    x: -6.466667175292969,
    y: -5.116667175292969,
    width: 13.35420913696289,
    height: 10.30001449584961,
  });
});

test('Massive Cannon uses its ninefold child transform and rotates the leaf before union', () => {
  const b = bullet(1794);
  close(authoredProjectileBounds(b), { x: -37.1, y: -37.1, width: 74.25, height: 74.25 });
  const [shape] = mockProjectileShapes(b)!;
  expect(shape.matrix).toEqual({ a: 9, b: 0, c: 0, d: 9, tx: -4, ty: -4 });
  const rotated = authoredProjectileBounds({ ...b, angle: 45 })!;
  expect(rotated.width).toBeCloseTo(74.25 * Math.SQRT2);
  expect(rotated.height).toBeCloseTo(74.25 * Math.SQRT2);
});

test('known empty mine frames differ from unknown geometry and retained poses override active age', () => {
  const b = bullet(2182, { kind: 'mine', x: 50, y: -20, artFrame: 7 });
  expect(mockProjectileShapes(b)).toEqual([]);
  close(authoredProjectileBounds(b), { x: 50, y: -20, width: 0, height: 0, empty: true });
  b.artFrame = 1;
  expect(mockProjectileShapes(b)).toHaveLength(5);
  const pose = new SwfClip(2182, projectileGeometrySource, () => 0.5);
  pose.start(7, false);
  b.artPose = pose;
  expect(mockProjectileShapes(b)).toEqual([]);
  expect(authoredProjectileBounds(b)?.empty).toBe(true);
  expect(mockProjectileShapes(bullet(99999))).toBeUndefined();
  expect(authoredProjectileBounds(bullet(99999))).toBeUndefined();
});

test('Grow held frame uses its authored heading/scale without applying active-age growth again', () => {
  const b = bullet(1943, {
    kind: 'grow',
    x: 10,
    y: 20,
    heading: 90,
    angle: 0,
    artScale: 1.7,
    artFrame: 9,
    age: 999,
  });
  close(authoredProjectileBounds(b), { x: -10.145, y: 2.745, width: 39.525, height: 34.51 });
  const [shape] = mockProjectileShapes(b)!;
  close(shape.bounds, { x: -7.2, y: -11.4, width: 15.8, height: 23.25 });
  expect(shape.fillAlpha).toBeCloseTo(128 / 255);
  const pose = new SwfClip(1943, projectileGeometrySource);
  pose.start(17, false);
  b.artPose = pose;
  close(mockProjectileShapes(b)![0].bounds, { x: -7.25, y: -10.1, width: 16.1, height: 22.45 });
});

test('morph drawing follows the child ratio while Script bounds retain declared start bounds', () => {
  const b = bullet(2004, { artFrame: 20 });
  close(authoredProjectileBounds(b), { x: -7.65, y: -77.65, width: 15.3, height: 15.3 });
  const [shape] = mockProjectileShapes(b)!;
  const t = 62087 / 65535;
  expect(shape.bounds.y).toBeCloseTo(-77.65 + 72.65 * t);
  expect(shape.bounds.width).toBeCloseTo(15.3 - 5.3 * t);
  expect(shape.color).not.toBe(0x66ffff);
});

test('placement color transforms affect the mine palette and dynamic beam masks are not painted', () => {
  const unlit = mockProjectileShapes(bullet(1792, { artFrame: 1 }))!,
    lit = mockProjectileShapes(bullet(1792, { artFrame: 7 }))!;
  expect(unlit[3].color).toBe(0x837569);
  expect(lit[3].color).toBe(0xbbb3ad);
  const shapes = mockProjectileShapes(bullet(1992, { kind: 'beam', beamLength: 80 }))!;
  const masked = shapes.filter((shape) => shape.masks?.length);
  expect(masked).toHaveLength(2);
  const mask = masked[0].masks![0];
  expect(mask.bounds.width * mask.matrix.a).toBeCloseTo(84);
  expect(mask.matrix.tx).toBe(-80);
  expect(shapes).toHaveLength(6); // The dynamic mask itself contributes no paint primitive.
});

test('numeric bounds agree with native Script queries across frame, scale and rotation changes', () => {
  const native = nativeBoundsPack();
  for (const symbol of [1721, 1809, 1827, 2016, 1794, 1792, 2182, 1943, 2178, 2444]) {
    for (const frame of [1, 7, 17]) {
      const b = bullet(symbol, { x: 31, y: -29, angle: 37, artFrame: frame, artScale: 2.5 });
      close(authoredProjectileBounds(b), native.projectileBounds(b));
    }
  }
  // Keep AssetPack's established single-frame child-age behavior and 40-frame phase.
  const placement = {
    depth: 3,
    charId: 34,
    matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
    frame: 2,
    bornFrame: 2,
  };
  expect(projectileGeometrySource.childAge(1721, 50, placement)).toBe(53);
  expect(projectileGeometrySource.childAge(1721, 50, placement)).toBe(
    native.childAge(1721, 50, placement),
  );
});

const originalSwf = '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
test.skipIf(!existsSync(originalSwf))(
  'every imported projectile root/frame matches geometry independently read from the original SWF',
  async () => {
    const { bytes } = await decompressSWF(readFileSync(originalSwf));
    const { symbols } = await extractSymbols(bytes, { svg: false });
    const native = new AssetPack('swf');
    Object.assign(native, {
      sprites: new Map(symbols.sprites.map((sprite: { id: number }) => [sprite.id, sprite])),
      shapes: new Map(
        [...symbols.shapes, ...symbols.morphs].map((shape: { id: number }) => [shape.id, shape]),
      ),
    });
    for (const id of data.roots) {
      const total = projectileGeometrySource.spriteInfo(id)?.frameCount ?? 1;
      for (let frame = 1; frame <= total; frame++) {
        const b = bullet(id, { x: 13, y: -17, artFrame: frame, angle: 37, artScale: 2.5 });
        close(authoredProjectileBounds(b), native.projectileBounds(b));
      }
    }
  },
);
