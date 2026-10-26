import { FieldVisit } from '../src/game/core/field-visit';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { beamWallDistance, tickDamageBeam } from '../src/game/simulation/beams';
import type { TankDesign } from '../src/game/core/types';

const body = { ...STARTER.parts[0], x: 0, y: 0 };
const healerDesign: TankDesign = {
  ...STARTER,
  id: 'healer',
  avatar: false,
  speed: 0,
  life: 20,
  parts: [body, { ...STARTER.parts[1], type: 6002, x: 0, y: 0 }],
};
const patientDesign: TankDesign = {
  ...STARTER,
  id: 'patient',
  avatar: false,
  speed: 0,
  life: 100,
  parts: [body],
};
function frames(world: World, count: number, fire = false) {
  for (let i = 0; i < count; i++) world.step({ ...emptyInput(), fire });
}
function healingWorld() {
  const world = new World([], [], 10);
  const healer = createTank(100, healerDesign, 'enemy', -100, 0);
  const patient = createTank(101, patientDesign, 'enemy', 100, 0, 100, 50);
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.field.enemies = [healer, patient];
  return { world, healer, patient };
}

test('a healer maintains one beam and heals on its eleventh contact frame', () => {
  const { world, healer, patient } = healingWorld();
  frames(world, 12);
  expect(patient.life).toBe(50);
  expect(world.bullets.filter((bullet) => bullet.kind === 'healBeam')).toHaveLength(1);
  const beam = world.bullets[0];
  expect(beam.targetId).toBe(patient.uid);
  expect(beam.beamLength).toBeGreaterThan(100);
  expect(beam.beamLength).toBeLessThan(200);
  frames(world, 1);
  expect(patient.life).toBe(51);
  frames(world, 22);
  expect(patient.life).toBe(53);
  expect(world.bullets.find((bullet) => bullet.kind === 'healBeam')?.uid).toBe(beam.uid);
  healer.x = -210;
  patient.x = 240;
  frames(world, 1);
  expect(world.bullets.some((bullet) => bullet.kind === 'healBeam')).toBe(false);
  frames(world, 30);
  expect(patient.life).toBe(53);
});

test('healing requires pixel contact and keeps partial contact across interruptions', () => {
  const { world, patient } = healingWorld();
  frames(world, 7); // five contact frames after the three-frame weapon startup
  expect(patient.life).toBe(50);
  const realHitTest = world.hitTest;
  world.hitTest = () => false;
  frames(world, 30);
  expect(patient.life).toBe(50);
  world.hitTest = realHitTest;
  frames(world, 5);
  expect(patient.life).toBe(50);
  frames(world, 1);
  expect(patient.life).toBe(51);
});

test('allied healers prioritize the avatar and remove their beam with its owner', () => {
  const world = new World([], [], 10);
  const healer = createTank(100, healerDesign, 'ally', -100, 0);
  const patient = createTank(101, patientDesign, 'ally', 100, 0, 100, 50);
  world.allies = [healer, patient];
  world.player.life = 20;
  frames(world, 13);
  expect(world.player.life).toBe(21);
  expect(patient.life).toBe(50);
  expect(world.bullets[0]?.targetId).toBe(world.player.uid);
  healer.dead = true;
  frames(world, 1);
  expect(world.bullets).toHaveLength(0);
});

test('damage beams count contact frames and stop at the bubble wall', () => {
  const world = new World([], [], 10);
  world.player = createTank(
    100,
    { ...STARTER, parts: [body, { ...STARTER.parts[1], type: 2017 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  const patient = createTank(101, patientDesign, 'enemy', 100, 0);
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.field.enemies = [patient];
  const hitTest = world.hitTest;
  world.hitTest = () => false;
  frames(world, 5, true);
  world.hitTest = hitTest;
  frames(world, 1, true);
  expect(patient.life).toBe(100);
  frames(world, 1, true);
  expect(patient.life).toBe(99);
  expect(world.bullets.filter((bullet) => bullet.kind === 'beam')).toHaveLength(1);
  world.hitTest = () => false;
  frames(world, 1, true);
  const beam = world.bullets[0];
  expect(beam.beamLength! + beam.x).toBeLessThan(425);
  expect(beamWallDistance({ x: 0, y: 0 }, 0, 1, 6)).toBe(426);
});

test('damage beams sample every target on the shared source minimum-distance grid', () => {
  const world = new World([], [], 10);
  world.player = createTank(
    100,
    { ...STARTER, parts: [body, { ...STARTER.parts[1], type: 2017 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  const near = createTank(101, patientDesign, 'enemy', 100, -20);
  const far = createTank(102, patientDesign, 'enemy', 200, -20);
  near.radius = far.radius = 20;
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.field.enemies = [far, near];
  frames(world, 1, true);
  near.x = 100;
  near.y = far.y = -20;
  far.x = 200;
  const beam = world.bullets.find((bullet) => bullet.kind === 'beam')!;
  beam.x = beam.y = beam.angle = 0;
  beam.contactFrames = 0;
  near.life = 100;
  // trunc(hypot(100,20)-20)=81, then 87,93,99,105. A separate projected grid misses 105.
  world.hitTest = (tank, x) => tank === near && x === 105;
  tickDamageBeam(world, beam, [far, near]);
  expect(beam.beamLength).toBe(105);
  expect(near.life).toBe(100);
  tickDamageBeam(world, beam, [far, near]);
  expect(near.life).toBe(99);
  expect(far.life).toBe(100);
});
