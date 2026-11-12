import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { FieldVisit } from '../src/game/core/field-visit';

test('the selected crossing frame still moves after its interface opens an upgrade', () => {
  const world = new World([], [], 1);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit!;
  world.player.life = world.player.maxLife;
  const before = world.player.x;
  world.step(emptyInput());
  expect(world.mode).toBe('upgrade');
  expect(crossing.age).toBe(1);
  expect(world.player.x).toBeCloseTo(before + (crossing.target.x - before) * 0.09);
  const position = world.player.x;
  world.step(emptyInput());
  expect(world.player.x).toBe(position);
  expect(crossing.age).toBe(1);
});

test('arrival in the upgrade-opening frame retains the menu and shared crossing return state', () => {
  const world = new World([], [], 1);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit!;
  world.player.x = crossing.target.x;
  world.player.y = crossing.target.y;
  world.player.life = world.player.maxLife;
  world.step(emptyInput());
  expect(world.transit === null).toBe(true);
  expect(world.currentWrapper).toBe(crossing.next);
  expect(world.mode).toBe('upgrade');
  expect(world.offers.length).toBeGreaterThan(0);
  world.selectUpgrade(STARTER);
  expect(world.mode).toBe('transit');
  // Source mode2 still runs its interface/fields before the missing destination
  // ends Main.Run. That error skips the hit-timer tail, rather than the whole stage.
  world.hitSoundTimer = 4;
  const artwork = world.player.artAge;
  expect(() => world.step(emptyInput())).not.toThrow();
  expect(world.hitSoundTimer).toBe(4);
  expect(world.player.artAge).toBeGreaterThan(artwork);
});

test('secondary help closes to ordinary mode without completing its retained crossing', () => {
  const shieldTank = {
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'shield', type: 3010 }],
  };
  const world = new World([], [shieldTank, STARTER], 1);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit!;
  world.player.life = 0;
  world.step(emptyInput());
  expect(world.mode).toBe('secondary-help');
  expect(crossing.age).toBe(1);
  world.closeSecondaryHelp();
  expect(world.mode).toBe('playing');
  expect(world.transit).toBe(crossing);
  const avatarAge = world.player.age;
  world.step(emptyInput());
  expect(crossing.age).toBe(1);
  expect(world.player.age).toBe(avatarAge + 1);
});

test('a repeated escape replaces the next wrapper from logical destination coordinates', () => {
  const world = new World([], [], 1);
  world.player.x = 10;
  world.jump({ x: 1, y: 0 });
  const abandoned = world.transit!.next;
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      speed: 0,
      parts: [STARTER.parts[0]],
    },
    'enemy',
    100,
    0,
  );
  abandoned.enemies = [actor];
  const frozen = { x: world.transit!.offset.x - world.player.x, y: 0 };
  world.damage(world.player, 2);
  expect(world.transit!.next !== abandoned).toBe(true);
  expect([world.transit!.next.col, world.transit!.next.row]).toEqual([2, 0]);
  world.player.x += 25;
  const retained = world.attachedFields().find(({ field }) => field === abandoned)!;
  expect(retained.offset.x - world.player.x).toBe(frozen.x);
  const age = actor.age,
    art = actor.artAge;
  world.step(emptyInput());
  expect(actor.age).toBe(age);
  expect(actor.artAge).toBe(art + 1);
  expect(world.actorParents.onStage(actor)).toBe(true);
});

test('a cached attachment restores actor references and frozen poses into a fresh wrapper', () => {
  const world = new World([], [], 1);
  const home = world.currentWrapper;
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      speed: 0,
      parts: [STARTER.parts[0]],
    },
    'enemy',
    100,
    20,
  );
  actor.rotation = 37;
  home.enemies = [actor];
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.step(emptyInput());
  const saved = { x: actor.x, y: actor.y, rotation: actor.rotation };
  actor.x = 900;
  actor.y = 800;
  actor.rotation = 700;
  world.jump({ x: -1, y: 0 });
  const restored = world.transit!.next;
  expect(restored !== home).toBe(true);
  expect(restored.enemies[0] === actor).toBe(true);
  expect({ x: actor.x, y: actor.y, rotation: actor.rotation }).toEqual(saved);
  expect(world.runtimeFor(restored) !== world.runtimeFor(home)).toBe(true);
});

test('next-field damage uses current-wrapper marker geometry and its old invocation finishes', () => {
  const world = new World([], [], 1);
  world.player.x = 400;
  world.jump({ x: 1, y: 0 });
  const oldNext = world.transit!;
  world.player.x = oldNext.offset.x - 350 * oldNext.next.scale;
  const before = world.player.x;
  oldNext.next.enemies = [
    createTank(
      world.nextId(),
      {
        ...STARTER,
        avatar: false,
        speed: 0,
        parts: [STARTER.parts[0]],
      },
      'enemy',
      0,
      200,
      100,
      100,
    ),
  ];
  const runtime = world.runtimeFor(oldNext.next);
  const killer = createProjectile(world.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'shell',
    symbol: 1717,
    x: world.player.x - oldNext.offset.x,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 2,
  });
  runtime.bullets.push(killer);
  world.hitTest = (tank) => tank === world.player;
  world.step(emptyInput());
  expect([world.transit!.next.col, world.transit!.next.row]).toEqual([2, 0]);
  expect(world.transit!.direction).toEqual({ x: 1, y: 0 });
  expect(world.player.x).toBeGreaterThan(before);
  expect(killer.dead).toBe(true);
  expect(runtime.bullets).not.toContain(killer);
  expect(world.transit!.next.enemies.every((tank) => tank.age === 0)).toBe(true);
});

test('arrival caches raw final-frame removals; an empty reattached actor can interrupt a later Run', () => {
  const world = new World([], [], 1);
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      speed: 0,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4001 }],
    },
    'enemy',
    100,
    0,
    50,
    1,
    world,
  );
  world.currentWrapper.enemies = [actor];
  world.bullets.push(
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1717,
      x: 100,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 2,
    }),
  );
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.hitTest = (tank) => tank === actor;
  world.step(emptyInput());
  expect(actor.dead).toBe(true);
  expect(actor.displayChildren).toEqual([]);
  expect(world.cache.get(0, 0)!.enemies[0].tank).toBe(actor);
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next.enemies[0]).toBe(actor);
  expect(actor.guns[0].targeting!.target).toBeNull();
  actor.status.stun = 1;
  world.hitSoundTimer = 4;
  world.step(emptyInput());
  expect(actor.status.stun).toBe(0);
  expect(world.hitSoundTimer).toBe(3);
  const age = world.transit!.age;
  actor.hurtCounter = 3;
  world.step(emptyInput());
  expect(actor.hurtCounter).toBe(2);
  expect(world.hitSoundTimer).toBe(3);
  expect(world.transit!.age).toBe(age);
  expect(world.actorParents.onStage(actor)).toBe(true);
});

test('a cache alias reparents the actor without erasing older array references or its new callback', () => {
  const world = new World([], [], 1);
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [STARTER.parts[0]],
    },
    'enemy',
    100,
    0,
    100,
    100,
  );
  world.currentWrapper.enemies = [actor];
  world.hitTest = () => false;
  for (const direction of [1, -1]) {
    world.jump({ x: direction, y: 0 });
    world.player.x = world.transit!.target.x;
    world.player.y = world.transit!.target.y;
    world.step(emptyInput());
  }
  const current = world.currentWrapper;
  expect(current.enemies).toContain(actor);
  world.player.x = -10;
  world.jump({ x: 1, y: 0 });
  world.damage(world.player, 2);
  const next = world.transit!.next;
  expect([next.col, next.row]).toEqual([0, 0]);
  expect(next !== current).toBe(true);
  expect(next.enemies).toContain(actor);
  world.actorParents.sync(world);
  expect(world.actorParents.inField(actor, next)).toBe(true);
  expect(world.actorParents.inField(actor, current)).toBe(false);
  expect(current.enemies).toContain(actor);
  world.damage(actor, 1000);
  expect(world.runtimeFor(next).enemyRemovals).toContain(actor);
  expect(world.runtimeFor(current).enemyRemovals).not.toContain(actor);
  world.actorParents.detach(actor);
  next.enemies = [];
  world.actorParents.sync(world);
  expect(world.actorParents.hasParent(actor)).toBe(false);
  expect(current.enemies).toContain(actor);
});

test('an older removal queue cannot detach a cached actor from its new layer', () => {
  const world = new World([], [], 1);
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [STARTER.parts[0]],
    },
    'enemy',
    100,
    0,
    100,
    100,
  );
  world.currentWrapper.enemies = [actor];
  world.hitTest = () => false;
  for (const direction of [1, -1]) {
    world.jump({ x: direction, y: 0 });
    world.player.x = world.transit!.target.x;
    world.player.y = world.transit!.target.y;
    world.step(emptyInput());
  }
  const current = world.currentWrapper;
  world.player.x = -10;
  world.jump({ x: 1, y: 0 });
  world.damage(actor, 1000);
  world.damage(world.player, 2);
  const next = world.transit!.next;
  world.hitSoundTimer = 4;
  world.step(emptyInput());
  expect(current.enemies).toContain(actor);
  expect(world.runtimeFor(current).enemyRemovals).toContain(actor);
  expect(next.enemies).toContain(actor);
  expect(world.actorParents.inField(actor, next)).toBe(true);
  expect(world.hitSoundTimer).toBe(4);
});

test('completed-wrapper deactivation clears its shots and pickups before detachment', () => {
  const world = new World([], [], 1);
  world.fieldVisit = new FieldVisit();
  world.step(emptyInput());
  const old = world.currentWrapper,
    runtime = world.runtimeFor(old);
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1717,
    x: 0,
    y: 100,
    angle: 0,
    speed: 0,
    damage: 0,
  });
  runtime.bullets.push(bullet);
  runtime.pickups.push({
    uid: world.nextId(),
    x: 0,
    y: -150,
    vx: 0,
    vy: 0,
    value: 1,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  });
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.step(emptyInput());
  expect(runtime.bullets).toEqual([]);
  expect(runtime.pickups).toEqual([]);
  expect(bullet.dead).toBe(true);
  expect(world.attachedFields().some(({ field }) => field === old)).toBe(false);
});

test('direct escape/Destroy attachments retain the caller shooting gate', () => {
  const world = new World([], [], 1);
  world.damage(world.player, 2);
  expect(world.transit!.stopShoot).toBe(false);
  world.damage(world.player, 2);
  expect(world.transit!.stopShoot).toBe(false);
  const ordinary = new World([], [], 1);
  ordinary.jump({ x: 1, y: 0 });
  expect(ordinary.transit!.stopShoot).toBe(true);
  ordinary.damage(ordinary.player, 2);
  expect(ordinary.transit!.stopShoot).toBe(true);
  const direct = new World([], [], 1);
  direct.jump({ x: 1, y: 0 }, false, { finalizeParts: false });
  expect(direct.transit!.stopShoot).toBe(false);
});
