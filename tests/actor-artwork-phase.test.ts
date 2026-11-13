import { expect, test } from 'bun:test';
import { AssetPack, type SpriteInfo } from '../src/game/assets/asset-pack';
import type { SwfClip } from '../src/game/assets/swf-clip';
import type { Tank, TankDesign } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import metadata from '../src/game/data/mock-part-timelines.json';
import { createTank } from '../src/game/simulation/tank';
import { removeTankChild } from '../src/game/simulation/tank-display';
import { World, emptyInput } from '../src/game/simulation/world';
import first from './fixtures/actor-clock-original-a.json';
import second from './fixtures/actor-clock-original-b.json';
import { rows } from '../tools/reference/actor-clock-evidence.mjs';

const names = ['wiggle-negative', 'wiggle-positive', 'rotor'];
const design: TankDesign = {
  ...STARTER,
  avatar: false,
  parts: [1501, 1501, 4015].map((type, i) => ({
    ...STARTER.parts[0],
    key: names[i],
    type,
    x: i === 2 ? 30 : 0,
    y: i === 0 ? -20 : i === 1 ? 20 : 0,
    scale: 1,
    rotation: 0,
  })),
};
function setup() {
  const world = new World([], [], 47),
    pack = new AssetPack('mock');
  Object.assign(pack, {
    sprites: new Map((metadata.sprites as SpriteInfo[]).map((s) => [s.id, s])),
  });
  const make = () =>
    createTank(
      world.nextId(),
      { ...design, parts: design.parts.map((part) => ({ ...part })) },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    );
  const clips = (tank: Tank) => tank.design.parts.map((part) => pack.partClip(tank, part));
  return { world, pack, make, clips };
}
const frames = (clips: SwfClip[]) => clips.map((clip) => clip.frame);

for (const [capture, original] of [
  ['a', first],
  ['b', second],
] as const) {
  const measured = rows(original.contract).filter((r) => names.includes(r.name));
  const expected = (label: string, tick: number, phase: string) =>
    names.map((name) => {
      const values = [
        ...new Set(
          measured
            .filter(
              (r) => r.label === label && r.tick === tick && r.phase === phase && r.name === name,
            )
            .map((r) => r.frame),
        ),
      ];
      expect(values).toHaveLength(1); // Reentrant original EXITs must agree; never select a fitted row.
      return values[0];
    });
  test(`actor phases ${capture}: constructor reads precede initial scripts`, () => {
    const { make, clips } = setup();
    expect(frames(clips(make()))).toEqual(expected('before:controlled', 0, 'constructor'));
  });
  for (const mode of ['World.step', 'standalone artwork'] as const) {
    test(`actor phases ${capture}: ${mode} exposes actual ENTER/EXIT and birth holds through550`, () => {
      const { world, make, clips } = setup(),
        before = make(),
        roots = clips(before);
      let expectedRng = world.rng.state;
      let inside: Tank | undefined,
        insideRoots: SwfClip[] = [],
        tick = 0;
      const actual: unknown[] = [],
        oracle: unknown[] = [];
      const beforeChild = roots[2].children.get(1)!;
      let insideChild: typeof beforeChild;
      const sample = (phase: string) => {
        if (measured.some((r) => r.tick === tick && r.phase === phase)) {
          for (const [label, owned] of [
            ['before:controlled', roots],
            ['inside:mount-control', insideRoots],
          ] as const) {
            actual.push([tick, phase, label, frames([...owned])]);
            oracle.push([tick, phase, label, expected(label, tick, phase)]);
          }
        }
      };
      const main = () => {
        if (tick === 1) {
          inside = make();
          insideRoots = clips(inside);
          insideChild = insideRoots[2].children.get(1)!;
          expectedRng = world.rng.state; // Explicit construction consumes its existing gameplay phase draw.
          actual.push(['constructor', frames(insideRoots)]);
          oracle.push(['constructor', expected('inside:mount-control', 1, 'constructor')]);
        }
        sample('enter');
        // No Run or paint arrays supply ownership. Removed objects stay retained.
        if (tick === 111) removeTankChild(inside!, 'part:rotor');
        if (tick === 331) world.actorParents.detach(before);
      };
      world.pause();
      if (mode === 'World.step') {
        const advanceTime = world.advanceTime.bind(world);
        world.advanceTime = (ms) => {
          main();
          advanceTime(ms);
        };
      } else {
        const enter = world.actorArtwork.enterFrame.bind(world.actorArtwork);
        world.actorArtwork.enterFrame = () => {
          enter();
          main();
        };
      }
      const gameplay = [world.rng.state, world.stats.frames, before.age];
      for (tick = 1; tick <= 550; tick++) {
        if (mode === 'World.step') world.step(emptyInput(), 0, false);
        else world.advanceArtwork();
        sample('exit');
      }
      expect(actual).toEqual(oracle);
      expect([world.rng.state, world.stats.frames, before.age]).toEqual([
        expectedRng,
        ...gameplay.slice(1),
      ]);
      expect(clips(before)).toEqual(roots);
      expect(clips(inside!)).toEqual(insideRoots);
      const rotor = insideRoots[2],
        child = rotor.children.get(1)!;
      expect(rotor.frame).toBe(1);
      expect(child).toBe(insideChild!);
      expect(roots[2].children.get(1)).toBe(beforeChild);
      expect(child.clip.parent).toBe(rotor);
      expect(child.clip.age).toBeGreaterThan(500);
    });
  }
}

test('actual Main reads entered geometry; final own Y reaches the pending frame script', () => {
  const { world, make, clips, pack } = setup(),
    tank = make(),
    roots = clips(tank);
  world.pause();
  const entered: number[][] = [];
  world.advanceTime = () => {
    entered.push(frames(clips(tank))); // Same contact/paint getter during Main.
    tank.design.parts[0].y = 20;
    tank.design.parts[1].y = -20;
  };
  world.step(emptyInput(), 0, false);
  expect(entered).toEqual([[1, 1, 1]]);
  expect(frames(roots)).toEqual([51, 1, 1]);
  expect(pack.partClip(tank, tank.design.parts[0])).toBe(roots[0]);
});

test('stage-owned roots ignore compatibility age edits and preserve mounted identities', () => {
  const { world, make, clips } = setup(),
    tank = make(),
    roots = clips(tank);
  world.advanceArtwork();
  const child = roots[2].children.get(1)!;
  expect(frames(roots)).toEqual([1, 51, 1]);
  tank.artAge = 1000; // Telemetry cannot seek/reset a constructed native tree.
  expect(clips(tank).every((clip, i) => clip === roots[i])).toBe(true);
  expect(frames(roots)).toEqual([1, 51, 1]);
  world.advanceArtwork();
  expect(frames(roots)).toEqual([2, 52, 1]);
  expect(roots[2].children.get(1)).toBe(child);
});
