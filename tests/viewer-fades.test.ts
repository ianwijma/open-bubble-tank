import { expect, test } from 'bun:test';
import { ViewerFades } from '../src/game/core/viewer-fades';

test('viewer show/hide queues change input only on Update and retain signed8.8 fade values', () => {
  const fades = new ViewerFades();
  fades.show('confirm', true);
  expect(fades.state('confirm')).toEqual({ alpha: 0, mouseEnabled: false });
  for (const alpha of [51, 102, 153, 204, 255, 306]) {
    fades.step();
    expect(fades.state('confirm')).toEqual({ alpha: alpha / 256, mouseEnabled: true });
    expect(fades.settled('confirm')).toBe(false);
  }
  fades.step();
  expect(fades.state('confirm').alpha).toBe(1);
  expect(fades.settled('confirm')).toBe(true);
  fades.hide('confirm');
  expect(fades.state('confirm').mouseEnabled).toBe(true);
  for (const alpha of [204, 152, 100, 48, -3]) {
    fades.step();
    expect(fades.state('confirm')).toEqual({ alpha: alpha / 256, mouseEnabled: false });
  }
  fades.step();
  expect(fades.state('confirm').alpha).toBe(0);
  expect(fades.settled('confirm')).toBe(true);
});
test('viewer queue reversal keeps current alpha unless the source resets a new confirmation', () => {
  const fades = new ViewerFades();
  fades.show('code');
  fades.step();
  fades.step();
  fades.hide('code');
  fades.step();
  expect(fades.state('code').alpha).toBe(50 / 256);
  fades.show('code');
  fades.step();
  expect(fades.state('code').alpha).toBe(101 / 256);
  expect(fades.state('code').mouseEnabled).toBe(true);
  fades.show('code', true);
  expect(fades.state('code').alpha).toBe(0);
});
test('forward splicing defers the neighboring source queue entry by one frame', () => {
  const fades = new ViewerFades();
  fades.state('a', 1);
  fades.show('a');
  fades.show('b');
  fades.step();
  expect(fades.state('b').alpha).toBe(0);
  expect(fades.state('b').mouseEnabled).toBe(false);
  fades.step();
  expect(fades.state('b').alpha).toBe(51 / 256);
  expect(fades.state('b').mouseEnabled).toBe(true);
  fades.state('c', 0);
  fades.state('d', 1);
  fades.hide('c');
  fades.hide('d');
  fades.step();
  expect(fades.state('d').alpha).toBe(1);
  expect(fades.state('d').mouseEnabled).toBe(true);
  fades.step();
  expect(fades.state('d').alpha).toBe(204 / 256);
  expect(fades.state('d').mouseEnabled).toBe(false);
});

test('delete fade leaves input unchanged until disposal and forward splicing delays neighbors', () => {
  const fades = new ViewerFades(),
    deleted: string[] = [];
  for (const name of ['a', 'b']) {
    fades.state(name, 1);
    fades.onDelete(name, () => deleted.push(name));
    fades.deleteAfterFade(name);
  }
  for (const alpha of [204, 152, 100, 48, -3]) {
    fades.step();
    expect(fades.state('a')).toEqual({ alpha: alpha / 256, mouseEnabled: true });
    expect(fades.state('b').alpha).toBe(alpha / 256);
    expect(deleted).toEqual([]);
  }
  fades.step();
  expect(deleted).toEqual(['a']);
  expect(fades.state('a').alpha).toBe(0);
  expect(fades.state('b').alpha).toBe(-3 / 256);
  fades.step();
  expect(deleted).toEqual(['a', 'b']);
});
test('requeuing a pending delete disposes synchronously before the incoming update', () => {
  const fades = new ViewerFades(),
    events: string[] = [];
  fades.state('slot', 1);
  fades.onDelete('slot', () => {
    events.push('delete');
    fades.state('slot').alpha = 0;
  });
  fades.deleteAfterFade('slot');
  fades.show('slot');
  expect(events).toEqual(['delete']);
  expect(fades.state('slot').alpha).toBe(0);
  fades.step();
  expect(fades.state('slot').alpha).toBe(51 / 256);
  expect(events).toEqual(['delete']);
});
