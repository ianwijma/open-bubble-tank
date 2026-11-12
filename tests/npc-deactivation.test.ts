import { expect, test } from 'bun:test';
import type { Projectile, Tank } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import allies from '../src/game/data/allies.json';
import { createTank } from '../src/game/simulation/tank';
import { applyProjectileStatus } from '../src/game/simulation/status';
import { World, emptyInput } from '../src/game/simulation/world';

// Source _-Zx.Damage/IsOutside/Deactivate and _-6g.FinalPartCall.
// Infection and custom allied pods are explicit state/API fixtures, not public-playthrough proof.
const body = {
  ...STARTER,
  avatar: false,
  speed: 0,
  life: 100,
  reward: 0,
  parts: [STARTER.parts[0]],
};
function setup(side: 'enemy' | 'ally', outside = false, pods = 1) {
  const world = new World([], [], 7);
  world.progression.level = 6;
  world.player.x = -250;
  world.player.y = -100;
  world.hitTest = () => false;
  world.rng.next = () => 0.5;
  const victim = createTank(
    world.nextId(),
    {
      ...body,
      reward: 3,
      parts: [
        ...body.parts,
        ...Array.from({ length: pods }, (_, i) => ({
          ...STARTER.parts[1],
          key: `pod${i}`,
          type: 4022,
          x: 80,
          y: 50,
        })),
      ],
    },
    side,
    outside ? 440 : 100,
    0,
  );
  const survivor = createTank(world.nextId(), body, 'enemy', -150, 100);
  world.field.enemies = side === 'enemy' ? [victim, survivor] : [survivor];
  world.allies = side === 'ally' ? [victim] : [];
  world.actorParents.sync(world);
  return { world, victim };
}
function observe(world: World, victim: Tank) {
  const phases: string[] = [];
  const births: Projectile[] = [];
  const states: {
    dead: boolean;
    active: boolean;
    kills: number;
    queued: boolean;
    parented: boolean;
  }[] = [];
  const add = world.addBullet.bind(world),
    emit = world.emit.bind(world),
    drop = world.dropBubbles.bind(world);
  world.dropBubbles = (pos, amount) => {
    phases.push('drops');
    return drop(pos, amount);
  };
  world.emit = (type, ...args) => {
    if (['hit', 'pop', 'death'].includes(type)) phases.push(type);
    return emit(type, ...args);
  };
  world.addBullet = (bullet, home, target) => {
    phases.push(bullet.kind);
    births.push({ ...bullet });
    states.push({
      dead: victim.dead,
      active: victim.dataActive,
      kills: world.stats.kills,
      queued: world.runtimeFor(world.field).enemyRemovals.includes(victim),
      parented: world.actorParents.hasParent(victim),
    });
    return add(bullet, home, target);
  };
  return { phases, births, states };
}

test('enemy lethal damage drops and sounds before infection births, primary finals, data clearing and field callback', () => {
  const { world, victim } = setup('enemy');
  applyProjectileStatus(world, victim, 'infect');
  const proof = observe(world, victim);
  world.damage(victim, 100);
  expect(proof.phases).toEqual([
    'drops',
    'pop',
    'infect',
    'infect',
    ...Array(6).fill('seekerMine'),
  ]);
  expect(proof.states).toEqual(
    Array(8).fill({ dead: false, active: true, kills: 0, queued: false, parented: true }),
  );
  expect(world.pickups).toHaveLength(3);
  expect([victim.life, victim.dead, victim.dataActive, world.stats.kills]).toEqual([
    0,
    true,
    false,
    1,
  ]);
  expect(world.runtimeFor(world.field).enemyRemovals).toEqual([victim]);
  expect(world.actorParents.hasParent(victim)).toBe(true);
  // Preserve the shipped NaN retarget failure and the newly appended bullet order.
  expect(
    world.bullets
      .slice(0, 2)
      .every((b) => b.kind === 'infect' && b.removeAfterFrame && b.infectionTries === 4),
  ).toBe(true);
  expect([world.stats.shots, world.stats.enemyShots]).toEqual([2, 6]);
  world.kill(victim);
  expect(proof.births).toHaveLength(8);
  expect(world.stats.kills).toBe(1);
  world.step(emptyInput());
  expect(world.actorParents.hasParent(victim)).toBe(false);
});

test('infection Setup draws precede mine heading/scatter rolls without filtering queued enemies', () => {
  const { world, victim } = setup('enemy');
  applyProjectileStatus(world, victim, 'infect');
  victim.design = { ...victim.design, reward: 0 };
  const ranges: number[][] = [];
  world.rng.int = (min, max) => {
    ranges.push([min, max]);
    return min;
  };
  world.damage(victim, 100);
  expect(ranges).toEqual([
    [0, 360],
    ...Array(4).fill([0, 1]),
    [0, 360],
    ...Array(4).fill([0, 1]),
    ...Array.from({ length: 6 }, () => [
      [0, 360],
      [4, 22],
    ]).flat(),
  ]);
});

test('allied lethal damage plays death, omits drops/infection and retains hostile primary death mines', () => {
  const { world, victim } = setup('ally');
  applyProjectileStatus(world, victim, 'infect');
  const proof = observe(world, victim);
  world.damage(victim, 100);
  expect(proof.phases).toEqual(['death', ...Array(6).fill('seekerMine')]);
  expect(
    proof.births.every(
      (b) => b.enemy && b.x === victim.x && b.y === victim.y && b.speed === 4 && b.damage === 7,
    ),
  ).toBe(true);
  expect(proof.states).toEqual(
    Array(6).fill({ dead: false, active: true, kills: 0, queued: false, parented: true }),
  );
  expect(world.pickups).toHaveLength(0);
  expect(world.stats.kills).toBe(0);
  expect(victim.dataActive).toBe(false);
});

test('allied boundary exit bypasses protection, drops then pops and runs primary finals without infection', () => {
  const { world, victim } = setup('ally', true);
  applyProjectileStatus(world, victim, 'infect');
  victim.shield = 100;
  const proof = observe(world, victim);
  world.step(emptyInput());
  expect(proof.phases).toEqual(['drops', 'pop', ...Array(6).fill('seekerMine')]);
  expect(proof.states).toEqual(
    Array(6).fill({ dead: false, active: true, kills: 0, queued: false, parented: true }),
  );
  expect([victim.life, victim.dead, victim.dataActive, victim.shield]).toEqual([
    0,
    true,
    false,
    99,
  ]);
  expect(world.allies).toContain(victim);
  expect(world.runtimeFor(world.field).allyRemovals).toContain(victim);
  expect(world.actorParents.hasParent(victim)).toBe(true);
  expect(victim.displayChildren).toEqual([]);
  expect(world.stats.kills).toBe(0);
  world.step(emptyInput());
  expect(world.allies).not.toContain(victim);
  expect(world.actorParents.hasParent(victim)).toBe(false);
});

for (const [name, design] of Object.entries(allies))
  test(`recovered ${name} summon blueprint plays pop on an explicit boundary exit`, () => {
    const { world } = setup('ally', true, 0);
    const ally = createTank(world.nextId(), design, 'ally', 440, 0, 15, 15, world);
    world.allies = [ally];
    world.step(emptyInput());
    expect(world.events.map((e) => e.type)).toContain('pop');
    expect(world.events.map((e) => e.type)).not.toContain('death');
    expect([ally.dead, ally.dataActive]).toEqual([true, false]);
    expect(world.actorParents.hasParent(ally)).toBe(true);
    expect(ally.displayChildren).toEqual([]);
    world.step(emptyInput());
    expect(world.actorParents.hasParent(ally)).toBe(false);
  });

test('enemy boundary uses lethal Damage and increments Sumo before the same death contract', () => {
  const { world, victim } = setup('enemy', true);
  applyProjectileStatus(world, victim, 'infect');
  const proof = observe(world, victim);
  world.step(emptyInput());
  expect(proof.phases.slice(0, 4)).toEqual(['drops', 'pop', 'infect', 'infect']);
  expect([world.stats.sumo, world.stats.kills]).toEqual([1, 1]);
  expect(world.runtimeFor(world.field).enemyRemovals).toContain(victim);
  expect(world.actorParents.hasParent(victim)).toBe(true);
});

test('transit rejects births after evaluating all final-callback arguments and still completes teardown', () => {
  const { world, victim } = setup('enemy', false, 2);
  applyProjectileStatus(world, victim, 'infect');
  victim.design = { ...victim.design, reward: 0 };
  world.jump({ x: 1, y: 0 });
  expect(world.transit).not.toBeNull();
  const ranges: number[][] = [];
  world.rng.int = (min, max) => {
    ranges.push([min, max]);
    return min;
  };
  world.damage(victim, 100);
  expect(ranges).toEqual([
    [0, 360],
    [0, 360],
    ...Array.from({ length: 12 }, () => [
      [0, 360],
      [4, 22],
    ]).flat(),
  ]);
  expect(world.bullets).toHaveLength(0);
  expect([victim.dead, victim.dataActive, world.stats.kills]).toEqual([true, false, 1]);
});
