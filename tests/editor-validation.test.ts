import { expect, test } from 'bun:test';
import type { TankPart } from '../src/game/core/types';
import { creatorEditError, CREATOR_EDIT_ERRORS } from '../src/game/simulation/editor-validation';
import {
  initialEditorSnapshots,
  appendEditorSnapshot,
  acceptedEditorParts,
  undoEditorSnapshot,
} from '../src/game/simulation/editor-history';

const part = (type: number, key = String(type)): TankPart => ({
  key,
  type,
  twin: '',
  x: 0,
  y: 0,
  radius: 1,
  scale: 1,
  rotation: 0,
});
test('editor checks complexity before class, then GP before the later class branch', () => {
  const complex = Array.from({ length: 21 }, (_, i) => part(1502, String(i)));
  expect(creatorEditError(complex, 6, 1, -1)).toBe(6);
  expect(creatorEditError(complex.slice(1), 1, 1, 0)).toBe(0);
  expect(creatorEditError([part(4013)], 2, 1, 0)).toBe(1);
  expect(creatorEditError([part(4013)], 7, 6, 0)).toBe(2);
  expect(creatorEditError([part(4013)], 7, 6, 1)).toBe(5);
  expect(creatorEditError([part(4013)], 1, 6, 0.9)).toBe(0); // source convert_i truncates the difference
  expect(CREATOR_EDIT_ERRORS[1]).toBe('Excedes maximum tank size');
});
test('reverse mount order selects class/behavior errors and permits duplicate behavior instances', () => {
  expect(creatorEditError([part(2004), part(3017)], 4, 6, 100)).toBe(4);
  expect(creatorEditError([part(3017), part(2004)], 4, 6, 100)).toBe(3);
  expect(creatorEditError([part(3017), part(6001), part(6003)], 4, 6, 100)).toBe(7);
  expect(creatorEditError([part(6001), part(6003), part(3017)], 4, 6, 100)).toBe(4);
  expect(creatorEditError([part(6001), part(6001, 'duplicate')], 1, 6, 0)).toBe(0);
  expect(creatorEditError([], 1, 1, 0)).toBe(0); // edit validation is separate from Save prerequisites
});
test('final size gate uses body radius/scale, weapon centers, inclusive rings and no sixth radius', () => {
  const body = { ...part(1001), x: 15, radius: 10, scale: 2 };
  expect(creatorEditError([body], 1, 1, 100)).toBe(0);
  expect(creatorEditError([{ ...body, x: 15.001 }], 1, 1, 100)).toBe(1);
  const weapon = { ...part(4013), x: 35, radius: 200, scale: 2 };
  expect(creatorEditError([weapon], 1, 1, 100)).toBe(0);
  expect(creatorEditError([{ ...weapon, x: 35.001 }], 1, 1, 100)).toBe(1);
  expect(creatorEditError([{ ...body, x: 1000 }], 1, 6, 100)).toBe(0);
  expect(creatorEditError([{ ...body, x: NaN }], 1, 1, 100)).toBe(0);
});
test('setup/import snapshots, no-op acceptance and unlimited undo retain independent part copies', () => {
  const initial = [part(1001)];
  const loaded = initialEditorSnapshots(initial);
  initial[0].x = 99;
  expect(acceptedEditorParts(loaded)[0].x).toBe(0);
  expect(loaded).toHaveLength(2);
  expect(acceptedEditorParts(undoEditorSnapshot(loaded))).toEqual([]);
  let history = initialEditorSnapshots([]);
  history = appendEditorSnapshot(history, []);
  expect(history).toHaveLength(2);
  for (let i = 0; i < 25; i++) history = appendEditorSnapshot(history, [{ ...part(1001), x: i }]);
  expect(history).toHaveLength(27);
  const exposed = acceptedEditorParts(history);
  exposed[0].x = 999;
  expect(acceptedEditorParts(history)[0].x).toBe(24);
  for (let i = 0; i < 26; i++) history = undoEditorSnapshot(history);
  expect(history).toHaveLength(1);
  expect(acceptedEditorParts(history)).toEqual([]);
});
