import { expect, test } from 'bun:test';
import { allyHealthFrame, enemyHealthWidth, TacticalHudState } from '../src/game/core/tactical-hud';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

const design = {
  ...STARTER,
  parts: [
    ...STARTER.parts,
    ...[5002, 5001, 5002, 5001].map((type, i) => ({
      ...STARTER.parts[1],
      key: `interface${i}`,
      type,
    })),
  ],
};
function scene() {
  const player = createTank(1, design, 'player', 100, 80);
  const enemy = createTank(2, { ...STARTER, classId: 6 }, 'enemy', 180, 100, 100, 50);
  const far = createTank(3, STARTER, 'enemy', 400, 80);
  return { player, enemy, far };
}
test('health readouts use class widths and ally rings use truncated percentages with the last-frame clamp', () => {
  expect([1, 3, 6, 7].map(enemyHealthWidth)).toEqual([20, 60, 120, 100]);
  expect([100, 99.1, 50, 1, 0].map((life) => allyHealthFrame(life, 100))).toEqual([
    1, 2, 51, 100, 100,
  ]);
});
test('interface parts deduplicate in mounted order; bars keep stage height/offset while zoom changes projection', () => {
  const { player, enemy, far } = scene(),
    hud = new TacticalHudState();
  hud.updatePassives(player, [enemy, far]);
  expect(hud.passives.map((p) => `${p.kind}:${p.uid}`)).toEqual([
    'health:2',
    'health:3',
    'radar:3',
  ]);
  expect(hud.passives[0]).toMatchObject({
    x: 355,
    y: 245 - 10 - enemy.radius,
    width: 120,
    fill: 0.5,
  });
  hud.updatePassives(player, [enemy, far], 0.5);
  expect(hud.passives.map((p) => p.kind)).toEqual(['health', 'health']);
  expect(hud.passives[0]).toMatchObject({ x: 315, y: 235 - 10 - enemy.radius, width: 120 });
});
test('radar uses strict center boundaries and the source angle, independent of target radius', () => {
  const { player, far } = scene(),
    hud = new TacticalHudState();
  player.design = { ...STARTER, parts: [design.parts[3]] };
  far.x = player.x + 275;
  far.radius = 100;
  hud.updatePassives(player, [far]);
  expect(hud.passives).toEqual([]);
  far.x += 0.1;
  hud.updatePassives(player, [far]);
  expect(hud.passives[0]).toEqual({ kind: 'radar', uid: far.uid, angle: 0 });
  far.x = player.x;
  far.y = player.y - 226;
  hud.updatePassives(player, [far]);
  expect(hud.passives[0]).toMatchObject({ angle: -90 });
});
test('stun retains passive artwork, jam clears it, and dying enemies drop their readout', () => {
  const { player, enemy, far } = scene(),
    hud = new TacticalHudState();
  hud.updatePassives(player, [enemy, far]);
  const previous = hud.passives;
  player.stunned = true;
  player.status.jam = 10;
  hud.updatePassives(player, []);
  expect(hud.passives).toBe(previous);
  player.stunned = false;
  hud.updatePassives(player, [enemy, far]);
  expect(hud.passives).toEqual([]);
  player.status.jam = 0;
  far.dead = true;
  hud.updatePassives(player, [enemy, far]);
  expect(hud.passives).toHaveLength(1);
});
test('ally snapshots retain fixed HUD size and include newly summoned units without moving older rings twice', () => {
  const { player, enemy: ally } = scene(),
    hud = new TacticalHudState();
  hud.updateAllies([ally], player, 0.5);
  expect(hud.allies[0]).toMatchObject({ x: 315, y: 235, width: ally.radius * 2.1, frame: 51 });
  ally.x += 100;
  const added = createTank(4, STARTER, 'ally', 100, 80);
  hud.includeNewAllies([ally, added], player, 0.5);
  expect(hud.allies.map((a) => a.x)).toEqual([315, 275]);
  expect(hud.allies[1].frame).toBe(1);
});
test('travel advances ally HUD positions while passive artwork and pause remain frozen', () => {
  const world = new World([], [], 50);
  world.player.design = design;
  const enemy = createTank(1000, STARTER, 'enemy', 350, 0);
  world.field.enemies = [enemy];
  world.allies = [createTank(1001, STARTER, 'ally', -50, 0)];
  world.step(emptyInput());
  expect(world.tacticalHud.passives.some((p) => p.kind === 'radar')).toBe(true);
  world.jump({ x: 1, y: 0 });
  expect(world.tacticalHud.passives).toEqual([]);
  const passives = world.tacticalHud.passives;
  world.step(emptyInput());
  const allyX = world.tacticalHud.allies[0].x;
  world.step(emptyInput());
  expect(world.tacticalHud.allies[0].x).not.toBe(allyX);
  expect(world.tacticalHud.passives).toBe(passives);
  world.pause();
  const allies = world.tacticalHud.allies;
  world.step(emptyInput());
  expect(world.tacticalHud.allies).toBe(allies);
  expect(world.tacticalHud.passives).toBe(passives);
});
test('secondary summons get a health ring on their creation frame', () => {
  const summon = {
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'swarm', type: 3007 }],
  };
  const world = new World([], [STARTER, summon], 50);
  world.step({ ...emptyInput(), secondary: true });
  expect(world.allies).toHaveLength(1);
  expect(world.tacticalHud.allies.map((a) => a.uid)).toEqual(world.allies.map((a) => a.uid));
});
test('Apocalypse suspends interface clocks, clears enemy readouts and prevents editing', () => {
  const world = new World([], [STARTER, design], 50);
  world.field.enemies = [createTank(1000, STARTER, 'enemy', 350, 0)];
  world.allies = [createTank(1001, STARTER, 'ally', -50, 0)];
  world.step(emptyInput());
  world.editSlider.trigger(1, 1);
  const x = world.editSlider.x;
  world.beginCollapse(0);
  expect(world.tacticalHud.passives.map((p) => p.kind)).toEqual(['radar']);
  const allies = world.tacticalHud.allies,
    passives = world.tacticalHud.passives;
  world.step({ ...emptyInput(), fire: true });
  expect(world.tacticalHud.allies).toBe(allies);
  expect(world.tacticalHud.passives).toBe(passives);
  expect(world.editSlider.x).toBe(x);
  expect(world.canEdit).toBe(false);
  expect(world.collapse?.age).toBe(1);
});
test('Q does not redirect base-game homing; future hooks clear on field entry and avatar replacement', () => {
  const world = new World([], [], 50);
  const enemy = createTank(1000, STARTER, 'enemy', 100, 0);
  world.field.enemies = [enemy, createTank(1001, STARTER, 'enemy', 200, 0)];
  world.cycleLock();
  world.cycleLock();
  world.spawnVolley(world.player, world.player.guns[0], {
    rate: 0,
    speed: 5,
    damage: 1,
    kind: 'seeker',
  });
  expect(world.bullets[0].targetId).toBe(enemy.uid);
  let cycles = 0;
  const resets: (number | undefined)[] = [];
  world.targetLocks = {
    cycle: () => {
      cycles++;
    },
    clear: (capacity) => resets.push(capacity),
  };
  world.cycleLock();
  expect(cycles).toBe(1);
  world.jump({ x: 1, y: 0 });
  for (let i = 0; i < 200 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(resets).toEqual([undefined]);
  world.editPlayer(STARTER);
  expect(resets).toEqual([undefined, 0]);
});
