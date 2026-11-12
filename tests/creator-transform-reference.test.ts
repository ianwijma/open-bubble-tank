import { expect, test } from 'bun:test';
import reference from './fixtures/creator-transform-reference.json';
import { DISPLAY_IDENTITY, displayMousePoint } from '../src/game/core/display-transform';
import { displayPixel } from '../src/game/core/display-values';
import { transformSelection } from '../src/game/simulation/editor-selection';

// Each capture starts with source scale1/rotation0. The retained handle follows
// its own display setter, not the raw mouse-down point or the saved angle.
const handles = new Map<number, { Rotate_mc: number; Resize_mc: number }>();
for (const row of reference.cases) {
  const pose = handles.get(row.dpr) ?? { Rotate_mc: -57, Resize_mc: -19 },
    control = row.control as 'Rotate_mc' | 'Resize_mc',
    center = control === 'Rotate_mc' ? 211 : 71,
    end = row.moves.at(-1)!,
    local = displayMousePoint(
      { x: end.x * row.dpr, y: end.y * row.dpr },
      { ...DISPLAY_IDENTITY, a: row.dpr, d: row.dpr },
      { ...DISPLAY_IDENTITY, tx: (center + pose[control]) * 20, ty: 8645 },
      { ...DISPLAY_IDENTITY, tx: center * 20, ty: 8600 },
    ),
    chosen = Math.max(-57, Math.min(57, local.x)),
    ratio = (chosen + 57) / 114;
  pose[control] = displayPixel(chosen);
  handles.set(row.dpr, pose);
  const change = control === 'Rotate_mc' ? { rotation: ratio * 360 } : { scale: ratio * 1.5 + 0.5 };
  test(`original DPR${row.dpr} ${row.name} exports`, () => {
    const actual = transformSelection(
      row.before,
      { keys: row.before.map((p) => p.key), ghosts: [] },
      change,
    );
    expect(actual).toEqual(row.expected);
  });
}
