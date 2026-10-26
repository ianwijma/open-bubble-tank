import { expect, test } from 'bun:test';
import { acceptedPlacement, placementParts } from '../src/game/simulation/editor-placement';
test('preview placement snaps new objects within three pixels in either symmetry mode', () => {
  expect(placementParts(1001, 5, { x: 10, y: 3 }, false, 'a')).toEqual([
    { key: 'a', type: 1001, radius: 5, x: 10, y: 0, rotation: 0, scale: 1, twin: '' },
  ]);
  expect(placementParts(1001, 5, { x: 10, y: -3 }, true, 'b')).toHaveLength(1);
  const pair = placementParts(1001, 5, { x: 10, y: -3.01 }, true, 'p');
  expect(pair.map((p) => [p.key, p.y, p.twin])).toEqual([
    ['p', -3.01, 'p-twin'],
    ['p-twin', 3.01, 'p'],
  ]);
});
test('new objects obey both the design rectangle and recovered body/weapon ring checks', () => {
  expect(acceptedPlacement(placementParts(1001, 10, { x: 170, y: 0 }, false, 'a'), 1, 6)).toEqual(
    [],
  );
  expect(
    acceptedPlacement(placementParts(2001, 10, { x: 170, y: 0 }, false, 'a'), 1, 6),
  ).toHaveLength(1);
  expect(
    acceptedPlacement(placementParts(1001, 10, { x: 170, y: 0 }, false, 'a'), 5, 6),
  ).toHaveLength(1);
  expect(acceptedPlacement(placementParts(1001, 10, { x: 176, y: 0 }, false, 'a'), 5, 6)).toEqual(
    [],
  );
});
test('drop rejection tests each twin and unlinks the survivor', () => {
  const pair = placementParts(1001, 10, { x: 0, y: 20 }, true, 'p');
  pair[1] = { ...pair[1], x: 500 };
  expect(acceptedPlacement(pair, 1, 6)).toEqual([{ ...pair[0], twin: '' }]);
  expect(pair[0].twin).toBe('p-twin');
});
