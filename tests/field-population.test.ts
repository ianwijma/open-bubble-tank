import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import {
  readFieldPopulation,
  type FieldPopulationNode,
} from '../src/game/simulation/field-population';
import { createTank, deactivateTankData } from '../src/game/simulation/tank';
import { IncompleteFieldGeometryError } from '../src/game/simulation/field-display';
import { spawnPickups } from '../src/game/simulation/pickups';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';

function* walk(node: FieldPopulationNode): Generator<FieldPopulationNode> {
  yield node;
  if (node.kind === 'authored' || node.kind === 'tutorial')
    for (const child of node.children) yield* walk(child);
}
const population = (world: World, field = world.field) => [
  ...walk(readFieldPopulation(world, field)),
];
const physical = (world: World, field = world.field) =>
  population(world, field)
    .filter((node) => 'instance' in node)
    .map((node) => node.instance);

test('population retains every authored slot, invisible helper, mask and selected tutorial at its actual parent', () => {
  const world = new World([], [], 31),
    read = readFieldPopulation(world, world.field);
  expect(read.children.map((node) => 'symbol' in node && node.symbol)).toEqual([
    1537, 1539, 1540, 1542, 1544, 1545, 1547, 1550, 1667,
  ]);
  expect(read.children[1]).toMatchObject({ depth: 4, clipDepth: 8 });
  expect(read.children[3]).toMatchObject({ depth: 10, clipDepth: 14 });
  const all = population(world);
  expect(all.find((node) => 'symbol' in node && node.symbol === 359)).toMatchObject({
    pose: { alpha: 0.078125 },
  });
  expect(all.find((node) => 'symbol' in node && node.symbol === 1546)).toBeDefined();
  expect(all.filter((node) => 'symbol' in node && node.symbol === 1548)).toHaveLength(4);
  expect(read.children.at(-1)).toMatchObject({ kind: 'tutorial', sourceFrame: 3, stopped: true });
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  world.fieldDisplays.selectTutorial(next, 2);
  const nextRead = readFieldPopulation(world, next),
    actors = nextRead.children.find((node) => 'symbol' in node && node.symbol === 1547)!;
  expect(actors.kind).toBe('authored');
  if (actors.kind !== 'authored') throw new Error('Missing authored actor layer');
  expect(actors.children.slice(0, 2).map((node) => 'symbol' in node && node.symbol)).toEqual([
    1546, 1667,
  ]);
  expect(actors.children[1]).toMatchObject({ kind: 'tutorial', sourceFrame: 4 });
  expect(nextRead.children.some((node) => node.kind === 'tutorial')).toBe(false);
});

test('actual actor addChild order survives Run array aliases, queued deaths, alpha zero and empty clips', () => {
  const world = new World([], [], 31),
    field = world.field,
    a = createTank(77, STARTER, 'enemy', 40, 50),
    b = createTank(77, STARTER, 'ally', -30, 20),
    raw = createTank(78, STARTER, 'enemy');
  world.attachActor(a, field);
  world.attachActor(b, field);
  a.dead = true;
  a.alpha = 0;
  deactivateTankData(a);
  field.enemies = [raw, b, a, a];
  world.runtimeFor(field).allies = [];
  world.runtimeFor(field).enemyRemovals.push(a);
  expect(physical(world)).toEqual([a, b]);
  const node = population(world).find((node) => node.kind === 'actor' && node.instance === a);
  expect(node).toMatchObject({ transform: { x: 40, y: 50, alpha: 0 }, children: [] });
  world.actorParents.attach(a, field);
  expect(physical(world)).toEqual([b, a]);
  world.actorParents.detach(a);
  expect(physical(world)).toEqual([b]);
});

test('pickup population uses physical object and retained pose identities rather than values or Run entries', () => {
  const world = new World([], [], 31);
  spawnPickups(world, { x: 200, y: 100 }, 6);
  const [a, b] = world.pickups,
    retained = world.pickupDisplays.read(a)!,
    twin = { ...a };
  world.pickupDisplays.construct(twin, 1);
  world.pickupDisplays.attach(twin, world.field);
  a.value = 50;
  a.dead = true;
  world.pickups = [];
  const nodes = population(world).filter((node) => node.kind === 'pickup');
  expect(nodes.map((node) => node.instance)).toEqual([a, b, twin]);
  expect(nodes[0].symbol).toBe(1817);
  expect(nodes[0].pose).toBe(retained.clip.pose);
  expect(nodes[2].symbol).toBe(1816);
  expect(nodes[2].pose).not.toBe(retained.clip.pose);
  world.pickupDisplays.remove(a, world.field);
  expect(physical(world)).toEqual([b, twin]);
});

test('bottom population follows the concrete layer and queue tail while World siblings remain excluded', () => {
  const world = new World([], [], 31),
    old = world.field;
  world.player.life = 1;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    queued = world.addCombatEffect({ x: 12.049, y: -13.049 }, 'rocketTrail', {}, false, next),
    top = world.addCombatEffect({ x: 10, y: 0 }, 'impact', {}, true),
    screen = world.addCombatEffect({ x: 0, y: 0 }, 'ink', {}, true),
    carrier = world.registerEffectCallback({
      owner: world.player,
      gun: world.player.guns[0],
      frame: 1,
      total: 26,
    });
  expect(physical(world, old)).toEqual([carrier]);
  expect(physical(world, next)).toEqual([]);
  world.step(emptyInput());
  expect(physical(world, old)).toEqual([carrier, queued]);
  expect(physical(world, next)).toEqual([]);
  expect(physical(world, old)).not.toContain(top);
  expect(physical(world, old)).not.toContain(screen);
  expect(physical(world, old)).not.toContain(world.player);
  expect(population(world, old).find((node) => node.kind === 'effect')).toMatchObject({
    transform: { x: 12, y: -13 },
  });
  const nextLayer = world.effectEngine.layer(next, 'bottom')!;
  world.effectEngine.register(nextLayer);
  world.effectEngine.unregister('bottom');
  world.effectEngine.create(queued, 'bottom', old);
  expect(physical(world, old)).toEqual([carrier]);
  expect(physical(world, next)).toEqual([queued]);
});

test('detached wrapper reads retain actors and pickups, but exclude its actually removed lower container', () => {
  const world = new World([], [], 31),
    old = world.field,
    tank = createTank(77, STARTER, 'enemy');
  world.attachActor(tank, old);
  spawnPickups(world, { x: 200, y: 100 }, 1);
  const pickup = world.pickups[0];
  world.addCombatEffect({ x: 0, y: 0 }, 'rocketTrail', {}, true);
  world.fieldDisplays.detach(old);
  const read = readFieldPopulation(world, old);
  expect(read.rooted).toBe(false);
  expect(physical(world, old)).toEqual([pickup, tank]);
  expect(population(world, old).some((node) => 'symbol' in node && node.symbol === 117)).toBe(
    false,
  );
  expect(world.effectEngine.parent(world.effects[0])).toBeDefined();
});

test('population reads neither discover raw children nor advance poses, entropy, IDs or source metadata', () => {
  const world = new World([], [], 31),
    field = world.field,
    raw = createTank(77, STARTER, 'enemy');
  spawnPickups(world, { x: 200, y: 100 }, 1);
  const pickup = world.pickups[0],
    retained = world.pickupDisplays.read(pickup)!,
    age = retained.clip.pose.age,
    rng = world.rng.state,
    id = world.nextId(),
    initial = world.fieldDisplays.read(field);
  field.enemies = [raw];
  world.pickups = [];
  world.rng.next = () => {
    throw new Error('Population read consumed entropy');
  };
  for (let i = 0; i < 3; i++) {
    const read = readFieldPopulation(world, field);
    expect(Object.isFrozen(read)).toBe(true);
    expect(Object.isFrozen(read.children)).toBe(true);
    expect(physical(world)).toEqual([pickup]);
  }
  expect(world.fieldDisplays.read(field)).toEqual(initial);
  expect(retained.clip.pose.age).toBe(age);
  expect(world.rng.state).toBe(rng);
  expect(world.nextId()).toBe(id + 1);
});

test('unresolved under-avatar sizing rejects the population instead of supplying a partial geometry fallback', () => {
  const world = new World([], [], 31, undefined, undefined, undefined, () => undefined);
  expect(() => readFieldPopulation(world, world.field)).toThrow(IncompleteFieldGeometryError);
});
