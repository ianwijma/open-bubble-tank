import { expect, test } from 'bun:test';
import { shapeHitGeometry } from '../src/game/assets/swf-symbols.mjs';

test('shape contact retains transparent fills and strokes with original winding and registration', () => {
  const shape = {
    fills: [{ kind: 'solid', color: [0, 0, 0, 0] }],
    lines: [{ width: 200, color: [0, 0, 0, 0], startCap: 2, join: 2, miterLimit: 4 }],
    usesFillWinding: true,
    runs: [
      {
        start: [400, 400],
        ops: [
          ['L', 1200, 400],
          ['L', 1200, 1200],
          ['L', 400, 1200],
          ['L', 400, 400],
        ],
        f0: 0,
        f1: 1,
        line: 1,
      },
    ],
  };
  const geometry = shapeHitGeometry(shape);
  expect(geometry.fills).toEqual([
    { path: 'M20 20 L60 20 L60 60 L20 60 L20 20 Z', rule: 'nonzero' },
  ]);
  expect(geometry.strokes[0]).toMatchObject({ width: 10, cap: 'square', join: 'miter', miter: 4 });
  expect(JSON.stringify(geometry)).not.toContain('color');
});
