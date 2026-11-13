import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { spawnPickups } from '../src/game/simulation/pickups';

test('retained pickup pose advances through pause and UID/Run edits instead of holding frame1', () => {
  const world = new World([], [], 51);
  spawnPickups(world, { x: 200, y: 0 }, 50);
  const p = world.pickups[0],
    clip = world.pickupDisplays.read(p)!.clip;
  world.pause();
  world.step(emptyInput());
  expect(clip.pose.frame).toBe(1);
  p.uid = 9999;
  world.pickups = [];
  for (let i = 0; i < 14; i++) world.step(emptyInput());
  expect(clip.pose.frame).toBe(15);
  expect(world.pickupDisplays.read(p)!.clip).toBe(clip);
  expect(clip.pose.placements[0].matrix.a).toBeLessThan(2.1);
  world.pickupDisplays.remove(p, world.field);
  for (let i = 0; i < 20; i++) world.step(emptyInput());
  expect(clip.pose.frame).toBe(4);
});

import { PickupDisplays } from '../src/game/simulation/pickup-display';
import original from './fixtures/pickup-pose-original.json';
import type { Pickup } from '../src/game/core/types';

for (const cohort of ['before', 'inside'] as const)
  for (const [label, reference] of Object.entries(original[cohort]))
    test(`original ${cohort} ${label}: retained root and native child checkpoint replay`, () => {
      const results = [...reference.randomResults];
      const owner = new PickupDisplays(() => {
        const result = results.shift();
        if (result === undefined) throw new Error('Unexpected frame-script request');
        // Per-clip observed outputs, not reconstruction of source global entropy.
        return result / 10;
      });
      if (cohort === 'inside') owner.enterFrame();
      const denomination = label.endsWith('50') ? 50 : label.endsWith('5') ? 5 : 1;
      const pickup = { value: denomination } as Pickup;
      const clip = owner.construct(pickup);
      expect(clip.pose.frame).toBe(1);
      expect(results).toEqual(reference.randomResults); // no script/entropy in constructor
      const child = clip.pose.children.get(1)!.clip;
      const pose = () => {
        const m = clip.pose.placements[0].matrix;
        return [m.tx / 20, m.ty / 20, Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)];
      };
      for (let tick = 1; tick <= 180; tick++) {
        if (!(cohort === 'inside' && tick === 1)) owner.enterFrame();
        const checkpoint = reference.checkpoints.find((c) => c[0] === tick);
        if (checkpoint) {
          expect(clip.pose.frame).toBe(checkpoint[1] as number);
          expect(pose()).toEqual(checkpoint[3] as number[]);
        }
        if (tick === 90 && label.startsWith('held') && denomination !== 50)
          clip.pose.gotoAndPlay(1);
        owner.advanceArtwork();
        if (checkpoint) {
          expect(clip.pose.frame).toBe(checkpoint[2] as number);
          expect(pose()).toEqual(checkpoint[4] as number[]);
        }
        expect(clip.pose.children.get(1)!.clip).toBe(child);
      }
      expect(results).toEqual([]);
    });

test('frame1 zero/one controls do not recurse and rerun after a complete natural wrap', () => {
  for (const r of [0, 1]) {
    let draws = 0;
    const owner = new PickupDisplays(() => {
      draws++;
      return r / 10;
    });
    owner.enterFrame(); // declared inside-ENTER construction
    const clip = owner.construct({ value: 1 } as Pickup);
    owner.advanceArtwork();
    expect([clip.pose.frame, draws]).toEqual([1, 1]);
    owner.enterFrame();
    owner.advanceArtwork();
    expect([clip.pose.frame, draws]).toEqual([1, 1]);
    for (let i = 0; i < 40; i++) {
      owner.enterFrame();
      owner.advanceArtwork();
    }
    expect([clip.pose.frame, draws]).toEqual([1, 2]);
  }
});
