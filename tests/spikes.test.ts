import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { tickGuns } from '../src/game/simulation/weapons';
import { STARTER } from '../src/game/data/catalog';

function setup() {
  const world = new World([], [], 3),
    owner = createTank(
      world.nextId(),
      {
        ...STARTER,
        id: 'E-spike',
        avatar: false,
        speed: 0,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4026, rotation: 0 }],
      },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    ),
    gun = owner.guns[0];
  world.field.enemies = [owner];
  world.player.life = 40;
  world.player.radius = 0.1;
  Object.assign(world.player, world.muzzle(owner, gun, 13, 6));
  return { world, owner, gun };
}
test('Spike samples all seven authored emitters and records a hit immediately without a weapon timer or target', () => {
  const { world, owner, gun } = setup();
  const points: number[][] = [];
  world.hitTest = (t, x, y) => {
    points.push([x, y]);
    return Math.hypot(x - t.x, y - t.y) < 0.01;
  };
  tickGuns(world, owner, emptyInput());
  expect(points).toHaveLength(7);
  expect(world.player.life).toBe(37);
  expect(world.player.velocity).toEqual({ x: 7, y: 0 });
  expect(gun.targeting!.targetId).toBeNull();
  expect(gun.counter).toBe(0);
  expect(gun.spikeContacts).toEqual([{ uid: world.player.uid, remaining: 15 }]);
});
test('Spike applies its source15-call contact memory and still pushes through protection', () => {
  const { world, owner, gun } = setup();
  world.player.shield = 100;
  world.hitTest = () => true;
  tickGuns(world, owner, emptyInput());
  expect(world.player.life).toBe(40);
  expect(world.player.velocity.x).toBe(7);
  for (let i = 0; i < 14; i++) tickGuns(world, owner, emptyInput());
  expect(world.player.velocity.x).toBe(7);
  tickGuns(world, owner, emptyInput());
  expect(world.player.velocity.x).toBe(14);
  expect(gun.spikeContacts![0].remaining).toBe(15);
});
test('a remembered earlier ally stops the source candidate loop, then a later ally receives replacement force after expiry', () => {
  const { world, owner, gun } = setup();
  const first = createTank(world.nextId(), { ...STARTER, avatar: false, life: 100 }, 'ally', 0, 0),
    second = createTank(
      world.nextId(),
      { ...STARTER, avatar: false, life: 100, classId: 2 },
      'ally',
      0,
      0,
    );
  world.allies = [first, second];
  gun.spikeContacts = [{ uid: first.uid, remaining: 2 }];
  let probes = 0;
  world.hitTest = (t) => {
    probes++;
    return t === second;
  };
  tickGuns(world, owner, emptyInput());
  expect(probes).toBe(0);
  second.velocity = { x: -100, y: 30 };
  tickGuns(world, owner, emptyInput());
  expect(second.life).toBe(second.maxLife - 3);
  expect(second.velocity).toEqual({ x: 12, y: 0 });
  expect(world.player.life).toBe(40);
});
test('the global radial broad-phase gate can reject a contact before pixel testing', () => {
  const { world, owner } = setup();
  world.player.x = world.player.y = 0;
  owner.x = -275;
  owner.y = -225;
  let probes = 0;
  world.hitTest = () => {
    probes++;
    return true;
  };
  tickGuns(world, owner, emptyInput());
  expect(probes).toBe(0);
  expect(world.player.life).toBe(40);
});
test('Spike direct PartCallTrigger is empty; contact belongs to BehaviorRun', () => {
  const { world, owner, gun } = setup();
  world.hitTest = () => true;
  world.fireGun(owner, gun, emptyInput());
  expect(world.player.life).toBe(40);
  expect(world.bullets).toHaveLength(0);
});

test('non-finite global radial coordinates fail the source inclusive comparison before pixel testing', () => {
  const { world, owner } = setup();
  world.player.x = NaN;
  let probes = 0;
  world.hitTest = () => {
    probes++;
    return true;
  };
  tickGuns(world, owner, emptyInput());
  expect(probes).toBe(0);
  expect(world.player.life).toBe(40);
});
