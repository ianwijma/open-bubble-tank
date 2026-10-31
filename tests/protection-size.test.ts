import { expect, test } from 'bun:test';
import { protectionRadius } from '../src/game/core/protection-size';
import { STARTER, partById } from '../src/game/data/catalog';
import { AssetPack } from '../src/game/assets/asset-pack';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { detachForcefield, refreshForcefield } from '../src/game/simulation/forcefield';

test('protection uses successive axis records and the last record child dimensions, including ties', () => {
  const small = { x: 10, y: 0, width: 20, height: 20 };
  const large = { x: 10, y: 0, width: 100, height: 100 };
  expect(protectionRadius([small, large])).toBeCloseTo(32.627416998);
  expect(protectionRadius([large, small])).toBeCloseTo(123.13708499);
  expect(protectionRadius([{ x: 0, y: 0, width: 999, height: 999 }, small])).toBeCloseTo(
    32.627416998,
  );
  expect(protectionRadius([large, { x: -11, y: -11, width: 2, height: 2 }])).toBeCloseTo(
    11 + Math.hypot(1.6, 1.6),
  );
  expect(protectionRadius([])).toBeNaN();
  expect(protectionRadius([{ x: 0, y: 0, width: 999, height: 999 }])).toBeNaN();
});

function geometry() {
  const pack = new AssetPack('swf'),
    id = partById(2001)!.symbol;
  Object.assign(pack, {
    shapes: new Map([[70001, { id: 70001, bounds: { xMin: 0, yMin: 0, xMax: 400, yMax: 800 } }]]),
    sprites: new Map([
      [
        id,
        {
          id,
          frameCount: 2,
          placements: [
            { depth: 1, charId: 70001, matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, frame: 1 },
            { depth: 1, matrix: { a: 2, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, frame: 2 },
          ],
        },
      ],
    ]),
  });
  const part = { ...STARTER.parts[1], type: 2001, x: 10, y: 0, rotation: 0, scale: 2, radius: 999 };
  const tank = createTank(99, { ...STARTER, parts: [part] }, 'player');
  return { pack, tank, part };
}

test('native live sizing uses current gun angle, scale and retained Script bounds, not stored radius', () => {
  const { pack, tank } = geometry();
  tank.rotation = 85;
  tank.guns[0].angle = 45;
  expect(pack.protectionRadius(tank)).toBeCloseTo(106);
  tank.artAge = 1;
  expect(pack.protectionRadius(tank)).toBeCloseTo(138);
  tank.age = 1000;
  expect(pack.protectionRadius(tank)).toBeCloseTo(138); // active age is not a display clock.
});

test('forcefield uses a fresh full-design clone, cached initial sizing and independent retained part clips', () => {
  const { pack, tank, part } = geometry();
  tank.guns[0].angle = 45;
  const initial = 10 + Math.hypot(40 / 1.25, 80 / 1.25);
  expect(pack.forcefieldRadius(tank)).toBeCloseTo(initial);
  const clone = pack.forcefieldPartClip(tank, part),
    live = pack.partClip(tank, part);
  expect(clone).not.toBe(live);
  expect(clone.frame).toBe(1);
  tank.artAge = 1;
  tank.hiddenParts.add(part.key);
  tank.removedParts.add(part.key);
  expect(pack.forcefieldPartClip(tank, part)).toBe(clone);
  expect(clone.frame).toBe(2);
  expect(pack.forcefieldRadius(tank)).toBeCloseTo(initial);
  expect(pack.protectionRadius(tank)).toBeNaN();
});

test('player shields cache live diameter per mount, including NaN, and preserve the hit clip last created', () => {
  const world = new World([], [], 5);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [
        STARTER.parts[0],
        ...[0, 1].map((i) => ({ ...STARTER.parts[1], key: `shield-${i}`, type: 3010 })),
      ],
    },
    'player',
  );
  const [a, b] = world.player.guns;
  let calls = 0;
  world.protectionRadius = () => (++calls === 1 ? 50 : NaN);
  world.fireGun(world.player, a, emptyInput());
  expect([world.player.shieldDiameter, world.player.shieldHitDiameter]).toEqual([100, 100]);
  world.fireGun(world.player, b, emptyInput());
  expect(world.player.shieldDiameter).toBeNaN();
  expect(world.player.shieldHitDiameter).toBeNaN();
  world.fireGun(world.player, a, emptyInput());
  expect(world.player.shieldDiameter).toBe(100);
  expect(world.player.shieldHitDiameter).toBeNaN();
  world.fireGun(world.player, b, emptyInput());
  expect(world.player.shieldDiameter).toBeNaN();
  expect(calls).toBe(2);
});

test('Setup replaces the clone and restarts its age without rewinding live mounted art', () => {
  const { pack, tank, part } = geometry();
  tank.design.parts.push({ ...part, key: 'forcefield', type: 5005, x: 0, y: 0 });
  const old = pack.forcefieldPartClip(tank, part),
    live = pack.partClip(tank, part);
  tank.artAge = 9;
  expect(pack.forcefieldPartClip(tank, part)).toBe(old);
  expect(old.age).toBe(10);
  detachForcefield(tank);
  refreshForcefield(tank);
  const fresh = pack.forcefieldPartClip(tank, part);
  expect(fresh).not.toBe(old);
  expect(fresh.age).toBe(1);
  expect(fresh.frame).toBe(1);
  expect(pack.partClip(tank, part)).toBe(live);
  expect(live.age).toBe(10);
  tank.artAge++;
  expect(pack.forcefieldPartClip(tank, part)).toBe(fresh);
  expect(fresh.age).toBe(2);
  expect(fresh.frame).toBe(2);
});
