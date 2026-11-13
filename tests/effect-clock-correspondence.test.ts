import { expect, test } from 'bun:test';
import { SwfClip, type ClipSource } from '../src/game/assets/swf-clip';
import { DISPLAY_IDENTITY } from '../src/game/core/display-transform';
import { effectClockChildAtPath } from '../tools/reference/effect-clock-correspondence';

test('effect probe index paths follow source render depths after earlier children are removed and replaced', () => {
  const child = (charId: number, depth: number, bornFrame = 1) => ({
    charId,
    depth,
    bornFrame,
    frame: bornFrame,
    matrix: DISPLAY_IDENTITY,
  });
  const source: ClipSource = {
    spriteInfo: (id) => (id === 1 || id === 20 ? { frameCount: 3 } : undefined),
    displayList: (id, frame) => {
      if (id !== 1 && id !== 20) return [];
      const offset = id === 1 ? 0 : 100;
      return frame === 1
        ? [child(10 + offset, 1), child(id === 1 ? 20 : 120, 4)]
        : frame === 2
          ? [child(11 + offset, 2, 2), child(id === 1 ? 20 : 120, 4)]
          : [child(12 + offset, 1, 3), child(11 + offset, 2, 2), child(id === 1 ? 20 : 120, 4)];
    },
  };
  const root = new SwfClip(1, source);
  root.advance(1);
  const retained = effectClockChildAtPath(root, '0/1');
  root.advance(2);
  expect([...root.children.keys()]).toEqual([4, 2]);
  expect(effectClockChildAtPath(root, '0/0')?.id).toBe(11);
  expect(effectClockChildAtPath(root, '0/1')).toBe(retained);
  root.advance(3);
  expect([...root.children.keys()]).toEqual([4, 2, 1]);
  expect(effectClockChildAtPath(root, '0/0')?.id).toBe(12);
  expect(effectClockChildAtPath(root, '0/1')?.id).toBe(11);
  expect(effectClockChildAtPath(root, '0/2')).toBe(retained);
  expect(effectClockChildAtPath(root, '0/2/0')?.id).toBe(112);
  expect(effectClockChildAtPath(root, '0/2/1')?.id).toBe(111);
  expect(effectClockChildAtPath(root, '0/3')).toBeUndefined();
});
