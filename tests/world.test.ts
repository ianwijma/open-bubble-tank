import { FieldVisit } from '../src/game/core/field-visit';
import { describe, expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { ENEMIES, STARTER, costs, PARTS } from '../src/game/data/catalog';
import { availableWaves, matchesRule, rollWave } from '../src/game/simulation/waves';
import { Random } from '../src/game/core/math';
import rules from '../src/game/data/rules.json';
import { MAX_LIFE } from '../src/game/core/constants';
const input = emptyInput;
function finishTransit(world: World) {
  for (let i = 0; i < 300 && world.mode === 'transit'; i++) world.step(input());
}
function step(world: World, n: number, change: Partial<ReturnType<typeof input>> = {}) {
  for (let i = 0; i < n; i++) world.step({ ...input(), ...change });
}

describe('original gameplay contracts', () => {
  test('new game starts in an empty tutorial field with 1 of 50 life', () => {
    const w = new World([], [], 1);
    expect(w.player.life).toBe(1);
    expect(w.player.maxLife).toBe(50);
    expect(w.field.enemies).toHaveLength(0);
    expect(w.field.tutorial).toBe(1);
  });
  test('acceleration is per axis, diagonal motion is not normalized, coasting has the original snap', () => {
    const w = new World([], [], 1);
    step(w, 10, { right: true, down: true });
    expect(w.player.velocity.x).toBeCloseTo(6);
    expect(w.player.velocity.y).toBeCloseTo(6);
    step(w, 1);
    expect(w.player.velocity.x).toBeCloseTo(5.91);
    step(w, 65);
    expect(w.player.velocity.x).toBe(0);
    expect(w.player.velocity.y).toBe(0);
  });
  test('basic cannon fires once every 14 frames, cooldown runs while released', () => {
    const w = new World([], [], 1);
    step(w, 14, { fire: true });
    expect(w.stats.shots).toBe(1);
    step(w, 1, { fire: true });
    expect(w.stats.shots).toBe(2);
    step(w, 14);
    step(w, 1, { fire: true });
    expect(w.stats.shots).toBe(3);
    expect(w.drainEvents().filter((event) => event.type === 'shoot')).toHaveLength(3);
  });
  test('kills grant no health until life bubbles are collected', () => {
    const w = new World([], [], 4),
      enemy = createTank(
        100,
        ENEMIES.find((e) => e.reward === 5)!,
        'enemy',
        200,
        0,
      );
    w.field.cleared = false;
    w.fieldVisit = new FieldVisit();
    w.field.enemies = [enemy];
    const life = w.player.life;
    w.damage(enemy, 1000);
    expect(w.player.life).toBe(life);
    expect(w.pickups.reduce((sum, p) => sum + p.value, 0)).toBe(5);
    step(w, 1);
    expect(w.field.cleared).toBe(true);
    expect(w.pickups.every((p) => p.forced)).toBe(true);
    expect(w.stats.completed).toBe(1);
    step(w, 60);
    expect(w.player.life).toBe(6);
    expect(w.stats.collected).toBe(5);
  });
  test('filling health opens the upgrade choice and choosing starts at floor(max/75)+1', () => {
    const w = new World([], [], 1);
    w.player.life = 50;
    step(w, 1);
    expect(w.mode).toBe('upgrade');
    expect(w.progression.level).toBe(1);
    expect(w.offers.length).toBeGreaterThan(0);
    w.selectUpgrade(w.offers[0]);
    expect(w.mode).toBe('playing');
    expect(w.player.maxLife).toBe(100);
    expect(w.player.life).toBe(2);
  });
  test('death loses a level; re-earning it restores the same design without another menu', () => {
    const w = new World([], [], 1);
    w.player.life = 50;
    step(w, 1);
    const chosen = w.offers[0];
    w.selectUpgrade(chosen);
    w.damage(w.player, 1000);
    step(w, 1);
    expect(w.progression.level).toBe(0);
    expect(w.player.life).toBe(49);
    w.player.life = 50;
    step(w, 1);
    expect(w.mode).toBe('playing');
    expect(w.progression.level).toBe(1);
    expect(w.player.design.id).toBe(chosen.id);
    expect(w.player.life).toBe(2);
  });
  test('level-zero death escapes into a deadhead field instead of ending the game', () => {
    const w = new World([], [], 1);
    w.damage(w.player, 2);
    step(w, 1);
    expect(w.mode).toBe('transit');
    expect(w.player.life).toBe(1);
    expect(w.transit?.next.enemies.length).toBeGreaterThan(0);
    expect(w.transit?.next.enemies.every((e) => costs(e.design.parts).gp === 0)).toBe(true);
  });
  test('visited enemies retain position and damage; cleared fields remain reachable', () => {
    const w = new World([], [], 8);
    w.jump({ x: 1, y: 0 });
    finishTransit(w);
    const first = w.field;
    first.enemies[0].life = 1;
    first.enemies[0].x = 19;
    w.jump({ x: 1, y: 0 });
    finishTransit(w);
    const cached = first.enemies[0];
    const departedAt = { x: cached.x, y: cached.y, age: cached.age };
    step(w, 5);
    expect({ x: cached.x, y: cached.y, age: cached.age }).toEqual(departedAt);
    w.jump({ x: -1, y: 0 });
    expect(w.transit?.next).toBe(first);
    expect(first.enemies[0].life).toBe(1);
    expect(first.enemies[0]).toBe(cached);
    expect({ x: cached.x, y: cached.y, age: cached.age }).toEqual(departedAt);
    finishTransit(w);
    first.cleared = true;
    w.jump({ x: -1, y: 0 });
    expect(w.transit?.next).toBe(w.fields.get('0,0'));
  });
  test('boss gate uses current health and latches for the session', () => {
    const w = new World([], [], 1);
    w.progression.level = 6;
    w.player.life = 999;
    w.jump({ x: 1, y: 0 });
    expect(w.transit?.next.boss).toBe(false);
    finishTransit(w);
    w.player.life = 1000;
    w.jump({ x: 1, y: 0 });
    expect(w.transit?.next.boss).toBe(true);
    expect(w.bossTriggered).toBe(true);
  });
  test('maps record completed crossings once, without connecting adjacent untraveled fields', () => {
    const w = new World([], [], 8);
    for (const dir of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ]) {
      const previous = w.connections.size;
      w.jump(dir);
      expect(w.connections.size).toBe(previous);
      finishTransit(w);
    }
    expect(w.connections.size).toBe(3);
    expect(w.connections.has('0,0|0,1')).toBe(false);
    w.jump({ x: 0, y: -1 });
    finishTransit(w);
    expect(w.field).toBe(w.fields.get('0,0')!);
    expect(w.connections.size).toBe(4);
    w.jump({ x: 0, y: 1 });
    finishTransit(w);
    expect(w.connections.size).toBe(4);
  });
  test('a field crossing animates, can pause mid-flight, and resumes at the same point', () => {
    const w = new World([], [], 8);
    w.player.x = 425;
    w.jump({ x: 1, y: 0 });
    const target = w.transit!.target.x,
      start = w.player.x;
    step(w, 1);
    expect(w.player.x).toBeCloseTo(start + (target - start) * 0.09);
    expect(w.transit?.age).toBe(1);
    w.pause();
    const paused = w.player.x;
    step(w, 100);
    expect(w.player.x).toBe(paused);
    expect(w.transit?.age).toBe(1);
    w.resume();
    expect(w.mode).toBe('transit');
    finishTransit(w);
    expect(w.field.col).toBe(1);
    expect(w.connections.size).toBe(1);
  });
  test('downgrading restores the previous complete design and its secondary attack', () => {
    const lower = {
      ...STARTER,
      id: 'lower',
      name: 'Lower shield tank',
      parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'shield', type: 3010 }],
    };
    const higher = {
      ...STARTER,
      id: 'higher',
      name: 'Higher seeker tank',
      parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'seeker', type: 3009 }],
    };
    const w = new World([], [STARTER, lower, higher], 8);
    const previous = w.player.uid;
    w.damage(w.player, 1000);
    step(w, 1);
    expect(w.player.uid).not.toBe(previous);
    expect(w.player.design).toBe(lower);
    expect(w.player.maxLife).toBe(100);
    expect(w.player.guns.map((gun) => gun.part.type)).toContain(3010);
    expect(w.mode).toBe('secondary-help');
    w.closeSecondaryHelp();
    step(w, 1, { secondary: true });
    expect(w.player.shield).toBe(25);
    expect(w.secondaryCounter).toBe(60);
  });
  test('pause freezes all gameplay including position and counters', () => {
    const w = new World([], [], 1);
    w.pause();
    const p = { ...w.player };
    step(w, 100, { right: true, fire: true });
    expect(w.player.x).toBe(p.x);
    expect(w.player.age).toBe(p.age);
    expect(w.stats.frames).toBe(0);
  });
  test('shield blocks damage and weakened doubles it before forcefield absorption', () => {
    const w = new World([], [], 1);
    w.player.life = 40;
    w.player.shield = 5;
    w.damage(w.player, 3);
    expect(w.player.life).toBe(40);
    w.player.shield = 0;
    w.player.status.weaken = 80;
    w.damage(w.player, 3);
    expect(w.player.life).toBe(34);
  });
  test('secondary weapons fire together on the largest mounted cooldown', () => {
    const w = new World([], [], 1);
    const design = {
      ...STARTER,
      parts: [
        ...STARTER.parts,
        { ...STARTER.parts[1], key: 's1', type: 3009 },
        { ...STARTER.parts[1], key: 's2', type: 3004 },
      ],
    };
    w.player = createTank(100, design, 'player', 0, 0, 50, 1);
    step(w, 1, { secondary: true });
    expect(w.stats.shots).toBe(2);
    // The targetless _-XV is removed in this empty field's bullet phase.
    expect(w.bullets).toHaveLength(1);
    expect(w.secondaryCounter).toBe(140);
    step(w, 139, { secondary: true });
    expect(w.stats.shots).toBe(2);
    step(w, 1, { secondary: true });
    expect(w.stats.shots).toBe(2); // Counter reaches zero; its reset frame is separate.
    step(w, 1, { secondary: true });
    expect(w.stats.shots).toBe(4);
  });
});
describe('recovered catalog and wave tables', () => {
  test('all parts have linked Flash symbols and all built-in parts exist', () => {
    expect(PARTS).toHaveLength(93);
    expect(PARTS.every((p) => p.symbol > 0)).toBe(true);
    const ids = new Set(PARTS.map((p) => p.id));
    expect(ENEMIES.every((t) => t.parts.length > 0 && t.parts.every((p) => ids.has(p.type)))).toBe(
      true,
    );
    expect(MAX_LIFE).toEqual([50, 100, 170, 250, 400, 800, 2000]);
  });
  test('early wave options are restored and select by the original distance branch', () => {
    expect(availableWaves(1)).toHaveLength(2);
    expect(availableWaves(3)).toHaveLength(2);
    expect(availableWaves(5)).toHaveLength(3);
    expect(availableWaves(7)).toHaveLength(5);
    expect(availableWaves(8)).toHaveLength(6);
    expect(availableWaves(8, true)).toHaveLength(8);
  });
  test('local fallback evaluates strict RULE conditions, including EarlyHeavy GP == 2', () => {
    const pool = ENEMIES.filter((e) => matchesRule(e, rules.EarlyHeavy));
    expect(pool.map((t) => t.name).sort()).toEqual(['Returned', 'Sticky Again']);
    expect(
      ENEMIES.filter((e) => matchesRule(e, rules.TinyDeadHead))
        .map((t) => t.name)
        .sort(),
    ).toEqual(['Floaty', 'Whispy']);
  });
  test('seeded waves are deterministic and have valid scales in every distance band', () => {
    for (const d of [-1, 1, 3, 7, 9, 10, 15, 19, 20, 28, 50]) {
      const a = rollWave(d, new Random(781));
      const b = rollWave(d, new Random(781));
      expect(a).toEqual(b);
      expect(a.scale).toBeGreaterThanOrEqual(0.8);
      expect(a.scale).toBeLessThanOrEqual(2);
      expect(a.designs.length).toBeGreaterThan(0);
    }
  });
});

describe('advanced parts', () => {
  test('forcefield absorbs 40, recharges partially, and rearms after 320 broken frames', () => {
    const w = new World([], [], 1),
      base = STARTER.parts[1];
    w.player = createTank(
      800,
      { ...STARTER, parts: [...STARTER.parts, { ...base, key: 'forcefield', type: 5005 }] },
      'player',
      0,
      0,
      100,
      50,
    );
    w.damage(w.player, 10);
    expect(w.player.life).toBe(50);
    expect(w.player.forcefield).toBe(30);
    step(w, 20);
    expect(w.player.forcefield).toBe(31);
    w.damage(w.player, 35);
    expect(w.player.life).toBe(46);
    expect(w.player.forcefieldReady).toBe(false);
    step(w, 319);
    expect(w.player.forcefieldReady).toBe(false);
    step(w, 1);
    expect(w.player.forcefieldReady).toBe(true);
    expect(w.player.forcefield).toBe(40);
  });
  test('Massive Cannon defers its projectile until the original 26-frame effect completes', () => {
    const w = new World([], [], 1);
    const gun = {
      part: { ...STARTER.parts[1], type: 3008 },
      counter: -1,
      angle: 0,
      burst: 0,
      burstTimer: 0,
    };
    w.fireGun(w.player, gun, input());
    expect(w.bullets).toHaveLength(0);
    step(w, 25);
    expect(w.bullets).toHaveLength(0);
    step(w, 1);
    expect(w.bullets.some((b) => b.damage === 100)).toBe(true);
  });
  test('a carrier hit releases six seekers and removes only that mounted part', () => {
    const w = new World([], [], 4),
      part = { ...STARTER.parts[1], type: 4013, x: 0, y: 0, radius: 18 };
    const carrier = createTank(
      900,
      { ...STARTER, id: 'carrier', avatar: false, life: 10, reward: 1, speed: 0, parts: [part] },
      'enemy',
      60,
      0,
    );
    w.field.cleared = false;
    w.fieldVisit = new FieldVisit();
    w.field.enemies = [carrier, createTank(901, ENEMIES[0], 'enemy', 0, 300)];
    const released: number[] = [];
    const addBullet = w.addBullet.bind(w);
    w.addBullet = (bullet) => {
      if (bullet.kind === 'seeker') released.push(bullet.uid);
      return addBullet(bullet);
    };
    step(w, 5, { fire: true });
    expect(carrier.removedParts.has(part.key)).toBe(true);
    expect(carrier.dead).toBe(true);
    expect(new Set(released).size).toBe(6);
    // Live-array children also run immediately and can already have been shot down.
    expect(w.bullets.filter((b) => b.kind === 'seeker').every((b) => b.age > 0)).toBe(true);
  });
  test('shield turrets build over three builder arrivals and protect the owner', () => {
    const w = new World([], [], 9),
      part = { ...STARTER.parts[1], type: 4032 };
    const enemy = createTank(
      999,
      {
        ...STARTER,
        id: 'turret-tank',
        avatar: false,
        life: 100,
        speed: 0,
        parts: [...STARTER.parts.filter((p) => p.type < 2000), part],
      },
      'enemy',
      200,
      200,
    );
    w.field.cleared = false;
    w.fieldVisit = new FieldVisit();
    w.field.enemies = [enemy];
    // Use the actual 80-frame cadence: simultaneous builders collide with one another.
    step(w, 380);
    expect(w.bullets.find((b) => b.kind === 'turret')?.build).toBe(4);
    expect(enemy.shield).toBeGreaterThan(0);
    w.damage(enemy, 50);
    expect(enemy.life).toBe(100);
  });
});

test('the recovered roster expands at the original distance milestones', () => {
  const w = new World([], [], 123);
  expect(w.roster.units.has('Heavy')).toBe(false);
  w.roster.update(7);
  expect(w.roster.units.has('Heavy')).toBe(true);
  expect(w.roster.stage).toBe(2);
  w.roster.update(17);
  expect(w.roster.stage).toBe(3);
});
test('star burst splits after its fuse into 36 ordinary five-damage shots', () => {
  const w = new World([], [], 2);
  const gun = {
    part: { ...STARTER.parts[1], type: 3005 },
    counter: -1,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  w.fireGun(w.player, gun, input());
  step(w, 45);
  expect(w.bullets.filter((b) => b.kind === 'shell')).toHaveLength(0);
  step(w, 1);
  expect(
    w.bullets.filter((b) => b.kind === 'shell' && b.damage === 5 && b.speed === 7),
  ).toHaveLength(36);
});
test('Drone Converter changes enemy homing projectiles, never enemy tanks', () => {
  const w = new World([], [], 1),
    enemy = createTank(1234, ENEMIES[0], 'enemy', 100, 0);
  w.field.cleared = false;
  w.fieldVisit = new FieldVisit();
  w.field.enemies = [enemy];
  const gun = {
    part: { ...STARTER.parts[1], type: 4002 },
    counter: 0,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  w.fireGun(enemy, gun, input());
  expect(w.bullets[0].enemy).toBe(true);
  w.fireGun(w.player, { ...gun, part: { ...gun.part, type: 3006 } }, input());
  expect(w.field.enemies).toHaveLength(1);
  expect(w.allies).toHaveLength(0);
  expect(
    w.bullets.filter((b) => !b.dead && !b.enemy && b.kind === 'seeker' && b.damage === 15),
  ).toHaveLength(1);
});
test('orbital seekers fill six slots without a target, orbit, and disappear with their owner', () => {
  const w = new World([], [], 5);
  w.player = createTank(
    100,
    { ...STARTER, parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'orbital', type: 5006 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  step(w, 130);
  const seekers = w.bullets.filter((b) => b.kind === 'orbital');
  expect(seekers).toHaveLength(6);
  const first = seekers[0],
    angle = first.angle;
  step(w, 1);
  expect(first.angle).toBeCloseTo(angle + 5);
  expect(first.symbol).toBe(2016);
  w.player.dead = true;
  step(w, 1);
  expect(first.dead).toBe(true);
});
test('Apocalypse uses the visual field wall, waits on its fuse, and collapses the field before escape', () => {
  const w = new World([], [], 5);
  const oldField = w.field;
  oldField.cleared = false;
  oldField.enemies = [createTank(200, { ...ENEMIES[0], life: 100, speed: 0 }, 'enemy', -250, 0)];
  const gun = {
    part: { ...STARTER.parts[1], type: 3017 },
    counter: 0,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  w.fireGun(w.player, gun, input());
  const bullet = w.bullets[0];
  bullet.x = 420;
  bullet.y = 0;
  step(w, 2);
  expect(bullet.detonating).toBeUndefined();
  expect(bullet.dead).toBe(false);
  step(w, 1);
  expect(bullet.detonating).toBe(1);
  const x = bullet.x;
  step(w, 52);
  expect(bullet.x).toBe(x);
  expect(w.mode).toBe('playing');
  step(w, 1);
  expect(w.mode).toBe('collapse');
  step(w, 119, { right: true, fire: true });
  expect(oldField.destroyed).not.toBe(true);
  expect(w.player.x).toBe(0);
  step(w, 1);
  expect(oldField.destroyed).toBe(true);
  expect(w.stats.kills).toBe(1);
  expect(w.mode).toBe('transit');
  finishTransit(w);
  expect(w.field.col).toBe(-1);
});
