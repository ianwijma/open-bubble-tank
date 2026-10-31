import { expect, test } from 'bun:test';
import { BackgroundParticles, MainBackground } from '../src/game/core/main-background';
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

test('particle construction preserves draw order, duplicate BB alpha and insertion after the head', () => {
  const draws = [
    0, 0.75, 0, 0.1, 0.2, 0.3, 0.5, 0.5, 0.25, 0.2, 0.3, 0.4, 0.5, 0.5, 0.31, 0.3, 0.4, 0.5, 0.5,
    0.5, 0.99, 0.4, 0.5, 0.6, 0.5, 0.5, 0.5, 0.5, 0.6, 0.7,
  ];
  let cursor = 0;
  const layer = new BackgroundParticles(() => draws[cursor++]);
  expect(cursor).toBe(30);
  expect(layer.particles[0]).toMatchObject({
    vx: -0.25,
    vy: 0.125,
    x: 55,
    y: 90,
    z: -0.5,
    alpha: 255,
  });
  expect(layer.particles.map((p) => p.x)).toEqual([55, 275, 220, 165, 110]);
  expect(layer.particles.map((p) => p.alpha)).toEqual([255, 136, 0, 187, 187]);
});

test('dead-next unlink precedes random pruning and consumes no pruning draw for that node', () => {
  let calls = 0;
  const layer = new BackgroundParticles(() => {
    calls++;
    return 0.5;
  });
  layer.advance();
  layer.advance();
  const removed = layer.particles[1],
    before = calls;
  removed.dead = true;
  layer.advance(); // counter2:19 visited nodes,18 next checks, one already dead
  expect(layer.particles).not.toContain(removed);
  expect(layer.painted).toHaveLength(19);
  expect(calls - before).toBe(17);
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
