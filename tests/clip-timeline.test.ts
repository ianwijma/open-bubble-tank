import { expect, test } from 'bun:test';
import { ClipTimeline, type FrameAction } from '../src/game/assets/clip-timeline';
import scripts from '../src/game/data/timeline-scripts.json';
const actions = scripts as Record<number, Record<number, FrameAction>>;
const advance = (clip: ClipTimeline, count: number, y = 0) => {
  for (let i = 0; i < count; i++) clip.tick(y);
  return clip.frame;
};

test('bubble clips reroll their starting pose on frame 1 and a zero/self jump does not recurse', () => {
  let calls = 0;
  const bubble = new ClipTimeline(40, actions[682], () => [0.9, 0][calls++] ?? 0);
  expect(bubble.tick()).toBe(9);
  expect(advance(bubble, 31)).toBe(40);
  expect(bubble.tick()).toBe(1);
  expect(calls).toBe(2);
  expect(bubble.tick()).toBe(2);
  expect(calls).toBe(2);
});
test('the mirrored cluster branches by its current Y only at its authored frame scripts', () => {
  const below = new ClipTimeline(100, actions[20]);
  expect(below.tick(5)).toBe(51);
  expect(advance(below, 48, 5)).toBe(99);
  expect(below.tick(5)).toBe(51);
  expect(advance(below, 48, -5)).toBe(99); // Changing side does not immediately switch the pose.
  expect(below.tick(-5)).toBe(1);
  expect(advance(below, 48, -5)).toBe(49);
  expect(below.tick(5)).toBe(51); // 50 -> 1 -> 51 runs both destination scripts.
  const above = new ClipTimeline(100, actions[20]);
  expect(above.tick(0)).toBe(1);
  expect(advance(above, 49)).toBe(1);
});
test('the three-branch cluster retains its source rounded distribution and segment boundaries', () => {
  expect(new ClipTimeline(180, actions[2446], () => 0).tick()).toBe(1);
  expect(new ClipTimeline(180, actions[2446], () => 0.5).tick()).toBe(61);
  expect(new ClipTimeline(180, actions[2446], () => 0.9999).tick()).toBe(141);
  let draw = 0;
  const middle = new ClipTimeline(180, actions[2446], () => (draw++ ? 0 : 0.5));
  expect(middle.tick()).toBe(61);
  expect(advance(middle, 78)).toBe(139);
  expect(middle.tick()).toBe(1); // Frame 140 jumps to 1 and chooses a new branch.
  expect(draw).toBe(2);
});
test('long cluster clips use their random starts and actual loop destinations', () => {
  const organic = new ClipTimeline(340, actions[2445], () => 0.5);
  expect(organic.tick()).toBe(30);
  expect(advance(organic, 310)).toBe(340);
  expect(organic.tick()).toBe(30);
  const tentacles = new ClipTimeline(121, actions[2447], () => 0.9999);
  expect(tentacles.tick()).toBe(100);
  expect(advance(tentacles, 20)).toBe(120);
  expect(tentacles.tick()).toBe(2);
  expect(advance(tentacles, 119)).toBe(2);
});
test('stopped effects retain their pose, explicit jumps execute destination scripts, and single-frame clips stay put', () => {
  const charge = new ClipTimeline(27, actions[720]);
  expect(charge.tick()).toBe(1);
  expect(charge.playing).toBe(false);
  expect(advance(charge, 200)).toBe(1);
  expect(charge.goto(2, true)).toBe(2);
  expect(charge.tick()).toBe(3);
  const carrier = new ClipTimeline(2, actions[701]);
  carrier.tick();
  expect(carrier.goto(2, true)).toBe(2);
  expect(carrier.playing).toBe(false);
  let calls = 0;
  const single = new ClipTimeline(
    1,
    { 1: { type: 'random-jump', random: { scale: 10, offsets: [] } } },
    () => {
      calls++;
      return 0;
    },
  );
  advance(single, 100);
  expect(calls).toBe(1);
});
test('all scripted clips reachable from the part catalog have recovered actions', () => {
  const partClips = [
    680, 682, 684, 686, 19, 17, 2187, 2188, 46, 40, 27, 37, 20, 2445, 2446, 2447, 22, 1803, 720, 34,
    42, 695, 701, 2034, 2450,
  ];
  for (const id of partClips) expect(actions[id]).toBeDefined();
  expect(actions[2004]).toBeUndefined(); // The healer spot also has unrelated scripts; it was not partially imported.
});
