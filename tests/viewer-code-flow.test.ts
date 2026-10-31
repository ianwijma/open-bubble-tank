import { expect, test } from 'bun:test';
import { ENEMIES } from '../src/game/data/catalog';
import { ViewerCodeFlow, viewerToolbarName } from '../src/game/core/viewer-code-flow';
import { viewerCardName } from '../src/game/core/viewer-panes';

test('code entry retains card previews through their independent deletion fade and rebuilds page one', () => {
  const flow = new ViewerCodeFlow(false),
    { panes, fades } = flow;
  panes.setup(ENEMIES.slice(4, 8));
  const previous = panes.getSnapshot().cards[0]!.instance;
  flow.open(false);
  expect(panes.getSnapshot().cards[0]!.instance).toBe(previous);
  fades.step();
  expect(fades.state(viewerCardName(0)).alpha).toBe(0.8);
  expect(fades.state(viewerToolbarName('btnNext_mc')).alpha).toBe(0.8);
  for (let i = 0; i < 12; i++) fades.step();
  expect(panes.getSnapshot().cards).toEqual([null, null, null, null]);
  flow.returnToView(ENEMIES);
  expect(panes.getSnapshot().cards[0]!.tank).toBe(ENEMIES[0]);
  expect(panes.getSnapshot().cards[0]!.instance).not.toBe(previous);
  expect(fades.state(viewerCardName(0)).alpha).toBe(0);
  expect(flow.sortX).toBe(616.55);
  fades.step();
  expect(fades.state(viewerCardName(0)).alpha).toBe(0.2);
  flow.localPosition();
  expect(flow.sortX).toBe(501.6);
});
test('avatar point-panel fade retains the original hidden-control queue deferral', () => {
  const flow = new ViewerCodeFlow(true),
    { fades } = flow;
  flow.open(false);
  fades.step();
  const points = fades.state(viewerToolbarName('btnCurrentPoints_mc'));
  expect(points.alpha).toBe(0.8);
  fades.step();
  expect(points.alpha).toBe(0.8);
  expect(fades.state(viewerToolbarName('btnNext_mc')).alpha).toBeCloseTo(0.6, 10);
});
test('detail entry uses its own delete queue and source omits the hidden Create control', () => {
  const flow = new ViewerCodeFlow(true),
    { panes, fades } = flow;
  panes.setup(ENEMIES.slice(0, 4));
  panes.detail(0);
  for (let i = 0; i < 15; i++) fades.step();
  flow.open(true);
  fades.step();
  expect(fades.state('detail').alpha).toBe(0.8);
  expect(fades.state(viewerToolbarName('btnCurrentPoints_mc')).alpha).toBe(1);
  for (let i = 0; i < 15; i++) fades.step();
  expect(panes.getSnapshot().detail).toBeNull();
  flow.returnToView(ENEMIES);
  expect(panes.getSnapshot().detail).toBeNull();
  expect(panes.getSnapshot().cards.filter(Boolean)).toHaveLength(4);
});
test('asynchronous read/cancel releases old pending previews before rebuilding, so stale disposal cannot erase the queue', () => {
  const flow = new ViewerCodeFlow(false),
    { panes, fades } = flow;
  panes.setup(ENEMIES.slice(4, 8));
  flow.open(false);
  fades.step();
  flow.returnAfterRead(ENEMIES);
  const rebuilt = panes.getSnapshot().cards[0]!.instance;
  for (let i = 0; i < 20; i++) fades.step();
  expect(panes.getSnapshot().cards.filter(Boolean)).toHaveLength(4);
  expect(panes.getSnapshot().cards[0]!.instance).toBe(rebuilt);
  expect(panes.getSnapshot().cards[0]!.tank).toBe(ENEMIES[0]);
});
