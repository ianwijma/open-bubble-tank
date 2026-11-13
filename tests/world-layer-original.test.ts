import { expect, test } from 'bun:test';
import original from './fixtures/world-layer-original.json';
import { World, emptyInput } from '../src/game/simulation/world';
import { displayMatrixPoint, displayMatrixProduct } from '../src/game/core/display-transform';
import {
  avatarTransform,
  bottomTransform,
  fieldPoint,
  fieldTransform,
  worldLayerTransform,
} from '../src/game/render/field-transform';

/** Decode the original ByteArray words, without decimal round trips or native-generated expectations. */
function measured(phase: string, age: number, role: string, key: string) {
  const row = original.samples.find((s) => s.phase === phase && s.age === age && s.role === role)!;
  const words = row.words[original.fields.indexOf(key)];
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}

for (const age of [0, 1, 2, 51, 119])
  test(`retained collapse age ${age} matches original method getter words and quantized Points`, () => {
    const world = new World([], [], 4),
      field = world.currentWrapper;
    world.fieldDisplays.moveCurrent(field, { x: 140, y: -70 });
    world.fieldDisplays.setupChildren(field, 1.4);
    world.worldDisplays.follow(field);
    // Declared original setup selects the non-first highlight at wave scale1.4.
    world.worldDisplays.setCollapseScale(field, 'highlight', 'scaleY', 1.4);
    world.worldDisplays.setCollapseScale(field, 'highlight', 'scaleX', 1.4);
    world.beginCollapse(0);
    for (let i = 0; i < age; i++) world.step(emptyInput());
    const read = world.fieldDisplays.read(field);
    const avatar = world.fieldDisplays.readAvatar().pose;
    const entries = [
      [
        'root',
        read.root.pose,
        world.worldDisplays.fieldMatrix(field, { x: 0, y: 0 }),
        fieldTransform(world, field),
      ],
      [
        'bottom',
        read.bottom.pose,
        world.worldDisplays.bottomMatrix(field, { x: 0, y: 0 }),
        bottomTransform(world, field),
      ],
      ...(['top', 'bullet', 'highlight'] as const).map(
        (kind) =>
          [
            kind,
            world.worldDisplays.read(field, kind).pose,
            world.worldDisplays.layerMatrix(field, kind, { x: 0, y: 0 }),
            worldLayerTransform(world, field, kind),
          ] as const,
      ),
      [
        'avatar',
        avatar,
        displayMatrixProduct(world.worldDisplays.worldMatrix({ x: 0, y: 0 }), avatar.matrix),
        avatarTransform(world),
      ],
    ] as const;
    for (const [role, pose, matrix, paint] of entries) {
      for (const key of ['scaleX', 'scaleY', 'x', 'y', 'alpha'] as const)
        expect(pose[key], `${role}.${key}`).toBe(measured('collapse', age, role, key));
      for (const key of ['a', 'd', 'tx', 'ty'] as const)
        expect(
          key === 'tx' || key === 'ty' ? pose.matrix[key] / 20 : pose.matrix[key],
          `${role}.own.${key}`,
        ).toBe(measured('collapse', age, role, `own.${key}`));
      for (const [label, input] of [
        ['point0', { x: 0, y: 0 }],
        ['point100x40', { x: 100, y: 40 }],
      ] as const) {
        const point = displayMatrixPoint(matrix, { x: input.x * 20, y: input.y * 20 });
        const projected = fieldPoint(input, paint);
        for (const axis of ['x', 'y'] as const) {
          const expected = measured('collapse', age, role, `${label}.${axis}`);
          expect(point[axis] / 20, `${role}.${label}.${axis}`).toBe(expected);
          expect(
            projected[axis] + (axis === 'x' ? 275 : 225),
            `${role}.paint.${label}.${axis}`,
          ).toBe(expected);
        }
      }
    }
  });

test('fractional Main remains a separate ancestor and finish resets the avatar without a 120th shrink', () => {
  const world = new World([], [], 4),
    field = world.currentWrapper;
  world.fieldDisplays.moveCurrent(field, { x: 140, y: -70 });
  world.worldDisplays.follow(field);
  world.beginCollapse(0);
  for (let i = 0; i < 119; i++) world.step(emptyInput());
  const avatar = world.fieldDisplays.readAvatar().pose;
  const matrix = displayMatrixProduct(
    world.worldDisplays.worldMatrix({ x: 0.07, y: -0.07 }),
    avatar.matrix,
  );
  const origin = displayMatrixPoint(matrix, { x: 0, y: 0 });
  expect(origin.x / 20).toBe(measured('main-fraction', 119, 'avatar', 'point0.x'));
  expect(origin.y / 20).toBe(measured('main-fraction', 119, 'avatar', 'point0.y'));
  world.step(emptyInput());
  const finished = world.fieldDisplays.readAvatar().pose;
  for (const key of ['x', 'y', 'scaleX', 'scaleY', 'alpha'] as const)
    expect(finished[key]).toBe(measured('finish-glue', 120, 'avatar', key));
  const root = world.fieldDisplays.read(field).root.pose;
  for (const key of ['scaleX', 'scaleY', 'alpha'] as const)
    expect(root[key]).toBe(measured('finish-glue', 120, 'root', key));
});
