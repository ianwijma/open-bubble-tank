import { expect, test } from 'bun:test';
import type { TankPart } from '../src/game/core/types';
import { EditorDisplayState, editorDisplayTopology } from '../src/game/simulation/editor-display';
import { nudgeSelection } from '../src/game/simulation/editor-selection';

const part: TankPart = {
  key: '1_mc',
  twin: '',
  type: 1001,
  x: 7.125,
  y: -9.875,
  rotation: 0,
  scale: 1,
  radius: 7,
};
test('loading retains raw saved coordinates independently of clip setters', () => {
  const saved = [{ ...part }],
    positions = new EditorDisplayState(saved);
  expect(positions.present(saved)[0]).toMatchObject({ x: 7.1, y: -9.85 });
  expect(saved[0]).toEqual(part);
  const presented = positions.present(saved);
  positions.retain(saved);
  expect(positions.present(saved)).toBe(presented);
});
test('nudge preserves the separate raw and displayed coordinates', () => {
  const saved = [{ ...part }],
    positions = new EditorDisplayState(saved);
  positions.nudge(['1_mc'], 1, 3);
  const next = nudgeSelection(saved, { keys: ['1_mc'], ghosts: [] }, 3);
  positions.retain(next);
  expect(next[0].x).toBe(10.125);
  expect(positions.present(next)[0].x).toBe(10.1);
  expect(next[0].y).toBe(part.y);
  expect(positions.present(next)[0].y).toBe(-9.85);
});
test('drag topology leaves existing saved positions until selected release', () => {
  const saved = [{ ...part }],
    positions = new EditorDisplayState(saved);
  const displayed = [{ ...part, x: 8.25, y: -10.25 }];
  positions.adopt(displayed);
  const moved = editorDisplayTopology(saved, displayed);
  positions.retain(moved);
  expect(moved[0]).toEqual(part);
  expect(positions.present(moved)[0]).toMatchObject({ x: 8.25, y: -10.25 });
  expect(positions.saveSelected(moved, ['1_mc'])[0]).toMatchObject({ x: 8.25, y: -10.25 });
  expect(moved[0]).toEqual(part);
});
test('split topology accepts a new twin pose without overwriting the existing raw position', () => {
  const saved = [{ ...part }];
  const moved = [
    { ...part, x: 8.25, y: -10.25, twin: '2_mc' },
    { ...part, key: '2_mc', twin: '1_mc', x: 8.25, y: 10.25 },
  ];
  const next = editorDisplayTopology(saved, moved);
  expect(next[0]).toMatchObject({ x: part.x, y: part.y, twin: '2_mc' });
  expect(next[1]).toEqual(moved[1]);
});
test('undo reconstructs display positions and removes absent clip keys', () => {
  const saved = [{ ...part }],
    positions = new EditorDisplayState(saved);
  positions.adopt([
    { ...part, x: 12, y: 0 },
    { ...part, key: '2_mc', x: 12, y: 10 },
  ]);
  positions.reset(saved);
  expect(positions.present(saved)[0]).toMatchObject({ x: 7.1, y: -9.85 });
  const added = [...saved, { ...part, key: '2_mc', x: 20.123 }];
  positions.retain(added);
  expect(positions.present(added)[1].x).toBe(20.1);
});

test('imported rotation stays raw until that control releases, including a no-move release', () => {
  const saved = [{ ...part, rotation: 270, scale: 1.5263157894736843 }],
    display = new EditorDisplayState(saved);
  expect(display.present(saved)[0]).toMatchObject({ rotation: -90, scale: saved[0].scale });
  expect(saved[0].rotation).toBe(270);
  expect(display.saveSelected(saved, ['1_mc'])[0].rotation).toBe(270);
  expect(display.saveTransform(saved, ['1_mc'], 'scale')[0].rotation).toBe(270);
  expect(display.saveTransform(saved, ['1_mc'], 'rotation')[0]).toEqual({
    ...saved[0],
    rotation: -90,
  });
});
test('held transform changes clips and links while raw fields wait for their separate release', () => {
  const saved = [
      { ...part, rotation: 270 },
      { ...part, key: '2_mc', y: 10 },
    ],
    display = new EditorDisplayState(saved),
    held = display.present(saved).map((p) => ({ ...p, scale: 1.5, rotation: 45 }));
  display.adopt(held);
  const metadata = editorDisplayTopology(saved, held);
  expect(metadata).toEqual(saved);
  expect(display.present(metadata).map((p) => [p.rotation, p.scale])).toEqual([
    [45, 1.5],
    [45, 1.5],
  ]);
  expect(display.saveTransform(metadata, ['1_mc'], 'rotation')).toEqual([
    { ...saved[0], rotation: 45 },
    saved[1],
  ]);
  expect(display.saveTransform(metadata, ['1_mc'], 'scale')).toEqual([
    { ...saved[0], scale: 1.5 },
    saved[1],
  ]);
});
