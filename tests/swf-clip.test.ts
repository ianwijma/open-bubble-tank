import { expect, test } from 'bun:test';
import { SwfClip, type ClipSource } from '../src/game/assets/swf-clip';
import type { DisplayPlacement } from '../src/game/assets/asset-pack';
const placement = (charId: number, bornFrame = 1, y = 0): DisplayPlacement => ({
  charId,
  depth: 1,
  frame: bornFrame,
  bornFrame,
  matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: y * 20 },
});
test('children keep playing when their parent stops, and repeated reads do not advance or reroll', () => {
  let calls = 0;
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 720 ? 27 : 40 }),
    displayList: (id) => (id === 720 ? [placement(680)] : []),
  };
  const root = new SwfClip(720, source, () => {
    calls++;
    return 0.9;
  });
  root.advance(1);
  const child = root.children.get(1)!.clip;
  expect(root.frame).toBe(1);
  expect(child.frame).toBe(9);
  root.advance(10);
  expect(root.frame).toBe(1);
  expect(child.frame).toBe(18);
  expect(root.children.get(1)!.clip).toBe(child);
  root.advance(10);
  expect(child.frame).toBe(18);
  expect(calls).toBe(1);
});
test('skipped draw frames still process removals and fresh clip construction in order', () => {
  let calls = 0;
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 10000 ? 4 : 40 }),
    displayList: (id, frame) =>
      id !== 10000 || frame === 3 ? [] : [placement(680, frame === 4 ? 4 : 1)],
  };
  const root = new SwfClip(10000, source, () => {
    calls++;
    return 0.5;
  });
  root.advance(1);
  const first = root.children.get(1)!.clip;
  root.advance(4);
  expect(root.children.get(1)!.clip).not.toBe(first);
  expect(root.children.get(1)!.clip.age).toBe(1);
  expect(root.children.get(1)!.clip.frame).toBe(5);
  expect(calls).toBe(2);
});
test('nested branch scripts read their own local placement Y and react at the boundary', () => {
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 20 ? 100 : 200 }),
    displayList: (id, frame) => (id === 10000 ? [placement(20, 1, frame === 1 ? 10 : -10)] : []),
  };
  const root = new SwfClip(10000, source);
  root.advance(1, -100);
  const child = root.children.get(1)!.clip;
  expect(child.frame).toBe(51);
  root.advance(49);
  expect(child.frame).toBe(99);
  root.advance(50);
  expect(child.frame).toBe(1);
});
test('a recursive supplied display list is bounded instead of exhausting the stack', () => {
  const source: ClipSource = {
    spriteInfo: () => ({ frameCount: 1 }),
    displayList: () => [placement(10000)],
  };
  const root = new SwfClip(10000, source);
  root.advance(1);
  let clip = root,
    depth = 0;
  while (clip.children.size) {
    clip = clip.children.get(1)!.clip;
    depth++;
  }
  expect(depth).toBe(24);
});

test('existing descendants enter before parent removals, then retired descendants stop at their actual frame', () => {
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 10000 ? 5 : 4 }),
    displayList: (id, frame) => (id === 10000 && frame < 5 ? [placement(10001)] : []),
  };
  for (const staged of [false, true]) {
    const root = new SwfClip(10000, source);
    root.construct();
    const step = (age: number) => {
      if (staged) {
        root.enterFrame();
        root.runFrameScripts();
      } else root.advance(age);
    };
    for (let age = 1; age <= 4; age++) step(age);
    const retired = root.children.get(1)!.clip;
    expect(retired.frame).toBe(4);
    step(5);
    expect(root.children.size).toBe(0);
    expect(retired.frame).toBe(1);
    step(6);
    expect(root.children.get(1)!.clip).not.toBe(retired);
    expect(retired.frame).toBe(1);
  }
});

test('timeline retirement preserves a non-wrap frame rather than resetting every removed child to1', () => {
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 10000 ? 4 : 8 }),
    displayList: (id, frame) => (id === 10000 && frame < 3 ? [placement(10001)] : []),
  };
  for (const staged of [false, true]) {
    const root = new SwfClip(10000, source);
    const step = (age: number) => {
      if (staged) {
        root.enterFrame();
        root.runFrameScripts();
      } else root.advance(age);
    };
    step(1);
    const child = root.children.get(1)!.clip;
    step(2);
    expect(child.frame).toBe(2);
    step(3);
    expect(child.frame).toBe(3);
    expect(child.parent).toBeNull();
    step(4);
    expect(child.frame).toBe(3);
  }
});

test('combined advancement defers child actions until the parent placement tags have updated its own Y', () => {
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 20 ? 100 : 200 }),
    displayList: (id, frame) => (id === 10000 ? [placement(20, 1, frame < 50 ? 10 : -10)] : []),
  };
  const root = new SwfClip(10000, source);
  root.advance(49);
  const child = root.children.get(1)!.clip;
  expect(child.frame).toBe(99);
  root.advance(50);
  expect(child.frame).toBe(1);
});

test('frame scripts visit current render children after entry/removal, preserving their forward draw order', () => {
  const source: ClipSource = {
    spriteInfo: (id) => ({ frameCount: id === 10000 ? 3 : 40 }),
    displayList: (id, frame) =>
      id !== 10000
        ? []
        : [
            { ...placement(680, frame === 1 ? 1 : 2), depth: 1 },
            { ...placement(680), depth: 4 },
          ],
  };
  const draws = [0.9, 0.9, 0.2, 0.7];
  const root = new SwfClip(10000, source, () => draws.shift()!);
  root.advance(1);
  const retained = root.children.get(4)!.clip;
  retained.gotoAndPlay(40);
  root.advance(2);
  expect(root.children.get(1)!.clip.frame).toBe(2);
  expect(retained.frame).toBe(7);
  expect(draws).toEqual([]);
});
