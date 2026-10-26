import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { STARTER } from '../src/game/data/catalog';
import { WEAPONS } from '../src/game/data/weapons';
import { FIELD_RADIUS } from '../src/game/core/constants';
import { applyProjectileStatus } from '../src/game/simulation/status';

function setup(weapon = 4001, speed = 0) {
  const world = new World([], [], 1);
  world.player.life = 40;
  world.hitTest = () => false;
  world.player.x = -200;
  const design = {
    ...STARTER,
    avatar: false,
    speed,
    life: 100,
    reward: 0,
    parts: [STARTER.parts[0], { ...STARTER.parts[1], type: weapon }],
  };
  const tank = createTank(world.nextId(), design, 'enemy', 100, 0);
  world.field.enemies = [tank];
  return { world, tank };
}

test('an infected enemy moves and fires before its final infection tick', () => {
  const { world, tank } = setup(4001, 1);
  tank.life = 1;
  tank.status.infect = Infinity;
  tank.infectCounter = 11;
  tank.guns[0].counter = WEAPONS[4001].rate - 1;
  world.step(emptyInput());
  expect(tank.x).toBe(101);
  expect(tank.dead).toBe(true);
  const bullet = world.bullets.find((bullet) => bullet.owner === tank.uid)!;
  expect(bullet).toBeDefined();
  expect(bullet.age).toBe(1);
});

test('jam and sticky reset before parts and movement, while weaken still covers infection that frame', () => {
  const { world, tank } = setup(4001, 1);
  tank.status.jam = 1;
  tank.status.sticky = 1;
  tank.status.weaken = 1;
  tank.status.infect = Infinity;
  tank.infectCounter = 11;
  tank.guns[0].counter = WEAPONS[4001].rate - 1;
  world.step(emptyInput());
  expect(tank.x).toBe(101);
  expect(tank.life).toBe(98);
  expect(tank.status.weaken).toBe(0);
  expect(world.bullets.some((bullet) => bullet.owner === tank.uid)).toBe(true);
});

test('stun recovery skips boundary checks for the entire reset frame and keeps protection maintenance active', () => {
  const { world, tank } = setup();
  tank.x = FIELD_RADIUS + 10;
  tank.status.stun = 1;
  tank.shield = 2;
  world.step(emptyInput());
  expect(tank.dead).toBe(false);
  expect(tank.status.stun).toBe(0);
  expect(tank.shield).toBe(1);
  expect(world.stats.sumo).toBe(0);
  world.step(emptyInput());
  expect(world.stats.sumo).toBe(1);
  expect(tank.dead).toBe(true);
});

test('ally escape bypasses shields and forcefields and drops its reward without enemy kill credit', () => {
  const { world } = setup();
  const ally = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      reward: 5,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5005 }],
    },
    'ally',
    FIELD_RADIUS + 10,
    0,
  );
  ally.shield = 100;
  const rewards: number[] = [];
  const drop = world.dropBubbles.bind(world);
  world.dropBubbles = (pos, amount) => {
    rewards.push(amount);
    drop(pos, amount);
  };
  world.allies.push(ally);
  world.step(emptyInput());
  expect(ally.dead).toBe(true);
  expect(ally.life).toBe(0);
  expect(world.allies).toEqual([]);
  expect(rewards).toEqual([5]);
  expect(world.stats.kills).toBe(0);
});

test('a spawner appends enemies to the live actor loop, so their first Run is immediate', () => {
  const { world, tank } = setup(4003);
  tank.guns[0].counter = WEAPONS[4003].rate - 1;
  world.step(emptyInput());
  expect(world.field.enemies.length).toBe(2);
  expect(world.field.enemies[1].age).toBe(1);
});

test('rotating weapon phases use active part calls and retain mounted rotation through jam and stun', () => {
  const { world, tank } = setup(4015);
  tank.age = 1234;
  tank.guns[0].angle = 30;
  for (let i = 0; i < 100; i++) world.step(emptyInput());
  expect(tank.guns[0].angle).toBe(30);
  expect(world.bullets).toEqual([]);
  world.step(emptyInput());
  expect(tank.guns[0].angle).toBe(35);
  const cycle = { ...tank.guns[0].rotatingCycle! };
  applyProjectileStatus(world, tank, 'jam', 3);
  for (let i = 0; i < 3; i++) world.step(emptyInput());
  expect(tank.guns[0].rotatingCycle).toEqual(cycle);
  applyProjectileStatus(world, tank, 'stun', 2);
  for (let i = 0; i < 3; i++) world.step(emptyInput());
  expect(tank.guns[0].rotatingCycle).toEqual(cycle);
  world.step(emptyInput());
  expect(tank.guns[0].angle).toBe(40);
});

test('suppression volleys retain the separate 120-call delay and five-call spacing', () => {
  const { world, tank } = setup(4017);
  const shots: number[] = [];
  const insert = world.addBullet.bind(world);
  let frame = 0;
  world.addBullet = (bullet) => {
    shots.push(frame);
    return insert(bullet);
  };
  for (frame = 1; frame <= 310; frame++) world.step(emptyInput());
  expect(shots).toEqual([124, 129, 134, 139, 144, 149, 154, 159, 164, 169, 174, 298, 303, 308]);
  expect(tank.guns[0].suppressionCycle?.delay).toBe(-16);
});

test('destination enemy boundaries and death drops retain the source outgoing-wrapper quirk', () => {
  const { world, tank } = setup();
  world.field.scale = 0.5;
  world.field.enemies = [];
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  next.scale = 2;
  tank.x = 250;
  tank.design = { ...tank.design, reward: 5 };
  next.enemies = [tank];
  world.step(emptyInput());
  expect(tank.dead).toBe(true);
  expect(world.stats.sumo).toBe(1);
  expect(world.runtimeFor(next).pickups).toEqual([]);
  expect(world.pickups.map((pickup) => pickup.value)).toEqual([5]);
  expect(world.pickups[0].x).toBe(250);
  world.step(emptyInput());
  expect(world.pickups).toEqual([]);
});
