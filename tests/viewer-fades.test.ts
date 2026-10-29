import { expect, test } from 'bun:test';
import { ViewerFades } from '../src/game/core/viewer-fades';

test('viewer modal alpha follows source 0.2 steps and disables input on hide immediately', () => {
  const fades = new ViewerFades();
  fades.show('confirm', true);
  expect(fades.state('confirm')).toEqual({ alpha: 0, mouseEnabled: true });
  for (let i = 1; i <= 5; i++) {
    fades.step();
    expect(fades.state('confirm').alpha).toBeCloseTo(i * 0.2, 10);
  }
  fades.hide('confirm');
  expect(fades.state('confirm').mouseEnabled).toBe(false);
  expect(fades.state('confirm').alpha).toBe(1);
  for (let i = 0; i < 7; i++) fades.step();
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
  expect(fades.state('code').alpha).toBeCloseTo(0.2, 10);
  fades.show('code');
  fades.step();
  expect(fades.state('code').alpha).toBeCloseTo(0.4, 10);
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
  fades.step();
  expect(fades.state('b').alpha).toBe(0.2);
  fades.state('c', 0);
  fades.state('d', 1);
  fades.hide('c');
  fades.hide('d');
  fades.step();
  expect(fades.state('d').alpha).toBe(1);
  fades.step();
  expect(fades.state('d').alpha).toBe(0.8);
});
