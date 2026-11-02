import { expect, test } from 'bun:test';
import { initialViewerNavigation, navigateViewer } from '../src/game/core/viewer-navigation';

test('single imported tank disables small-view navigation but detail allows one same-tank Next refresh', () => {
  let state = navigateViewer(initialViewerNavigation(43), 1, { type: 'code' });
  expect(state).toEqual({
    offset: 0,
    page: 1,
    detail: false,
    first: false,
    previous: false,
    next: false,
  });
  state = navigateViewer(state, 1, { type: 'detail', index: 0 });
  expect(state.next).toBe(true);
  state = navigateViewer(state, 1, { type: 'page', direction: 1 });
  expect(state.offset).toBe(0);
  expect(state.next).toBe(false);
  state = navigateViewer(state, 1, { type: 'cards' });
  expect([state.first, state.previous, state.next]).toEqual([false, false, false]);
});
test('small-view First and Previous call caption setter after disabling First, unlike local/code/Back routes', () => {
  let state = initialViewerNavigation(9);
  expect([state.first, state.previous, state.next]).toEqual([false, false, true]);
  state = navigateViewer(state, 9, { type: 'page', direction: 1 });
  expect(state.offset).toBe(4);
  state = navigateViewer(state, 9, { type: 'page', direction: -1 });
  expect([state.first, state.previous, state.next]).toEqual([true, false, true]);
  state = navigateViewer(state, 9, { type: 'page', direction: 0 });
  expect([state.first, state.previous, state.next]).toEqual([true, false, true]);
  state = navigateViewer(state, 9, { type: 'code' });
  expect(state.first).toBe(false);
  state = navigateViewer(state, 9, { type: 'sort' });
  expect([state.first, state.previous, state.next]).toEqual([true, true, true]);
});
test('partial last page stays valid and direct last-tank detail refresh changes the Next latch', () => {
  let state = initialViewerNavigation(9);
  for (let i = 0; i < 2; i++) state = navigateViewer(state, 9, { type: 'page', direction: 1 });
  expect([state.offset, state.page, state.next]).toEqual([8, 3, false]);
  state = navigateViewer(state, 9, { type: 'detail', index: 8 });
  expect([state.first, state.previous, state.next]).toEqual([true, true, true]);
  state = navigateViewer(state, 9, { type: 'page', direction: 1 });
  expect([state.offset, state.next]).toEqual([8, false]);
  state = navigateViewer(state, 9, { type: 'cards' });
  expect([state.offset, state.page, state.next]).toEqual([8, 3, true]);
  // _-8F restores all three controls on later pages, even when no later page exists.
  state = navigateViewer(state, 9, { type: 'page', direction: 1 });
  expect([state.offset, state.page, state.next]).toEqual([8, 3, false]);
});
test('detail first/previous/next use the source one-tank stride and explicit final writes', () => {
  let state = navigateViewer(initialViewerNavigation(5), 5, { type: 'detail', index: 4 });
  state = navigateViewer(state, 5, { type: 'page', direction: -1 });
  expect([state.offset, state.next]).toEqual([3, true]);
  state = navigateViewer(state, 5, { type: 'page', direction: 0 });
  expect([state.offset, state.first, state.previous, state.next]).toEqual([0, false, false, true]);
  state = navigateViewer(state, 5, { type: 'page', direction: 1 });
  expect([state.offset, state.first, state.previous]).toEqual([1, true, true]);
  state = navigateViewer(state, 5, { type: 'cards' });
  expect([state.offset, state.page, state.first, state.previous]).toEqual([0, 1, false, false]);
});
test('code return writes Next after the one-page caption guard for two to four tanks', () => {
  for (const length of [2, 3, 4]) {
    let state = navigateViewer(initialViewerNavigation(43), length, { type: 'code' });
    expect([state.first, state.previous, state.next]).toEqual([false, false, true]);
    state = navigateViewer(state, length, { type: 'page', direction: 1 });
    expect([state.offset, state.page, state.next]).toEqual([0, 1, false]);
  }
});
test('empty imports keep page one out of zero and disable all controls until local reset', () => {
  const empty = navigateViewer(initialViewerNavigation(43), 0, { type: 'code' });
  expect([empty.offset, empty.page, empty.first, empty.previous, empty.next]).toEqual([
    0,
    1,
    false,
    false,
    false,
  ]);
  expect(navigateViewer(empty, 43, { type: 'local' })).toEqual(initialViewerNavigation(43));
});
