import pointOriginal from './fixtures/actor-point-original.json';
import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { STARTER } from '../src/game/data/catalog';
import { worldOriginalNumber as measured } from './fixtures/world-original-number';

function setup(age: number) {
  const world = new World([], [], 4),
    field = world.currentWrapper;
  world.fieldDisplays.moveCurrent(field, { x: 140, y: -70 });
  world.worldDisplays.follow(field);
  const actor = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, speed: 0, parts: [] },
    'enemy',
    100,
    40,
  );
  world.attachActor(actor, field);
  const bullet = createProjectile(world.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'shell',
    symbol: 1717,
    x: 100,
    y: 40,
    angle: 0,
    speed: 0,
    damage: 0,
  });
  world.addBullet(bullet);
  world.beginCollapse(0);
  for (let i = 0; i < age; i++) world.step(emptyInput());
  // The original synchronous shrink control never ticks Main between calls.
  world.mainEffects.position = { x: 0, y: 0 };
  return { world, field, actor, bullet };
}
for (const age of [0, 1, 2, 51, 119])
  test(`combat ancestry age ${age} agrees with the independently frozen original Points`, () => {
    const { world, field, actor, bullet } = setup(age);
    const samples = [
      ['root', world.actorParents.localToGlobal(actor, { x: 0, y: 0 })],
      ['root', world.actorParents.fieldGlobal({ x: 100, y: 40 }, field)!],
      ['avatar', world.actorParents.localToGlobal(world.player, { x: 100, y: 40 })],
      ['bullet', world.bulletGlobal(bullet)!],
    ] as const;
    for (const [role, point] of samples)
      for (const axis of ['x', 'y'] as const)
        expect(point[axis], `${role}.${axis}`).toBe(
          measured('collapse', age, role, `point100x40.${axis}`),
        );
  });
test('separate fractional Main and actual detach preserve original Point results', () => {
  const { world, field, actor, bullet } = setup(119);
  world.mainEffects.position = { x: 0.07, y: -0.07 };
  for (const [role, point] of [
    ['root', world.actorParents.localToGlobal(actor, { x: 0, y: 0 })],
    ['avatar', world.actorParents.localToGlobal(world.player, { x: 100, y: 40 })],
    ['bullet', world.bulletGlobal(bullet)!],
  ] as const)
    for (const axis of ['x', 'y'] as const)
      expect(point[axis]).toBe(measured('main-fraction', 119, role, `point100x40.${axis}`));
  world.worldDisplays.detachLayers(field);
  world.fieldDisplays.detach(field);
  for (const [role, point] of [
    ['root', world.actorParents.localToGlobal(actor, { x: 0, y: 0 })],
    ['bullet', world.bulletGlobal(bullet)!],
  ] as const)
    for (const axis of ['x', 'y'] as const)
      expect(point[axis]).toBe(measured('detach-glue', 120, role, `point100x40.${axis}`));
  expect(world.actorParents.hasParent(actor)).toBe(true);
  expect(world.actorParents.onStage(actor)).toBe(false);
});
test('scalar map/player edits cannot silently move actual display ancestry', () => {
  const { world, actor, bullet } = setup(0),
    before = world.actorParents.localToGlobal(actor, { x: 0, y: 0 }),
    shot = world.bulletGlobal(bullet);
  world.player.x = 999;
  world.actorParents.sync(world);
  expect(world.actorParents.localToGlobal(actor, { x: 0, y: 0 })).toEqual(before);
  expect(world.bulletGlobal(bullet)).toEqual(shot);
});

// These are actual original globalToLocal outputs, including lossy round trips.
// The intermediate stage Point is retained instead of assuming inverse(forward(p)) equals p.

function pointValues(row: (typeof pointOriginal.samples)[number]) {
  return Object.fromEntries(
    row.words.map(([high, low], i) => {
      const bytes = new DataView(new ArrayBuffer(8));
      bytes.setUint32(0, high);
      bytes.setUint32(4, low);
      return [pointOriginal.fields[i], bytes.getFloat64(0)];
    }),
  );
}
for (const [phase, age] of [
  ['collapse', 0],
  ['collapse', 51],
  ['collapse', 119],
  ['main-fraction', 119],
  ['detach', 119],
] as const)
  test(`field Point inverses preserve original boundary losses: ${phase}/${age}`, () => {
    const { world, field } = setup(age);
    if (phase !== 'collapse') world.mainEffects.position = { x: 0.07, y: -0.07 };
    if (phase === 'detach') world.fieldDisplays.detach(field);
    const rows = pointOriginal.samples.filter(
      (row) =>
        row.phase === phase &&
        row.age === age &&
        (row.role.startsWith('root-') || row.role.startsWith('actorLayer-')),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const v = pointValues(row);
      expect(
        world.actorParents.fieldLocal({ x: v['stage.x'], y: v['stage.y'] }, field),
        row.role,
      ).toEqual({ x: v['local.x'], y: v['local.y'] });
      if (row.kind === 'roundtrip')
        expect(
          world.actorParents.fieldGlobal({ x: v['input.x'], y: v['input.y'] }, field),
          row.role,
        ).toEqual({ x: v['stage.x'], y: v['stage.y'] });
    }
  });
for (const rotation of [30, 60, 90])
  test(`avatar detail and parent Position remain distinct at original rotation${rotation}`, () => {
    const { world } = setup(119);
    world.player.rotation = rotation;
    for (const row of pointOriginal.samples.filter((row) => row.phase === `rotation${rotation}`)) {
      const v = pointValues(row),
        input = row.kind === 'transfer' ? { x: 0, y: 0 } : { x: v['input.x'], y: v['input.y'] };
      expect(world.actorParents.localToGlobal(world.player, input), row.role).toEqual({
        x: v['stage.x'],
        y: v['stage.y'],
      });
    }
  });

test('ordinary movement reads field-local avatar position from compound display writes', () => {
  const world = new World([], [], 4);
  for (let frame = 0; frame < 40; frame++) {
    world.step({ ...emptyInput(), right: frame < 10, down: frame < 10 });
    expect({ x: world.player.x, y: world.player.y }).toEqual(
      world.actorParents.point(world.player, world.currentWrapper)!,
    );
  }
  expect(world.player.x).toBe(170.55);
  expect(world.player.y).toBe(170.55);
});

test('movement callbacks observe source field setters before sibling follow', () => {
  const world = new World([], [], 4),
    field = world.currentWrapper;
  let calls = 0;
  world.onCameraMove = (x, y) => {
    calls++;
    expect({ x, y }).toEqual({ x: 0.6, y: 0 });
    expect(world.fieldDisplays.readPose(field).pose.x).toBe(-0.6);
    expect(world.fieldDisplays.readPose(field, 'avatarUnder').pose.x).toBe(0.6);
    expect(world.worldDisplays.read(field, 'bullet').pose.x).toBe(0);
  };
  world.step({ ...emptyInput(), right: true });
  expect(calls).toBe(1);
  expect(world.worldDisplays.read(field, 'bullet').pose.x).toBe(-0.6);
});

test('crossing movement reads the retained next detail marker, not scalar map targets', () => {
  const world = new World([], [], 4);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit!,
    next = crossing.next;
  world.fieldDisplays.setupChildren(next, 1);
  const root = world.fieldDisplays.readPose(next).pose;
  world.fieldDisplays.moveCurrent(next, { x: root.x - 600, y: root.y });
  // Deliberately stale map metadata cannot replace next.detail.localToGlobal(-317,0).
  crossing.target = { x: -10000, y: 10000 };
  let delta: { x: number; y: number } | undefined;
  world.onCameraMove = (x, y) => {
    delta = { x, y };
  };
  world.step(emptyInput());
  expect(delta).toEqual({ x: (283 / 10) * 0.9, y: 0 });
  expect(world.player.x).toBe(25.45);
  expect(world.player.y).toBe(0);
  expect(world.fieldDisplays.readPose(world.currentWrapper).pose.x).toBe(-25.45);
});
