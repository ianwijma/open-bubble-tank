import { expect, test } from 'bun:test';
import { shapeHitGeometry } from '../src/game/assets/swf-symbols.mjs';
import { AssetPack, type SpriteInfo } from '../src/game/assets/asset-pack';
import { SwfClip } from '../src/game/assets/swf-clip';
import { STARTER, partById } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { protectionScale } from '../src/game/core/protection-size';
import { INFECTED_ART } from '../src/game/data/status-art';

test('shape contact retains transparent fills and strokes with original winding and registration', () => {
  const shape = {
    fills: [{ kind: 'solid', color: [0, 0, 0, 0] }],
    lines: [{ width: 200, color: [0, 0, 0, 0], startCap: 2, join: 2, miterLimit: 4 }],
    usesFillWinding: true,
    runs: [
      {
        start: [400, 400],
        ops: [
          ['L', 1200, 400],
          ['L', 1200, 1200],
          ['L', 400, 1200],
          ['L', 400, 400],
        ],
        f0: 0,
        f1: 1,
        line: 1,
      },
    ],
  };
  const geometry = shapeHitGeometry(shape);
  expect(geometry.fills).toEqual([
    { path: 'M20 20 L60 20 L60 60 L20 60 L20 20 Z', rule: 'nonzero' },
  ]);
  expect(geometry.strokes[0]).toMatchObject({ width: 10, cap: 'square', join: 'miter', miter: 4 });
  expect(JSON.stringify(geometry)).not.toContain('color');
});

test('zero-alpha children still contact through retained transforms, but masks do not hit independently', () => {
  const pack = new AssetPack('mock');
  const matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const sprites: SpriteInfo[] = [
    {
      id: 90000,
      frameCount: 1,
      placements: [
        {
          charId: 23,
          depth: 1,
          frame: 1,
          matrix: { ...matrix, tx: 200, ty: 400 },
          color: { mult: [1, 1, 1, 0], add: [0, 0, 0, 0] },
        },
      ],
    },
    {
      id: 90001,
      frameCount: 1,
      placements: [
        { charId: 23, depth: 1, frame: 1, matrix, clipDepth: 2 },
        { charId: 21, depth: 2, frame: 1, matrix: { ...matrix, tx: -130, ty: -130 } },
      ],
    },
    {
      id: 90002,
      frameCount: 1,
      placements: [{ charId: 23, depth: 1, frame: 1, matrix, clipDepth: 2 }],
    },
  ];
  Object.assign(pack, { sprites: new Map(sprites.map((s) => [s.id, s])) });
  const pose = (id: number) => {
    const clip = new SwfClip(id, pack);
    clip.advance(1);
    return clip;
  };
  expect(pack.hitClip(pose(90000), 10, 20)).toBe(true);
  expect(pack.hitClip(pose(90000), 0, 0)).toBe(false);
  expect(pack.hitClip(pose(90001), 0, 0)).toBe(true);
  expect(pack.hitClip(pose(90001), 5, 5)).toBe(false);
  expect(pack.hitClip(pose(90002), 0, 0)).toBe(false);
});

test('hidden and alpha-zero tank parts retain contact while removed parts do not', () => {
  const pack = new AssetPack('mock'),
    body = { ...STARTER.parts[0], type: 1001, x: 0, y: 0, scale: 1 };
  // Supply opaque paint so the pre-fix provider passes the visible baseline first.
  Object.assign(pack, {
    leaves: new Map([
      [
        679,
        {
          x: 6,
          y: 6,
          width: 1,
          height: 1,
          resolution: 1,
          canvas: { width: 1, height: 1 } as HTMLCanvasElement,
          pixels: new Uint8ClampedArray([7, 129, 180, 255]),
          url: '',
        },
      ],
    ]),
    sprites: new Map([
      [
        partById(1001)!.symbol,
        {
          id: 680,
          frameCount: 1,
          placements: [
            {
              charId: 679,
              depth: 2,
              frame: 1,
              matrix: { a: 1, b: 0, c: 0, d: 1, tx: -130, ty: -130 },
            },
          ],
        },
      ],
    ]),
  });
  const tank = createTank(1, { ...STARTER, parts: [body] }, 'enemy');
  expect(pack.hitTest(tank, 0, 0)).toBe(true);
  tank.hiddenParts.add(body.key);
  tank.alpha = 0;
  expect(pack.hitTest(tank, 0, 0)).toBe(true);
  tank.removedParts.add(body.key);
  expect(pack.hitTest(tank, 0, 0)).toBe(false);
});

test('protection contact uses the same initial size assignment as native painting', () => {
  const bounds = { width: 100, height: 80 };
  expect(protectionScale(bounds, 200)).toEqual({ x: 2, y: 2.5 });
  expect(protectionScale(bounds, 200, true)).toEqual({ x: 2, y: 2 });
  expect(protectionScale(bounds, NaN)).toEqual({ x: 1, y: 1 });
  expect(protectionScale(bounds, -1)).toEqual({ x: 1, y: 1 });
});

test('infection retains independent scripted child phases and shares a stable stage-clock tree', () => {
  const pack = new AssetPack('swf'),
    matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const sprites: SpriteInfo[] = [
    {
      id: INFECTED_ART,
      frameCount: 1,
      placements: Array.from({ length: 9 }, (_, i) => ({
        charId: 1737,
        depth: i * 2 + 1,
        frame: 1,
        matrix,
      })),
    },
    { id: 1737, frameCount: 18, placements: [] },
  ];
  Object.assign(pack, { sprites: new Map(sprites.map((s) => [s.id, s])) });
  const tank = createTank(14, STARTER, 'enemy'),
    clip = pack.infectionClip(tank);
  expect(new Set([...clip.children.values()].map((c) => c.clip.frame)).size).toBeGreaterThan(1);
  tank.artAge = 12;
  expect(pack.infectionClip(tank)).toBe(clip);
  expect(clip.age).toBe(13);
  tank.infectStartedAt = 12;
  expect(pack.infectionClip(tank)).not.toBe(clip);
});
