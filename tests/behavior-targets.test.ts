import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { Random } from '../src/game/core/math';
import { createTank } from '../src/game/simulation/tank';
import {
  acquireBehaviorTarget,
  createBehaviorTarget,
  refreshBehaviorTarget,
} from '../src/game/simulation/behavior-targets';
function population() {
  const make = (uid: number, side: 'player' | 'enemy' | 'ally') =>
    createTank(uid, { ...STARTER, parts: [], avatar: side === 'player' }, side);
  return {
    avatar: make(1, 'player'),
    enemies: [make(2, 'enemy'), make(3, 'enemy')],
    allies: [make(4, 'ally'), make(5, 'ally')],
  };
}
function rolls(...values: number[]) {
  const rng = new Random(1);
  let calls = 0;
  rng.next = () => {
    if (calls >= values.length) throw new Error('unexpected extra acquisition draw');
    return values[calls++];
  };
  return { rng, calls: () => calls };
}

test('enemy acquisition consumes its coin even with no allies', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1);
  p.allies = [];
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBe(p.avatar);
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBe(p.avatar);
  expect(random.calls()).toBe(2);
  expect(state.allies).toBe(0); // Setup acquisition does not update Run's private count.
});

test('enemy target index preserves source inclusive-length null rather than clamping/falling back', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1);
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBeNull();
  expect(random.calls()).toBe(2);
});

test('enemy target selection uses current wrapper order and raw coin/index draw order', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(1, 0, 0, 0, 0.5);
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBe(p.avatar);
  expect(random.calls()).toBe(1);
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBe(p.allies[0]);
  acquireBehaviorTarget(state, 'enemy', p, random.rng);
  expect(state.target).toBe(p.allies[1]);
  expect(random.calls()).toBe(5);
});

test('ally acquisition uses 0..length-1 and empty populations clear without a draw', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1);
  acquireBehaviorTarget(state, 'ally', p, random.rng);
  expect(state.target).toBe(p.enemies[0]);
  acquireBehaviorTarget(state, 'ally', p, random.rng);
  expect(state.target).toBe(p.enemies[1]);
  p.enemies = [];
  acquireBehaviorTarget(state, 'ally', p, random.rng);
  expect(state.target).toBeNull();
  expect(random.calls()).toBe(2);
});

test('each part owns a target object and an independent initial ally count', () => {
  const p = population(),
    a = createBehaviorTarget(),
    b = createBehaviorTarget();
  const random = rolls(0, 1);
  acquireBehaviorTarget(a, 'ally', p, random.rng);
  acquireBehaviorTarget(b, 'ally', p, random.rng);
  expect(a.target).toBe(p.enemies[0]);
  expect(b.target).toBe(p.enemies[1]);
  a.allies = 2;
  expect(b.allies).toBe(0);
});

test('Run and Aim both retry missing target before the ally-count check', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1, 0, 0.5);
  state.allies = 2;
  const target = refreshBehaviorTarget(state, 'enemy', p, random.rng, () => true);
  expect(target).toBe(p.allies[1]);
  expect(random.calls()).toBe(4);
});

test('an ally-count change acquires again after successful Run acquisition', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(1, 0, 0);
  const target = refreshBehaviorTarget(state, 'enemy', p, random.rng, () => true);
  expect(target).toBe(p.allies[0]);
  expect(state.allies).toBe(2);
  expect(random.calls()).toBe(3);
  refreshBehaviorTarget(state, 'enemy', p, random.rng, () => true);
  expect(random.calls()).toBe(3);
  p.allies = [];
  const last = rolls(1);
  refreshBehaviorTarget(state, 'enemy', p, last.rng, () => true);
  expect(state.target).toBe(p.avatar);
  expect(state.allies).toBe(0);
  expect(last.calls()).toBe(1);
});

test('three acquisition attempts can leave a source null index until the next active call', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1, 0, 1, 0, 1);
  expect(refreshBehaviorTarget(state, 'enemy', p, random.rng, () => true)).toBeNull();
  expect(random.calls()).toBe(6);
  expect(state.allies).toBe(2);
  const next = rolls(1);
  expect(refreshBehaviorTarget(state, 'enemy', p, next.rng, () => true)).toBe(p.avatar);
  expect(next.calls()).toBe(1);
});

test('cached parented objects survive population replacement and dead flags until detached', () => {
  const p = population(),
    state = createBehaviorTarget(),
    old = p.enemies[0];
  state.target = old;
  state.master = 'ally';
  old.dead = true;
  p.enemies = [{ ...old, x: 100 }]; // Same UID is a different clip, not a replacement reference.
  const noDraws = rolls();
  expect(refreshBehaviorTarget(state, 'ally', p, noDraws.rng, () => true)).toBe(old);
  expect(noDraws.calls()).toBe(0);
  const random = rolls(0);
  expect(refreshBehaviorTarget(state, 'ally', p, random.rng, (target) => target !== old)).toBe(
    p.enemies[0],
  );
  expect(random.calls()).toBe(1);
});

test('parent checks gate retries without prefiltering raw candidates by dead or attachment state', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0, 1);
  state.target = p.enemies[0];
  state.master = 'ally';
  p.enemies[1].dead = true;
  const checked: number[] = [];
  const result = refreshBehaviorTarget(state, 'ally', p, random.rng, (target) => {
    checked.push(target.uid);
    return false;
  });
  expect(checked).toEqual([2, 2]);
  expect(result).toBe(p.enemies[1]);
  expect(result!.dead).toBe(true);
  expect(random.calls()).toBe(2);
});

test('player master neither selects targets nor executes EnemyAim or enemy count refresh', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls();
  acquireBehaviorTarget(state, 'player', p, random.rng);
  expect(state.target).toBeNull();
  expect(refreshBehaviorTarget(state, 'player', p, random.rng, () => true)).toBeNull();
  state.target = p.enemies[0];
  expect(refreshBehaviorTarget(state, 'player', p, random.rng, () => false)).toBe(p.enemies[0]);
  expect(state.allies).toBe(0);
  expect(random.calls()).toBe(0);
});

test('weapon master is sampled on acquisition and retained while its target stays parented', () => {
  const p = population(),
    state = createBehaviorTarget(),
    random = rolls(0);
  expect(state.master).toBeNull();
  acquireBehaviorTarget(state, 'ally', p, random.rng);
  expect(state.master).toBe('ally');
  const target = state.target;
  // Merely changing the owner's data does not itself call AcquireTarget.
  refreshBehaviorTarget(state, 'enemy', p, random.rng, () => true);
  expect(state.target).toBe(target);
  expect(state.master).toBe('ally');
  const reacquire = rolls(1, 1);
  refreshBehaviorTarget(state, 'enemy', p, reacquire.rng, (target) => target === p.avatar);
  expect(state.target).toBe(p.avatar);
  expect(state.master).toBe('enemy');
  expect(state.allies).toBe(2);
  expect(reacquire.calls()).toBe(2);
});
