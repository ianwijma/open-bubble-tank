import { expect, test } from 'bun:test';
import original from './fixtures/under-avatar-original.json';
import authored from '../src/game/data/field-display.json';
import { positiveAxisAlignedSize } from '../src/game/core/axis-aligned-size';
import { RetainedTransform } from '../src/game/core/retained-transform';
import { displayMatrixRectangle } from '../src/game/core/display-transform';
import { World } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';

const bounds = authored.shapes['1543'];
function words(value: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value);
  return [buffer.readUInt32BE(0), buffer.readUInt32BE(4)];
}
function sample(pose: RetainedTransform, requested: number) {
  const read = pose.read(),
    rectangle = displayMatrixRectangle(read.matrix, bounds);
  return [
    requested,
    (rectangle.xMax - rectangle.xMin) / 20,
    (rectangle.yMax - rectangle.yMin) / 20,
    read.scaleX,
    read.scaleY,
    ...['a', 'b', 'c', 'd', 'tx', 'ty'].map((key) => read.matrix[key as keyof typeof read.matrix]),
  ].map(words);
}

test('all 29 original setter phases match exact binary getters and effective matrix words', () => {
  expect(bounds).toEqual(original.originalLeafTwips);
  let count = 0;
  for (const [index, control] of original.cases.entries()) {
    const pose = new RetainedTransform();
    pose.scaleX = control.scaleX;
    pose.scaleY = control.scaleY;
    const requested =
      'radial' in control && control.radial
        ? (Math.sqrt(control.radial.x * control.radial.x + control.radial.y * control.radial.y) +
            control.radial.radius) *
            2 +
          45
        : control.diameter!;
    for (const phase of original.phases.filter((row) => row.index === index)) {
      if (phase.phase !== 'before') {
        const property = phase.phase.endsWith('width') ? 'width' : 'height';
        const result = positiveAxisAlignedSize(pose.read(), bounds, property, requested);
        expect(result).toBeDefined();
        pose.scaleX = result!.scaleX;
        pose.scaleY = result!.scaleY;
      }
      // Frozen words come from original ByteArray snapshots, not this implementation.
      expect(sample(pose, requested), `${index}/${phase.phase}`).toEqual(phase.words);
      count++;
    }
  }
  expect(count).toBe(29);
});

test('unsupported rotation, reflection, skew and invalid sizing stay unqualified', () => {
  const pose = new RetainedTransform();
  for (const value of [0, -1, NaN, Infinity])
    expect(positiveAxisAlignedSize(pose.read(), bounds, 'width', value)).toBeUndefined();
  pose.rotation = 30;
  expect(positiveAxisAlignedSize(pose.read(), bounds, 'width', 73.1)).toBeUndefined();
  pose.rotation = 0;
  pose.scaleX = -1;
  expect(positiveAxisAlignedSize(pose.read(), bounds, 'width', 73.1)).toBeUndefined();
  const skew = new RetainedTransform({ a: 1, b: 0, c: 0.5, d: 1, tx: 0, ty: 0 });
  expect(positiveAxisAlignedSize(skew.read(), bounds, 'height', 73.1)).toBeUndefined();
});

test('normal World binds sizing before its first request and retains exact metadata input', () => {
  const world = new World([], [], 5);
  world.editPlayer({
    ...STARTER,
    id: 'radial-size',
    parts: [{ ...STARTER.parts[0], x: 13, y: 7, radius: 10 }],
  });
  const before = world.fieldDisplays.read(world.currentWrapper);
  expect(before.underAvatarSizing.status).toBe('qualified');
  expect(() => world.fieldDisplays.requireResolvedGeometry(world.currentWrapper)).not.toThrow();
  const expected = original.phases.find((row) => row.index === 6 && row.phase === 'height')!;
  const read = before.slots.avatarUnder.pose;
  expect(words(read.scaleX)).toEqual(expected.words[3]);
  expect(words(read.scaleY)).toEqual(expected.words[4]);
  expect(words(read.matrix.a)).toEqual(expected.words[5]);
  expect(words(read.matrix.c)).toEqual(expected.words[7]);
  expect(world.fieldDisplays.read(world.currentWrapper)).toEqual(before);
});
