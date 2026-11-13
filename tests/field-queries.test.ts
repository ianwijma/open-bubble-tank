import { expect, test } from 'bun:test';
import authored from '../src/game/data/field-display.json';
import { STARTER } from '../src/game/data/catalog';
import type { DisplayGeometryContent } from '../src/game/core/display-geometry';
import {
  fieldScriptBounds,
  fieldStageShapeHit,
  fieldPlayerRootHitTestPoint,
  type FieldGeometrySource,
} from '../src/game/simulation/field-queries';
import { createTank } from '../src/game/simulation/tank';
import { spawnPickups } from '../src/game/simulation/pickups';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';

/** Synthetic fills qualify traversal/routing, never original field contours. */
const leaf = (
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
  filled = true,
): DisplayGeometryContent => ({
  kind: 'leaf',
  bounds: { xMin, xMax, yMin, yMax },
  hit: ({ x, y }) => filled && x * 20 >= xMin && x * 20 <= xMax && y * 20 >= yMin && y * 20 <= yMax,
});
function source(): FieldGeometrySource {
  const bounds = authored.shapes as Record<
    number,
    { xMin: number; yMin: number; xMax: number; yMax: number }
  >;
  const sprites = authored.sprites as Record<number, unknown[]>;
  return {
    authored(node) {
      const b = bounds[node.symbol];
      if (b) return leaf(b.xMin, b.yMin, b.xMax, b.yMax, false);
      if (sprites[node.symbol]?.length === 0) return { kind: 'empty' };
      throw new Error(`Unsupported fixture symbol ${node.symbol}`);
    },
    tutorial: () => leaf(-2000, -2000, 2000, 2000, false),
    actor: (node) => (node.children.length ? leaf(-200, -200, 200, 200) : { kind: 'empty' }),
    pickup: () => leaf(-20, -20, 20, 20),
    effect: (node) => (node.kind === 'carrier' ? { kind: 'empty' } : leaf(-100, -100, 100, 100)),
  };
}
const width = (world: World, geometry: FieldGeometrySource, field = world.field) => {
  const bounds = fieldScriptBounds(world, field, geometry)!;
  return (bounds.xMax - bounds.xMin) / 20;
};

test('live first/new field Script widths retain original authored and four-child setter controls', () => {
  const world = new World([], [], 31),
    geometry = source();
  expect(width(world, geometry)).toBe(1381.4);
  for (const [scale, expected] of [
    [0.5, 696],
    [1, 1391.9],
    [1.25, 1739.9],
    [2, 2783.8],
  ]) {
    world.fieldDisplays.setupChildren(world.field, scale);
    expect(width(world, geometry)).toBe(expected);
  }
  // Synthetic dynamic geometry stays within the mask extrema in these controls.
  // This is not a measurement of the original tutorial or complete native field.
});

test('field widths reread physical actor geometry after movement, raw-array replacement and explicit detach', () => {
  const world = new World([], [], 31),
    geometry = source(),
    tank = createTank(77, STARTER, 'enemy', 900, 0);
  world.attachActor(tank, world.field);
  const baseline = width(world, geometry);
  expect(baseline).toBe(1600.75);
  tank.dead = true;
  tank.alpha = 0;
  world.field.enemies = [];
  expect(width(world, geometry)).toBe(baseline);
  tank.x = 1200;
  expect(width(world, geometry)).toBe(1900.75);
  tank.displayChildren = [];
  expect(width(world, geometry)).toBe(1381.4);
  world.actorParents.detach(tank);
  expect(width(world, geometry)).toBe(1381.4);
});

test('each dynamic slot must resolve and contribute independently, including currently masked bottom artwork', () => {
  const world = new World([], [], 31),
    geometry = source();
  spawnPickups(world, { x: 1100, y: 0 }, 1);
  const pickup = world.pickups[0];
  pickup.rotation = 0; // Controlled rectangle orientation, independent of birth RNG.
  world.pickups = [];
  expect(width(world, geometry)).toBe(1791.75);
  world.pickupDisplays.remove(pickup, world.field);
  const effect = world.addCombatEffect({ x: 1200, y: 0 }, 'rocketTrail', {}, true);
  expect(width(world, geometry)).toBe(1895.75);
  // A point outside the source under-mask cannot see this synthetic effect fill.
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 1475, y: 225 })).toBe(false);
  world.effectEngine.clear();
  expect(width(world, geometry)).toBe(1381.4);
  geometry.tutorial = (node) => leaf(30000, 0, 30000 + node.sourceFrame * 20, 20);
  expect(width(world, geometry)).toBe(2193.75);
  world.fieldDisplays.selectTutorial(world.field, 4);
  expect(width(world, geometry)).toBe(2196.75);
  expect(world.effectEngine.parent(effect)).toBeUndefined();
});

test('stage-space shape contact follows Main/World/root ancestry and rejects a detached receiver', () => {
  const world = new World([], [], 31),
    geometry = source(),
    tank = createTank(77, STARTER, 'enemy', 900, 0);
  world.attachActor(tank, world.field);
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 1175, y: 225 })).toBe(true);
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 900, y: 0 })).toBe(false);
  world.fieldDisplays.moveCurrent(world.field, { x: 50, y: -20 });
  const stage = world.actorParents.localToGlobal(tank, { x: 0, y: 0 });
  expect(fieldStageShapeHit(world, world.field, geometry, stage)).toBe(true);
  world.fieldDisplays.detach(world.field);
  const detached = world.actorParents.localToGlobal(tank, { x: 0, y: 0 });
  expect(detached).not.toEqual(stage);
  expect(fieldStageShapeHit(world, world.field, geometry, detached)).toBe(false);
  expect(fieldStageShapeHit(world, world.field, geometry, stage)).toBe(false);
});

test('public player-root arguments remain distinct from stage Points under Main translation', () => {
  const world = new World([], [], 31),
    geometry = source(),
    tank = createTank(77, STARTER, 'enemy', 900, 0);
  world.attachActor(tank, world.field);
  world.mainEffects.position = { x: 1000, y: 0 };
  // World's fixed centre puts the actor at root(1175,225), stage(2175,225).
  expect(fieldPlayerRootHitTestPoint(world, world.field, geometry, { x: 1175, y: 225 })).toBe(true);
  expect(fieldPlayerRootHitTestPoint(world, world.field, geometry, { x: 2175, y: 225 })).toBe(
    false,
  );
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 2175, y: 225 })).toBe(true);
  expect(width(world, geometry)).toBe(1600.75);
  world.fieldDisplays.detach(world.field);
  expect(fieldPlayerRootHitTestPoint(world, world.field, geometry, { x: 1175, y: 225 })).toBe(
    false,
  );
});

test('field text receives actual World/Main ancestry beyond the existing authored mask ranges', () => {
  const world = new World([], [], 31),
    geometry = source();
  // Synthetic text isolates owner/range routing, not native tutorial contours.
  geometry.tutorial = () => ({
    kind: 'advanced-static-text',
    bounds: { xMin: 0, xMax: 20, yMin: 0, yMax: 20 },
  });
  world.mainEffects.position = { x: 1000.075, y: -20.075 };
  expect(fieldPlayerRootHitTestPoint(world, world.field, geometry, { x: 275, y: 225 })).toBe(true);
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 1275.05, y: 204.95 })).toBe(true);
  expect(fieldStageShapeHit(world, world.field, geometry, { x: 275, y: 225 })).toBe(false);
  world.fieldDisplays.detach(world.field);
  expect(fieldPlayerRootHitTestPoint(world, world.field, geometry, { x: 275, y: 225 })).toBe(false);
});

test('queue flush and concrete bottom reparenting change the next query immediately without a cached population', () => {
  const world = new World([], [], 31),
    geometry = source(),
    old = world.field;
  world.player.life = 1;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    before = width(world, geometry, old),
    effect = world.addCombatEffect({ x: 1500, y: 0 }, 'rocketTrail', {}, false, next);
  expect(width(world, geometry, old)).toBe(before);
  world.step(emptyInput());
  expect(width(world, geometry, old)).toBeGreaterThan(before);
  const nextWidth = width(world, geometry, next),
    layer = world.effectEngine.layer(next, 'bottom')!;
  world.effectEngine.register(layer);
  world.effectEngine.unregister('bottom');
  world.effectEngine.create(effect, 'bottom', old);
  expect(width(world, geometry, old)).toBe(before);
  expect(width(world, geometry, next)).toBeGreaterThan(nextWidth);
});

test('unsupported geometry fails explicitly instead of substituting the existing circle or declared-box hit', () => {
  const world = new World([], [], 31),
    geometry = source(),
    tank = createTank(77, STARTER, 'enemy', 900, 0);
  world.attachActor(tank, world.field);
  geometry.actor = () => {
    throw new Error('Unqualified actor artwork');
  };
  expect(() => width(world, geometry)).toThrow('Unqualified actor artwork');
  expect(() => fieldStageShapeHit(world, world.field, geometry, { x: 0, y: 0 })).toThrow(
    'Unqualified actor artwork',
  );
});
