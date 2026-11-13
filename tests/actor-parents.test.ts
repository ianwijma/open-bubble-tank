import { setFieldFixtureLayout } from './fixtures/field-layout';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';
import allyData from '../src/game/data/allies.json';
function scenario() {
  const world = new World([], [], 1);
  cacheEmptyField(world);
  world.rng.next = () => 0.5;
  const make = () =>
    createTank(world.nextId(), { ...STARTER, avatar: false, speed: 0, parts: [] }, 'enemy', 10, 20);
  const old = world.field,
    outgoing = make();
  old.enemies = [outgoing];
  world.attachActor(outgoing, old);
  world.player.x = 425;
  setFieldFixtureLayout(world);
  world.jump({ x: 1, y: 0 });
  const incoming = make(),
    next = world.transit!.next;
  next.enemies = [incoming];
  world.attachActor(incoming, next);
  next.scale = 1;
  world.transit!.offset = { x: 800, y: 0 };
  setFieldFixtureLayout(world);
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
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(world.mode).toBe('playing');
  expect(world.field).toBe(next);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.point(outgoing, next)).toEqual({ x: -1065, y: -205 });
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next === old).toBe(false);
  world.transit!.offset = { x: -800, y: 0 };
  setFieldFixtureLayout(world);
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

test('Run-array replacement does not detach display children; only actual removal does', () => {
  const { world, old, next, outgoing } = scenario();
  world.actorParents.sync(world);
  old.enemies = [];
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  next.enemies.push(outgoing);
  world.actorParents.attach(outgoing, next);
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.point(outgoing, old)).toEqual({ x: 810, y: 20 });
  next.enemies = next.enemies.filter((t) => t !== outgoing);
  world.actorParents.sync(world);
  expect(world.actorParents.point(outgoing, old)).toEqual({ x: 810, y: 20 });
  world.actorParents.detach(outgoing);
  expect(world.actorParents.point(outgoing, old)).toBeNull();
});

test('sync only updates ancestry; raw arrays cannot attach or reorder enemyLayer children', () => {
  const { world, old, next, outgoing, incoming } = scenario();
  const ally = createTank(world.nextId(), STARTER, 'ally');
  world.attachActor(ally, old);
  const lateEnemy = createTank(world.nextId(), STARTER, 'enemy');
  world.attachActor(lateEnemy, old);
  old.enemies = [lateEnemy, outgoing];
  world.allies = [ally];
  next.enemies.push(ally);
  world.actorParents.sync(world);
  expect([...world.actorParents.owned(old)]).toEqual([outgoing, ally, lateEnemy]);
  expect([...world.actorParents.owned(next)]).toEqual([incoming]);
  world.actorParents.attach(outgoing, old); // addChild on the same parent raises it.
  expect([...world.actorParents.owned(old)]).toEqual([ally, lateEnemy, outgoing]);
  world.actorParents.attach(ally, next);
  world.actorParents.sync(world);
  expect([...world.actorParents.owned(old)]).toEqual([lateEnemy, outgoing]);
  expect([...world.actorParents.owned(next)]).toEqual([incoming, ally]);
  const rawOnly = createTank(world.nextId(), STARTER, 'enemy');
  old.enemies.push(rawOnly);
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(rawOnly)).toBe(false);
});

test('stage artwork advances an attached display-only actor without running its absent array entry', () => {
  const world = new World([], [], 1),
    actor = createTank(world.nextId(), STARTER, 'enemy');
  world.attachActor(actor, world.field);
  world.pause();
  world.step(emptyInput());
  expect(actor.age).toBe(0);
  expect(actor.artAge).toBe(1);
  expect(world.field.enemies).not.toContain(actor);
  world.actorParents.detach(actor);
  world.step(emptyInput());
  expect(actor.artAge).toBe(1);
});

for (const id of [3007, 3016])
  test(`summon ${id} attaches its child and callback before its first actor Run`, () => {
    const design = {
      ...STARTER,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: id, x: 0, y: 0 }],
    };
    const world = new World([], [design], 1);
    const gun = world.player.guns[0];
    world.fireGun(world.player, gun, emptyInput());
    expect(world.allies).toHaveLength(1);
    const ally = world.allies[0];
    expect(ally.design).toEqual(id === 3007 ? allyData.swarm : allyData.mine);
    expect([ally.life, ally.maxLife, ally.age]).toEqual([15, 15, 0]);
    expect(world.actorParents.inField(ally, world.field)).toBe(true);
    expect([...world.actorParents.owned(world.field)]).toEqual([ally]);
    // Repeating the trigger observes the live wrapper's existing summon.
    world.fireGun(world.player, gun, emptyInput());
    expect(world.allies).toEqual([ally]);
    world.damage(ally, 15);
    expect(ally.dead).toBe(true);
    expect(world.runtimeFor(world.field).allyRemovals).toContain(ally);
    expect(world.actorParents.hasParent(ally)).toBe(true);
    world.player.life = 1;
    world.step(emptyInput());
    expect(world.actorParents.hasParent(ally)).toBe(false);
    expect(world.allies).not.toContain(ally);
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
  world.player = createTank(world.nextId(), STARTER, 'player');
  world.fieldDisplays.updateAvatar(
    world.player,
    world.currentWrapper,
    world.transit?.next,
    world.stats.frames,
  );
  world.actorParents.setAvatar(world.player);
  expect(world.actorParents.localToGlobal(oldAvatar, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  world.player.x = 483;
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(world.actorParents.onStage(outgoing)).toBe(false);
  expect(world.actorParents.hasParent(outgoing)).toBe(true);
  expect(world.actorParents.localToGlobal(outgoing, { x: 0, y: 0 })).toEqual({ x: -473, y: 20 });
  world.actorParents.detach(outgoing);
  expect(world.actorParents.hasParent(outgoing)).toBe(false);
  expect(world.actorParents.localToGlobal(outgoing, { x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
});
