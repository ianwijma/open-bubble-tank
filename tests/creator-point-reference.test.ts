import { describe, expect, test } from 'bun:test';
import reference from './fixtures/creator-point-reference.json';
import { CREATOR_CONTROLS } from '../src/game/core/creator-controls';
import { DISPLAY_IDENTITY, displayMousePoint } from '../src/game/core/display-transform';
import { displayPixel } from '../src/game/core/display-values';
import type { Vec } from '../src/game/core/types';

describe('original public creator coordinate exports', () => {
  const local = CREATOR_CONTROLS.workspace;
  const cursor = (point: Vec, scale: number, dpr: number) =>
    displayMousePoint(
      { x: point.x * dpr, y: point.y * dpr },
      { ...DISPLAY_IDENTITY, a: scale * dpr, d: scale * dpr },
      local,
      local,
    );
  for (const example of reference.drag)
    test(example.name, () => {
      let old = cursor(example.down, example.scale, example.dpr);
      let parts = example.before.map((p) => ({ ...p }));
      for (const move of example.moves) {
        const point = cursor(move, example.scale, example.dpr);
        const dx = point.x - old.x;
        parts = parts.map((p) => ({ ...p, x: displayPixel(p.x + dx) }));
        old = point;
      }
      expect(parts).toEqual(example.expected);
    });
  for (const example of reference.placement)
    test(example.name, () => {
      const point = cursor(example.mouse, example.scale, example.dpr);
      const x = displayPixel(point.x),
        y = Math.abs(point.y) <= 3 ? 0 : displayPixel(point.y);
      expect(example.expected.map((p) => ({ x: p.x, y: p.y }))).toEqual(
        y === 0
          ? [{ x, y }]
          : [
              { x, y },
              { x, y: -y },
            ],
      );
    });
});
