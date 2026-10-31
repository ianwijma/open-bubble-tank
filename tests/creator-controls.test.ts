import { expect, test } from 'bun:test';
import { CREATOR_CONTROLS, creatorControl } from '../src/game/core/creator-controls';

test('creator layout retains source workspace registration, mirrored nudge and transform-slider placements', () => {
  expect(CREATOR_CONTROLS.symbol).toBe(969);
  expect(CREATOR_CONTROLS.workspace).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 3719, ty: 4634 });
  expect(CREATOR_CONTROLS.controls).toHaveLength(11);
  expect(creatorControl('Undo_mc').matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 6080, ty: 8380 });
  expect(creatorControl('Left_mc').matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 216, ty: 4635 });
  expect(creatorControl('Right_mc').matrix).toEqual({
    a: -1,
    b: 0,
    c: 0,
    d: -1,
    tx: 7226,
    ty: 4635,
  });
  expect(CREATOR_CONTROLS.sliders.map((s) => [s.name, s.symbol, s.matrix.tx, s.matrix.ty])).toEqual(
    [
      ['Resize_mc', 834, 1420, 8600],
      ['Rotate_mc', 836, 4220, 8600],
    ],
  );
});

test('creator text matrices do not enlarge the source Undo rectangle twice', () => {
  const undo = creatorControl('Undo_mc');
  expect(undo.bounds).toEqual({ x: -0.5, y: -0.5, width: 58, height: 23 });
  const label = undo.variants['1:up'].find((p) => p.kind === 'text')!;
  expect(label.id).toBe(838);
  expect(label.bounds).toEqual({ xMin: 740, xMax: 1640, yMin: 0, yMax: 160 });
  expect(label.boundsMatrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: -620, ty: 140 });
  expect(label.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 120, ty: 140 });
  expect(label.glyphs!.map((g) => g.text).join('')).toBe('Undo Last');
  // Declared text bounds already include the internal +740-twip text matrix.
  expect((label.bounds.xMax + label.boundsMatrix!.tx) / 20).toBe(51);
});

test('creator sliders retain shared two-frame handles and source track widths', () => {
  for (const [index, slider] of CREATOR_CONTROLS.sliders.entries()) {
    expect(slider.handle.symbol).toBe(833);
    expect(slider.handle.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 590, ty: 45 });
    expect(slider.handle.variants.map((v) => v.map((p) => p.id))).toEqual([[831], [832]]);
    const track = slider.track.find((p) => p.id === 829)!;
    expect(track.bounds).toEqual({ xMin: -1217, xMax: 1218, yMin: -36, yMax: 134 });
    expect(track.stroke!.width).toBe(0.05);
    const label = slider.track.find((p) => p.kind === 'text')!;
    expect(label.glyphs!.map((g) => g.text).join('')).toBe(index === 0 ? 'Resize' : 'Rotate');
  }
});
