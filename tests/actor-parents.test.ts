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
  expect(world.transit!.next).toBe(old);
  world.transit!.offset = { x: -800, y: 0 };
  world.actorParents.sync(world);
  expect(world.actorParents.point(outgoing, next)).toEqual({ x: -790, y: 20 });
});

test('queued death keeps its parent until removal; a replacement avatar does not alias the old object', () => {
  const { world, old, outgoing } = scenario();
  outgoing.dead = true;
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
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.point(outgoing, old)).toEqual({ x: 810, y: 20 });
  next.enemies = next.enemies.filter((t) => t !== outgoing);
  world.actorParents.sync(world);
  expect(world.actorParents.point(outgoing, old)).toBeNull();
});
