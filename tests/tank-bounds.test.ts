import { expect, test } from 'bun:test';
import type { Bounds, SpriteInfo } from '../src/game/assets/asset-pack';
import { StatusPlayback } from '../src/game/assets/status-playback';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { ScriptBoundsSource } from '../src/game/assets/projectile-bounds';
import { SwfClip } from '../src/game/assets/swf-clip';
import { tankScriptBounds, type TankBoundsClips } from '../src/game/assets/tank-bounds';
import { STARTER, partById } from '../src/game/data/catalog';
import attachmentGeometry from '../src/game/data/attachment-geometry.json';
import { PROTECTION_ART, STATUS_ART } from '../src/game/data/status-art';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { tickGuns } from '../src/game/simulation/weapons';
import { WEAPONS } from '../src/game/data/weapons';

function setup() {
  const tank = createTank(
    100,
    {
      ...STARTER,
      avatar: false,
      parts: [
        { ...STARTER.parts[0], type: 1003, key: 'body', x: 40, y: 0, scale: 1 },
        { ...STARTER.parts[1], type: 4010, key: 'gun', x: 0, y: 0, scale: 1 },
      ],
    },
    'enemy',
  );
  const leaves = new Map<number, Bounds>([
    [partById(1003)!.symbol, { x: -10, y: -5, width: 20, height: 10 }],
    [partById(4010)!.symbol, { x: -2, y: -1, width: 4, height: 2 }],
    [STATUS_ART.jam, { x: -5, y: -5, width: 10, height: 10 }],
    [PROTECTION_ART.turretShield, { x: -65, y: -65, width: 130, height: 130 }],
    [PROTECTION_ART.forcefield, { x: -100, y: -100, width: 200, height: 200 }],
  ]);
  const source: ScriptBoundsSource = {
    leafBounds: (id) => leaves.get(id),
    displayList: () => [],
    childAge: () => 1,
  };
  const pose = (id: number) =>
    new SwfClip(id, { spriteInfo: () => undefined, displayList: () => [] });
  const clips: TankBoundsClips = {
    part: () => undefined,
    status: () => pose(STATUS_ART.jam),
    infection: () => pose(STATUS_ART.jam),
    forcefieldPart: () => undefined,
    forcefieldRadius: () => 40,
    protectionRadius: () => 50,
  };
  return { tank, source, clips };
}

test('Script tank width follows hull and live gun rotations, not the gameplay circle', () => {
  const { tank, source, clips } = setup();
  expect(tankScriptBounds(tank, source, clips)).toEqual({ x: -2, y: -5, width: 52, height: 10 });
  tank.rotation = 90;
  const rotated = tankScriptBounds(tank, source, clips)!;
  expect(rotated.width).toBeCloseTo(10);
  expect(rotated.height).toBeCloseTo(52);
  tank.rotation = 0;
  tank.removedParts.add('body');
  tank.guns[0].angle = 90;
  expect(tankScriptBounds(tank, source, clips)!.width).toBeCloseTo(2);
});

test('hidden and transparent parts still measure, while detached and removed parts do not', () => {
  const { tank, source, clips } = setup();
  tank.hiddenParts.add('body');
  tank.alpha = 0;
  expect(tankScriptBounds(tank, source, clips)!.width).toBe(52);
  tank.displayChildren = ['part:gun'];
  expect(tankScriptBounds(tank, source, clips)!.width).toBe(4);
  tank.removedParts.add('gun');
  expect(tankScriptBounds(tank, source, clips)).toBeUndefined();
});

test('attached status and shield geometry expands width without changing gameplay radius', () => {
  const { tank, source, clips } = setup(),
    radius = tank.radius;
  tank.statusDecoration = {
    kind: 'jam',
    age: 0,
    artAge: 0,
    duration: 80,
    marks: [{ x: -100, y: 0, angle: 0, frame: 1 }],
  };
  tank.displayChildren.push('status');
  expect(tankScriptBounds(tank, source, clips)!.width).toBe(155);
  tank.statusDecoration = undefined;
  tank.shield = 100;
  tank.radius = 50;
  expect(tankScriptBounds(tank, source, clips)!.width).toBeCloseTo(100);
  tank.shield = 0;
  tank.radius = radius;
  expect(tankScriptBounds(tank, source, clips)!.width).toBe(52);
});

test('forcefield measurement includes both its uncut clip and retained original mask', () => {
  const { tank, source, clips } = setup();
  tank.forcefieldAttached = true;
  tank.displayChildren.push('forcefield');
  tank.removedParts.add('body');
  // Field is84px across, but the original unremoved mask body still extends to x50.
  expect(tankScriptBounds(tank, source, clips)!.width).toBeCloseTo(92);
});

test('status pose holds the selected root while its descendants keep playing', () => {
  const sprites = new Map<number, SpriteInfo>(
    attachmentGeometry.sprites.map((s) => [s.id, s as SpriteInfo]),
  );
  const pack = new StatusPlayback({
    spriteInfo: (id) => sprites.get(id),
    displayList: (id, age) => (sprites.has(id) ? buildDisplayList(sprites.get(id)!, age) : []),
  });
  const { tank } = setup();
  tank.statusDecoration = {
    kind: 'sticky',
    age: 0,
    artAge: 0,
    duration: 80,
    marks: [{ x: 0, y: 0, angle: 0, frame: 3 }],
  };
  const pose = pack.clip(tank, 0),
    child = [...pose.children.values()][0].clip;
  expect(pose.frame).toBe(3);
  const firstFrame = child.frame;
  tank.statusDecoration.artAge = 10;
  expect(pack.clip(tank, 0)).toBe(pose);
  expect(pose.frame).toBe(3);
  expect(child.age).toBe(11);
  expect(child.frame).not.toBe(firstFrame);
  tank.statusDecoration = { ...tank.statusDecoration, kind: 'stun', artAge: 0 };
  const stun = pack.clip(tank, 0);
  expect(stun.frame).toBe(3);
  tank.statusDecoration.artAge = 10;
  pack.clip(tank, 0);
  expect(stun.frame).toBe(13);
});

test('enemy orbital launch uses live display width; friendly orbitals keep numRadius', () => {
  const world = new World([], [], 31);
  let measurements = 0;
  world.displayWidth = () => {
    measurements++;
    return 180;
  };
  for (const [side, type, expected] of [
    ['enemy', 4010, 100],
    ['player', 5006, 32.5],
  ] as const) {
    const tank = createTank(
      world.nextId(),
      { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type }] },
      side,
      30,
      -40,
    );
    world.spawnVolley(tank, tank.guns[0], WEAPONS[type]);
    const b = world.bullets.at(-1)!;
    expect(Math.hypot(b.x - tank.x, b.y - tank.y)).toBeCloseTo(expected);
  }
  expect(measurements).toBe(1);
});

test('enemy orbital Run fires its timer with no target, preserves angle and resets after the callback', () => {
  const world = new World([], [], 31),
    tank = createTank(
      world.nextId(),
      { ...STARTER, avatar: false, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4010 }] },
      'enemy',
    );
  world.field.enemies = [tank];
  const gun = tank.guns[0];
  gun.targeting!.targetId = null;
  gun.angle = 32;
  gun.counter = WEAPONS[4010].rate - 1;
  const fire = world.fireGun.bind(world),
    observed: number[] = [];
  world.fireGun = (tank, gun, input) => {
    observed.push(gun.counter);
    fire(tank, gun, input);
  };
  tickGuns(world, tank, emptyInput());
  expect(observed).toEqual([20]);
  expect(gun.targeting!.targetId).toBeNull();
  expect(gun.angle).toBe(32);
  expect(gun.counter).toBe(0);
  expect(world.bullets).toHaveLength(1);
});
