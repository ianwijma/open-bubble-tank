import { expect, test } from 'bun:test';
import { UPGRADE_SCREEN, upgradeWidget } from '../src/game/core/upgrade-screen';

// Independently inspected Root1935 PlaceObject records in the supplied source.
test('loading, ready and child frames retain named viewers and the offstage loader', () => {
  const frames = UPGRADE_SCREEN.rootFrames.map(({ frame, pieces }) => ({
    frame,
    viewers: pieces.find((piece) => piece.name === 'viewers_mc')!,
    loading: pieces.find((piece) => piece.name === 'loadingBar_mc')!,
  }));
  expect(frames.map(({ viewers }) => viewers.matrix.ty)).toEqual([-2654, 4246, -4154, -4154]);
  expect(frames.map(({ loading }) => loading.matrix.ty)).toEqual([4642, -2158, -2158, -2158]);
  expect(frames.map(({ viewers, loading }) => [viewers.symbol, loading.symbol])).toEqual([
    [1917, 1919],
    [1917, 1919],
    [1917, 1919],
    [1917, 1919],
  ]);
});

test('loader preserves five authored dots, their depth order and static label', () => {
  const { animation, label } = UPGRADE_SCREEN.loading;
  expect(animation.symbol).toBe(1057);
  expect(animation.frames).toHaveLength(25);
  expect(animation.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: -1620, ty: 98 });
  expect(
    animation.frames[0].map(({ depth, symbol, matrix, alpha }) => [
      depth,
      symbol,
      matrix.tx,
      alpha,
    ]),
  ).toEqual([
    [1, 1056, 0, 1],
    [2, 1056, 2920, 0],
    [3, 1056, 730, 0],
    [4, 1056, 2190, 0],
    [5, 1056, 1460, 0],
  ]);
  expect(animation.frames[2].map(({ alpha }) => alpha)).toEqual([0.6015625, 0, 1, 0, 0]);
  expect(animation.frames[24]).toEqual(animation.frames[2]);
  expect(label.symbol).toBe(1918);
  expect(
    upgradeWidget(label.symbol)
      .art.flatMap((piece) => piece.glyphs ?? [])
      .map((glyph) => glyph.text)
      .join(''),
  ).toBe('Loading Tanks . . .');
  expect(upgradeWidget(1056).art[0].paths?.[0].fill).toEqual([255, 255, 255]);
});
