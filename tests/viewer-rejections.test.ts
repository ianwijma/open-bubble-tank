import { expect, test } from 'bun:test';
import { ViewerRejections } from '../src/game/core/viewer-rejections';
import { TANK_VIEWER } from '../src/game/core/tank-viewer';

test('rejection metadata retains the authored91-frame independent alpha tracks and source placement', () => {
  const art = TANK_VIEWER.rejection;
  expect([art.symbol, art.x, art.y, art.frameCount]).toEqual([1557, 224, 196, 91]);
  expect(art.frames[59]).toEqual([1, 1, 1]);
  expect(art.frames[60]).toEqual([1, 0.96875, 0.96875]);
  expect(art.frames[69]).toEqual([1, 0.67578125, 0.67578125]);
  expect(art.frames[70]).toEqual([0.953125, 0.64453125, 0.64453125]);
  expect(art.frames[89]).toEqual([0.046875, 0.03125, 0.03125]);
  expect(art.frames[90]).toEqual([0, 0, 0]);
  expect(art.fields[0]).toMatchObject({
    name: 'txtErrorOutputText_txt',
    size: 20,
    wordWrap: true,
    align: 2,
  });
});
test('rejection stays on the authored final visible frame and is deleted when it reaches the end', () => {
  const model = new ViewerRejections(),
    id = model.add('Exceeds your Class');
  const initial = model.getSnapshot();
  expect(model.frame(id)).toBe(1);
  for (let i = 0; i < 89; i++) model.step();
  expect(model.frame(id)).toBe(90);
  expect(model.getSnapshot()).toBe(initial);
  model.step();
  expect(model.frame(id)).toBeUndefined();
  expect(model.getSnapshot()).toEqual([]);
});
test('repeated rejections retain separate messages, clocks and stable lifetime snapshots', () => {
  const model = new ViewerRejections();
  let changes = 0;
  const unsubscribe = model.subscribe(() => changes++);
  const first = model.add('first');
  for (let i = 0; i < 20; i++) model.step();
  const second = model.add('second');
  for (let i = 0; i < 69; i++) model.step();
  expect([model.frame(first), model.frame(second), changes]).toEqual([90, 70, 2]);
  model.step();
  expect(model.getSnapshot()).toEqual([{ id: second, message: 'second' }]);
  expect(model.frame(second)).toBe(71);
  for (let i = 0; i < 20; i++) model.step();
  expect(model.getSnapshot()).toEqual([]);
  expect(changes).toBe(4);
  unsubscribe();
  expect(model.add('third')).not.toBe(first);
  expect(changes).toBe(4);
});
