import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
function scenario() {
  const world = new World([], [], 1);
  world.rng.next = () => 0.5;
  const make = () =>
    createTank(world.nextId(), { ...STARTER, avatar: false, speed: 0, parts: [] }, 'enemy', 10, 20);
  const old = world.field,
    outgoing = make();
  old.enemies = [outgoing];
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const incoming = make(),
    next = world.transit!.next;
  next.enemies = [incoming];
  next.scale = 1;
  world.transit!.offset = { x: 800, y: 0 };
  world.transit!.target = { x: 483, y: 0 };
  world.actorParents.sync(world);
  return { world, old, next, outgoing, incoming };
}

test('active field parent conversion covers both populations and source Point twips', () => {
  const { world, old, next, outgoing, incoming } = scenario();
  expect(world.actorParents.point(outgoing, next)).toEqual({ x: -790, y: 20 });
  expect(world.actorParents.point(incoming, old)).toEqual({ x: 810, y: 20 });
  expect(world.actorParents.point(incoming, next)).toEqual({ x: 10, y: 20 });
  incoming.x = 10.08;
  expect(world.actorParents.point(incoming, next)).toEqual({ x: 10.05, y: 20 });
  expect(world.actorParents.point(world.player, next)).toEqual({ x: -375, y: 0 });
});

test('arrival unroots the old wrapper without detaching retained enemy references; revisit reparents them', () => {
  const { world, old, next, outgoing } = scenario();
  world.player.x = 483;
  world.step(emptyInput());
  expect(world.mode).toBe('playing');
  expect(world.field).toBe(next);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.point(outgoing, next)).toEqual({ x: -1065, y: -205 });
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next === old).toBe(false);
  world.transit!.offset = { x: -800, y: 0 };
  world.actorParents.sync(world);
  expect(world.actorParents.point(outgoing, next)).toEqual({ x: -790, y: 20 });
});

test('queued death keeps its parent until removal; a replacement avatar does not alias the old object', () => {
  const { world, old, outgoing } = scenario();
  outgoing.dead = true;
  world.runtimeFor(old).enemyRemovals.push(outgoing);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  world.flushEnemyRemovals();
  expect(world.actorParents.hasParent(outgoing)).toBe(false);
  expect(world.actorParents.point(outgoing, old)).toBeNull();
  const avatar = world.player;
  world.editPlayer(STARTER);
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(avatar)).toBe(false);
  expect(world.actorParents.hasParent(world.player)).toBe(true);
  expect(world.actorParents.point(avatar, old)).toBeNull();
});

test('synchronizing an active layer preserves membership for later removal and reparenting', () => {
  const { world, old, next, outgoing } = scenario();
  world.actorParents.sync(world);
  old.enemies = [];
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(outgoing)).toBe(false);
  next.enemies.push(outgoing);
  world.actorParents.attach(outgoing, next);
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.point(outgoing, old)).toEqual({ x: 810, y: 20 });
  next.enemies = next.enemies.filter((t) => t !== outgoing);
  world.actorParents.sync(world);
  expect(world.actorParents.point(outgoing, old)).toBeNull();
});

test('localToGlobal rounds float32 rotated Point coordinates to nearest even twips', () => {
  const world = new World([], [], 1),
    tank = createTank(world.nextId(), { ...STARTER, parts: [] }, 'enemy');
  tank.rotation = 30;
  expect(world.actorParents.localToGlobal(tank, { x: 10.1, y: 0 })).toEqual({ x: 8.75, y: 5.05 });
  tank.rotation = 60;
  expect(world.actorParents.localToGlobal(tank, { x: 0.15, y: 0 })).toEqual({ x: 0.1, y: 0.15 });
  expect(world.actorParents.localToGlobal(tank, { x: 0.25, y: 0 })).toEqual({ x: 0.1, y: 0.2 });
  expect(world.actorParents.localToGlobal(tank, { x: -0.15, y: 0 })).toEqual({ x: -0.1, y: -0.15 });
  expect(world.actorParents.localToGlobal(tank, { x: -0.25, y: 0 })).toEqual({ x: -0.1, y: -0.2 });
});

test('global conversions retain cached and detached local poses separately from parent membership', () => {
  const { world, next, outgoing } = scenario();
  const point = { x: 10.08, y: -2.08 };
  expect(world.actorParents.fieldLocal(world.actorParents.fieldGlobal(point, next)!, next)).toEqual(
    {
      x: 10.05,
      y: -2.05,
    },
  );
  const oldAvatar = world.player;
  expect(world.actorParents.localToGlobal(oldAvatar, { x: 0, y: 0 })).toEqual({ x: 275, y: 225 });
  world.actorParents.setAvatar(createTank(world.nextId(), STARTER, 'player'));
  expect(world.actorParents.localToGlobal(oldAvatar, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  world.player.x = 483;
  world.step(emptyInput());
  expect(world.actorParents.onStage(outgoing)).toBe(false);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.localToGlobal(outgoing, { x: 0, y: 0 })).toEqual({ x: -473, y: 20 });
  world.actorParents.detach(outgoing);
  expect(world.actorParents.hasParent(outgoing)).toBe(false);
  expect(world.actorParents.localToGlobal(outgoing, { x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
});
