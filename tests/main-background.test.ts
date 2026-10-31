import { expect, test } from 'bun:test';
import { BackgroundParticles, MainBackground } from '../src/game/core/main-background';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { World, emptyInput } from '../src/game/simulation/world';
import paint from '../src/game/data/main-background.json';

test('Main shape356 retains its authored gradient matrix and duplicate end stops', () => {
  expect(paint.symbol).toBe(357);
  const m = paint.fill.matrix;
  expect(-819.2 * m.b + m.ty / 20).toBeCloseTo(-0.95);
  expect(819.2 * m.b + m.ty / 20).toBeCloseTo(450.95);
  expect(paint.fill.stops.map((stop) => [stop.ratio, stop.color])).toEqual([
    [0, [7, 163, 180]],
    [255, [6, 61, 96]],
    [255, [120, 69, 103]],
  ]);
});

test('background construction, previous visited count and counter produce the source overfill', () => {
  const layer = new BackgroundParticles(() => 0.5);
  expect(layer.particles).toHaveLength(5);
  expect(layer.painted).toHaveLength(0); // constructors create nodes, not bitmap pixels
  layer.advance();
  expect(layer.particles).toHaveLength(20); // previous intLength is0, not current list length5
  expect(layer.painted[0]).toMatchObject({ x: 275, y: 225, z: -0.7, alpha: 136 });
  for (let i = 0; i < 4; i++) layer.advance();
  expect(layer.particles).toHaveLength(20);
  layer.advance(); // counter5
  expect(layer.particles).toHaveLength(21);
  for (let i = 0; i < 5; i++) layer.advance(); // counter10
  expect(layer.particles).toHaveLength(22);
});

test('camera parallax scales by negative particle depth and consumes its shift once', () => {
  const layer = new BackgroundParticles(() => 0.5);
  layer.move(10, -5);
  layer.advance();
  const p = layer.particles[0];
  expect(p.x).toBeCloseTo(275 - 4 / 0.65);
  expect(p.y).toBeCloseTo(225 + 2 / 0.65);
  const x = p.x;
  layer.advance();
  expect(p.x).toBe(x);
});

test('transparent particles paint once, then unlink; bounds never wrap', () => {
  const layer = new BackgroundParticles(() => 0.99);
  layer.advance();
  expect(layer.painted).toHaveLength(20);
  expect(layer.painted.every((p) => p.alpha === 0 && p.dead)).toBe(true);
  expect(layer.particles).toHaveLength(19); // only the marked head is removed at Update end
  layer.advance();
  expect(layer.painted).toHaveLength(10); // next-node unlink skips alternate dead nodes
  const edge = new BackgroundParticles(() => 0.5);
  edge.move(1000, 0);
  edge.advance();
  expect(edge.painted.every((p) => p.x < 0 && p.dead)).toBe(true);
});

test('Main has two identical layers and efficiency freezes their pixels and frame counter', () => {
  const background = new MainBackground(() => 0.5);
  background.advance();
  expect(background.layers[0].painted).toEqual(background.layers[1].painted);
  const previous = background.layers[0].painted;
  background.efficient = true;
  background.advance();
  background.running = true; // ordinary resume cannot override the efficiency latch
  background.advance();
  expect(background.layers[0].painted).toBe(previous);
  expect(background.revision).toBe(1);
  background.efficient = false;
  background.running = false;
  background.advance();
  expect(background.revision).toBe(1);
  background.running = true;
  background.advance();
  expect(background.revision).toBe(2);
});

test('stage runs the background after Main listeners, and movement reports no arrival teleport', () => {
  const stage = new StageRuntime();
  stage.subscribe({
    step: () => {
      expect(stage.background.revision).toBe(0);
      stage.background.move(1, 2);
    },
  });
  stage.advance(20, 50);
  expect(stage.background.revision).toBe(1);
  const world = new World([], [], 123);
  const moves: { x: number; y: number }[] = [];
  world.onCameraMove = (x, y) => moves.push({ x, y });
  world.step({ ...emptyInput(), right: true });
  expect(moves).toEqual([{ x: 0.6, y: 0 }]);
  world.jump({ x: 1, y: 0 });
  while (world.transit) world.step(emptyInput());
  expect(moves.every((p) => Math.abs(p.x) < 100 && Math.abs(p.y) < 100)).toBe(true);
  const count = moves.length;
  world.pause();
  world.step(emptyInput());
  expect(moves).toHaveLength(count);
});

test('source efficiency Off forcibly resumes a paused background, including repeated Off actions', () => {
  const background = new MainBackground(() => 0.5);
  background.stop();
  background.advance();
  expect(background.revision).toBe(0);
  background.efficient = false;
  background.advance();
  expect(background.revision).toBe(1);
  background.efficient = true;
  background.resume();
  background.advance();
  expect(background.revision).toBe(1);
  background.efficient = false;
  background.advance();
  expect(background.revision).toBe(2);
  background.stop();
  background.efficient = false;
  background.advance();
  expect(background.revision).toBe(3);
});
