import { expect, test } from 'bun:test';
import { ENEMIES } from '../src/game/data/catalog';
import { ViewerFades } from '../src/game/core/viewer-fades';
import { ViewerPanes, viewerCardName } from '../src/game/core/viewer-panes';

test('detail reparents one retained preview while the other cards keep fading previews until deletion', () => {
  const fades = new ViewerFades(),
    panes = new ViewerPanes(fades);
  panes.setup(ENEMIES.slice(0, 4));
  const source = panes.getSnapshot().cards[1]!;
  panes.detail(1);
  expect(panes.getSnapshot().detail!.instance).toBe(source.instance);
  expect(panes.getSnapshot().cards[1]!.ownsArt).toBe(false);
  expect(panes.getSnapshot().cards[0]!.ownsArt).toBe(true);
  fades.step();
  expect(fades.state('detail').alpha).toBe(51 / 256);
  expect(fades.state(viewerCardName(0)).alpha).toBe(204 / 256);
  expect(panes.getSnapshot().cards.filter(Boolean)).toHaveLength(4);
  for (let i = 0; i < 9; i++) fades.step();
  expect(panes.getSnapshot().cards).toEqual([null, null, null, null]);
  expect(fades.state(viewerCardName(0)).mouseEnabled).toBe(false);
  expect(panes.getSnapshot().detail!.instance).toBe(source.instance);
});
test('Back constructs fresh cards at alpha0 and retains the old detail through its own fade', () => {
  const fades = new ViewerFades(),
    panes = new ViewerPanes(fades);
  panes.setup(ENEMIES.slice(0, 4));
  panes.detail(0);
  for (let i = 0; i < 10; i++) fades.step();
  const detail = panes.getSnapshot().detail!;
  panes.returnToCards(ENEMIES.slice(0, 4));
  expect(panes.getSnapshot().detail).toBe(detail);
  expect(panes.getSnapshot().cards[0]!.instance).not.toBe(detail.instance);
  expect(fades.state(viewerCardName(0)).alpha).toBe(0);
  fades.step();
  expect(fades.state(viewerCardName(0)).alpha).toBe(51 / 256);
  expect(fades.state('detail').alpha).toBe(204 / 256);
  for (let i = 0; i < 9; i++) fades.step();
  expect(panes.getSnapshot().detail).toBeNull();
  expect(panes.getSnapshot().cards.filter(Boolean)).toHaveLength(4);
});
test('source pending delete executes immediately when _-We requeues a slot, including rapid Back', () => {
  const fades = new ViewerFades(),
    panes = new ViewerPanes(fades);
  panes.setup(ENEMIES.slice(0, 4));
  panes.detail(0);
  fades.step();
  panes.returnToCards(ENEMIES.slice(0, 4));
  expect(panes.getSnapshot().cards).toEqual([null, null, null, null]);
  expect(panes.getSnapshot().detail).not.toBeNull();
});
test('ordinary page Setup swaps previews immediately at alpha1, without queuing an invented fade', () => {
  const fades = new ViewerFades(),
    panes = new ViewerPanes(fades);
  panes.setup(ENEMIES.slice(0, 4));
  const before = panes.getSnapshot().cards[0]!.instance;
  panes.setup(ENEMIES.slice(4, 6));
  expect(panes.getSnapshot().cards[0]!.instance).not.toBe(before);
  expect(panes.getSnapshot().cards.map((p) => p?.tank.id)).toEqual([
    ENEMIES[4].id,
    ENEMIES[5].id,
    undefined,
    undefined,
  ]);
  expect(fades.state(viewerCardName(0)).alpha).toBe(1);
  expect(fades.state(viewerCardName(0)).mouseEnabled).toBe(true);
  expect(fades.settled(viewerCardName(0))).toBe(true);
});

test('detail next/previous uses a fresh slot-one preview, then hides that shell', () => {
  const panes = new ViewerPanes();
  panes.setup(ENEMIES.slice(0, 4));
  panes.detail(2);
  const previous = panes.getSnapshot().detail!;
  for (let i = 0; i < 10; i++) panes.fades.step();
  panes.replaceDetail(ENEMIES[6]);
  const next = panes.getSnapshot().detail!,
    shell = panes.getSnapshot().cards[0]!;
  expect(next.tank).toBe(ENEMIES[6]);
  expect(next.instance).not.toBe(previous.instance);
  expect(shell.instance).toBe(next.instance);
  expect(shell.ownsArt).toBe(false);
  expect(panes.fades.state(viewerCardName(0))).toEqual({ alpha: 0, mouseEnabled: false });
  panes.fades.step();
  expect(panes.getSnapshot().cards[0]).toBeNull();
  expect(panes.getSnapshot().detail).toBe(next);
});
