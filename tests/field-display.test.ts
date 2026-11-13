import { setFieldFixtureLayout } from '../tools/fixtures/field-layout';
import { expect, test } from 'bun:test';
import authored from '../src/game/data/field-display.json';
import original from './fixtures/script-bounds-original.json';
import setterOriginal from './fixtures/field-setters-original.json';
import { RetainedTransform } from '../src/game/core/retained-transform';
import { displayMatrixProduct, type DisplayMatrix } from '../src/game/core/display-transform';
import { scriptTwipBounds } from '../src/game/assets/projectile-bounds';
import {
  FieldDisplays,
  IncompleteFieldGeometryError,
  type FieldInstanceRead,
  type UnderAvatarSizeOperation,
} from '../src/game/simulation/field-display';
import type { Field, TankDesign } from '../src/game/core/types';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { cacheEmptyField } from './fixtures/empty-field';

const field = (tutorial: Field['tutorial'] = 0): Field => ({
  col: 0,
  row: 0,
  scale: 1,
  enemies: [],
  cleared: false,
  boss: false,
  tutorial,
});
function arrive(world: World) {
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(world.transit).toBeNull();
}
const find = (root: FieldInstanceRead, symbol: number): FieldInstanceRead | undefined =>
  root.symbol === symbol ? root : root.children.map((child) => find(child, symbol)).find(Boolean);
const measuredMaskWidth = (matrix: DisplayMatrix) =>
  scriptTwipBounds(
    {
      leafBounds: (id) =>
        id === 1541
          ? {
              x: original.originalLeafTwips.xMin / 20,
              y: original.originalLeafTwips.yMin / 20,
              width: (original.originalLeafTwips.xMax - original.originalLeafTwips.xMin) / 20,
              height: (original.originalLeafTwips.yMax - original.originalLeafTwips.yMin) / 20,
            }
          : undefined,
      displayList: () => [],
      childAge: () => 1,
    },
    1541,
    1,
    matrix,
  )!.width;

test('first wrapper retains every authored slot, root tutorial, mask range and logo/helper identity', () => {
  const world = new World([], [], 3);
  const read = world.fieldDisplays.read(world.currentWrapper);
  expect(read.root.symbol).toBe(1551);
  expect(read.root.parent).toBe('world');
  expect(read.root.children.map((child) => [child.symbol, child.depth])).toEqual([
    [1537, 1],
    [1539, 4],
    [1540, 6],
    [1542, 10],
    [1544, 12],
    [1545, 16],
    [1547, 18],
    [1550, 20],
    [1667, undefined],
  ]);
  expect(read.tutorial).toMatchObject({
    parent: read.root.id,
    sourceFrame: 3,
    stage: 1,
    stopped: true,
  });
  expect(read.slots.underMask.clipDepth).toBe(8);
  expect(read.slots.exteriorMask.clipDepth).toBe(14);
  expect(read.slots.exteriorMask.pose).toMatchObject({
    scaleX: 0.9924774169921875,
    scaleY: 0.9924774169921875,
    rotation: 180,
  });
  expect(read.slots.exteriorMask.pose.matrix).toMatchObject({ tx: -1, ty: -1 });
  expect(find(read.root, 359)!.pose.alpha).toBe(0.078125);
  expect(find(read.root, 1546)).toBeDefined(); // alpha-zero shape is retained, not discarded.
  expect(read.slots.detail.children.map((child) => child.pose.matrix.tx)).toEqual([
    0, 0, 6340, -6340,
  ]);
  expect(read.slots.background.cacheAsBitmap).toBe(1);
  expect(read.bottom.symbol).toBe(117);
  expect(read.bottom.parent).toBe(read.slots.underEffects.id);
  expect(read.bottom.id).not.toBe(read.slots.underEffects.id);
  expect(measuredMaskWidth(read.slots.exteriorMask.pose.matrix)).toBe(1381.4); // original control
});

test('four child writes replace authored scale in qualified pcode order, leaving root and other slots alone', () => {
  const displays = new FieldDisplays(),
    wrapper = field(2);
  displays.create(wrapper);
  const initial = displays.read(wrapper),
    writes: { instance: number; property: string; value: number }[] = [];
  displays.onWrite = (write) => writes.push(write);
  displays.setupChildren(wrapper, 1.25);
  expect(writes).toEqual(
    ['underMask', 'exteriorMask', 'detail', 'background'].flatMap((key) =>
      ['scaleY', 'scaleX'].map((property) => ({
        instance: initial.slots[key as keyof typeof initial.slots].id,
        property,
        value: 1.25,
      })),
    ),
  );
  displays.attach(wrapper, { x: 10.07, y: -20.07 });
  const read = displays.read(wrapper);
  expect(read.root.pose).toMatchObject({ x: 10.05, y: -20.05, scaleX: 1, scaleY: 1 });
  for (const key of ['actors', 'life', 'avatarUnder', 'underEffects'] as const)
    expect(read.slots[key].pose).toMatchObject({ scaleX: 1, scaleY: 1 });
  expect(read.tutorial.parent).toBe(read.slots.actors.id);
  expect(read.tutorial.sourceFrame).toBe(4);
  expect(read.slots.actors.children.map((child) => child.symbol)).toEqual([1546, 1667]);
  expect(measuredMaskWidth(read.slots.exteriorMask.pose.matrix)).toBe(1739.9);
  expect(read.slots.exteriorMask.pose.matrix).toMatchObject({ tx: -1, ty: -1 });
});

test('retained setter matrices reproduce prior original child/root width controls without rounded-width multiplication', () => {
  for (const [scale, width] of [
    [0.5, 696],
    [1, 1391.9],
    [1.25, 1739.9],
    [2, 2783.8],
  ]) {
    const displays = new FieldDisplays(),
      wrapper = field();
    displays.create(wrapper);
    displays.setupChildren(wrapper, scale);
    displays.attach(wrapper, { x: 0, y: 0 });
    expect(measuredMaskWidth(displays.read(wrapper).slots.exteriorMask.pose.matrix)).toBe(width);
  }
  const displays = new FieldDisplays(),
    wrapper = field();
  displays.create(wrapper, true);
  displays.attach(wrapper, { x: 0, y: 0 });
  const mask = displays.read(wrapper).slots.exteriorMask.pose.matrix;
  for (const [scale, width] of [
    [0.5, 690.7],
    [1.25, 1726.8],
    [2, 2762.9],
  ]) {
    const root = new RetainedTransform();
    root.scaleX = scale;
    root.scaleY = scale;
    expect(measuredMaskWidth(displayMatrixProduct(root.read().matrix, mask))).toBe(width);
  }
  expect(1381.4 * 1.25).not.toBe(1726.8);
});

test('ordinary World movement performs separate truncating compound writes and the asymmetric mask latch', () => {
  const world = new World([], [], 4),
    wrapper = world.currentWrapper;
  world.player.velocity = { x: 0.57, y: -0.57 };
  world.step(emptyInput()); // friction produces0.48, then source velocity snap produces0.
  expect(world.fieldDisplays.read(wrapper).root.pose.x).toBe(0);
  const input = emptyInput();
  input.right = true;
  world.step(input);
  let read = world.fieldDisplays.read(wrapper);
  expect(read.root.pose.x).toBe(-0.6);
  expect(read.slots.avatarUnder.pose.x).toBe(0.6);
  expect(read.slots.exteriorMask.pose.rotation).toBe(0);
  expect(world.fieldDisplays.maskLatch).toBe(true);
  world.fieldDisplays.moveCurrent(wrapper, { x: -0.67, y: 0 });
  world.fieldDisplays.updateMasks(wrapper);
  read = world.fieldDisplays.read(wrapper);
  expect(read.root.pose.x).toBe(0.05);
  expect(read.slots.avatarUnder.pose.x).toBe(-0.05);
  expect(read.slots.exteriorMask.pose.rotation).toBe(180);
  expect(read.slots.exteriorMask.pose.matrix).toMatchObject({ tx: -1, ty: -1 });
  expect(world.fieldDisplays.maskLatch).toBe(false);
});

test('new/cached wrappers use fresh identities and tutorial selection; cache does not retain authored slot mutations', () => {
  const world = new World([], [], 8),
    first = world.currentWrapper;
  cacheEmptyField(world);
  world.stats.visited = 1;
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    one = world.fieldDisplays.read(next);
  expect(one.tutorial).toMatchObject({ sourceFrame: 4, stage: 2, parent: one.slots.actors.id });
  expect(one.slots.exteriorMask.pose.scaleX).toBe(1);
  arrive(world);
  const retained = world.fieldDisplays.read(first);
  expect(retained.phase).toBe('detached');
  expect(retained.root.rooted).toBe(false);
  expect(retained.slots.actors.parent).toBe(retained.root.id);
  expect(retained.bottom.parent).toBeNull();
  expect(retained.slots.underEffects.parent).toBe(retained.root.id);
  world.jump({ x: -1, y: 0 });
  const revisit = world.transit!.next,
    two = world.fieldDisplays.read(revisit);
  expect([revisit.col, revisit.row]).toEqual([first.col, first.row]);
  expect(two.root.id).not.toBe(retained.root.id);
  expect(two.slots.exteriorMask.id).not.toBe(retained.slots.exteriorMask.id);
  expect(two.tutorial.id).not.toBe(retained.tutorial.id);
  expect(two.slots.exteriorMask.pose.scaleX).toBe(1);
  expect(retained.slots.exteriorMask.pose.scaleX).toBe(0.9924774169921875);
});

test('superseded wrappers retain their own rooted pose and stage clocks; detached ancestry stops advancing', () => {
  const world = new World([], [], 12),
    first = world.currentWrapper;
  cacheEmptyField(world, 1);
  cacheEmptyField(world, 2);
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  const orphan = world.transit!.next,
    before = world.fieldDisplays.read(orphan);
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  const after = world.fieldDisplays.read(orphan);
  expect(after.phase).toBe('orphaned');
  expect(after.root.rooted).toBe(true);
  expect(after.root.pose).toEqual(before.root.pose);
  expect(after.tutorial.stageUpdates).toBe(before.tutorial.stageUpdates + 1);
  arrive(world);
  const detached = world.fieldDisplays.read(first);
  world.step(emptyInput());
  expect(world.fieldDisplays.read(first)).toMatchObject({
    root: { pose: detached.root.pose, stageUpdates: detached.root.stageUpdates },
    bottom: { rooted: false },
  });
  expect(world.fieldDisplays.read(orphan).root.pose).toEqual(before.root.pose);
});

test('under-avatar sizing captures source detail radius, width-before-height and rejects unresolved geometry', () => {
  const world = new World([], [], 5, undefined, undefined, undefined, () => undefined);
  const tiny: TankDesign = {
    ...STARTER,
    id: 'tiny',
    parts: [{ ...STARTER.parts[0], x: 0, y: 0, radius: 2, scale: 9 }],
  };
  world.editPlayer(tiny);
  const read = world.fieldDisplays.read(world.currentWrapper),
    writes = read.underAvatarSizing.writes.slice(-2);
  expect(world.player.radius).toBe(10); // catalog minimum is deliberately NOT _-ZD.
  expect(writes.map((write) => [write.property, write.value, write.status])).toEqual([
    ['width', 49, 'unresolved'],
    ['height', 49, 'unresolved'],
  ]);
  expect(writes[0].input).toMatchObject({ radius: 2, diameter: 4, requested: 49 });
  expect(writes[0].input.avatar).toBe(world.player);
  tiny.parts[0].radius = 900;
  expect(writes[0].input.details[0].radius).toBe(2);
  expect(writes[0].value).toBe(49);
  expect(read.underAvatarSizing.status).toBe('unresolved');
  expect(() => world.fieldDisplays.requireResolvedGeometry(world.currentWrapper)).toThrow(
    IncompleteFieldGeometryError,
  );
});

test('empty/NaN detail inputs preserve _-ZD initial0 and strict comparison; no protection or minimum radius', () => {
  const world = new World([], [], 5);
  world.editPlayer({ ...STARTER, id: 'empty', parts: [] });
  expect(
    world.fieldDisplays.read(world.currentWrapper).underAvatarSizing.writes.at(-1)!.value,
  ).toBe(45);
  world.editPlayer({
    ...STARTER,
    id: 'nan',
    parts: [
      { ...STARTER.parts[0], x: 3, y: 4, radius: 2 },
      { ...STARTER.parts[0], radius: NaN },
    ],
  });
  expect(
    world.fieldDisplays.read(world.currentWrapper).underAvatarSizing.writes.at(-1)!.value,
  ).toBe(59);
});

test('transit sizes the captured old under-bubble and latest next, then promotion preserves that reference', () => {
  const world = new World([], [], 10),
    first = world.currentWrapper;
  cacheEmptyField(world, 1);
  cacheEmptyField(world, 2);
  world.jump({ x: 1, y: 0 });
  const second = world.transit!.next;
  expect(world.fieldDisplays.read(second).underAvatarSizing.status).toBe('authored');
  world.step(emptyInput());
  const firstWrites = world.fieldDisplays.read(first).underAvatarSizing.writes;
  const secondWrites = world.fieldDisplays.read(second).underAvatarSizing.writes;
  expect(firstWrites.at(-2)!.sequence).toBeLessThan(secondWrites.at(-2)!.sequence);
  expect(secondWrites.map((write) => write.property)).toEqual(['width', 'height']);
  arrive(world);
  const promotedCount = world.fieldDisplays.read(second).underAvatarSizing.writes.length;
  const detachedCount = world.fieldDisplays.read(first).underAvatarSizing.writes.length;
  world.jump({ x: 1, y: 0 });
  const third = world.transit!.next;
  world.step(emptyInput());
  expect(world.fieldDisplays.read(second).underAvatarSizing.writes).toHaveLength(promotedCount);
  expect(world.fieldDisplays.read(first).underAvatarSizing.writes).toHaveLength(detachedCount + 2);
  const retainedRequest = world.fieldDisplays.read(first).underAvatarSizing.writes.at(-1)!;
  expect(retainedRequest.instance).toBe(world.fieldDisplays.read(first).slots.avatarUnder.id);
  expect(retainedRequest.input).toBe(firstWrites[0].input);
  expect(world.fieldDisplays.read(third).underAvatarSizing.writes).toHaveLength(2);
  world.editPlayer({ ...STARTER, id: 'replacement', parts: [] });
  expect(world.fieldDisplays.read(second).underAvatarSizing.writes).toHaveLength(promotedCount + 2);
  expect(world.fieldDisplays.read(third).underAvatarSizing.writes.at(-1)!.value).toBe(45);
});

test('qualified sizing seam executes synchronously and height observes the width result without measuring a changed avatar', () => {
  const operations: UnderAvatarSizeOperation[] = [];
  // Synthetic identity/setter-order control ONLY; this callback is not shipped geometry.
  const world = new World([], [], 5, undefined, undefined, undefined, (operation) => {
    operations.push(operation);
    return {
      qualification: 'qualified',
      scaleX: operation.property === 'width' ? 2 : operation.before.scaleX,
      scaleY: operation.property === 'height' ? 3 : operation.before.scaleY,
    };
  });
  expect(operations.map((operation) => operation.property)).toEqual(['width', 'height']);
  expect(operations[1].before.scaleX).toBe(2);
  expect(operations[1].before.scaleY).toBe(1);
  const read = world.fieldDisplays.read(world.currentWrapper);
  expect(read.slots.avatarUnder.pose).toMatchObject({ scaleX: 2, scaleY: 3 });
  expect(read.underAvatarSizing.status).toBe('qualified');
  expect(() => world.fieldDisplays.requireResolvedGeometry(world.currentWrapper)).not.toThrow();
});

test('collapse changes root and nested bottom separately, preserving four setup children and cached Number arithmetic', () => {
  const world = new World([], [], 7),
    wrapper = world.currentWrapper;
  world.fieldDisplays.moveCurrent(wrapper, { x: 140, y: -70 });
  const before = world.fieldDisplays.read(wrapper),
    writes: string[] = [];
  const avatar = world.fieldDisplays.readAvatar();
  world.fieldDisplays.onWrite = ({ instance, property }) => writes.push(`${instance}:${property}`);
  const applySiblingScale = world.fieldDisplays.onCollapseSiblingScale;
  world.fieldDisplays.onCollapseSiblingScale = (field, sibling, property, value) => {
    applySiblingScale?.(field, sibling, property, value);
    writes.push(`${sibling}:${property}`);
  };
  world.beginCollapse(20);
  world.step(emptyInput());
  const read = world.fieldDisplays.read(wrapper),
    scale = ((1 - 1 / 204) * 100) / 100;
  expect(writes.slice(0, 12)).toEqual([
    `${avatar.id}:scaleX`,
    `${before.bottom.id}:scaleX`,
    'top:scaleX',
    'bullet:scaleX',
    'highlight:scaleX',
    `${before.root.id}:scaleX`,
    `${avatar.id}:scaleY`,
    `${before.bottom.id}:scaleY`,
    'top:scaleY',
    'bullet:scaleY',
    'highlight:scaleY',
    `${before.root.id}:scaleY`,
  ]);
  expect(read.root.pose.scaleX).toBe(scale);
  expect(read.bottom.pose.scaleX).toBe(scale);
  expect(read.slots.underEffects.pose.scaleX).toBe(1);
  expect(read.slots.exteriorMask.pose).toEqual(before.slots.exteriorMask.pose);
  expect(read.collapse).toMatchObject({ change: 1 / 204, frames: 1, active: true });
  const bottomMatrix = displayMatrixProduct(read.root.pose.matrix, read.bottom.pose.matrix);
  expect(bottomMatrix.a).toBe(Math.fround(Math.fround(scale) * Math.fround(scale)));
  expect(bottomMatrix.a).not.toBe(read.root.pose.matrix.a);
  expect(world.fieldDisplays.readAvatar().pose).toMatchObject({ x: -0.65, y: 0.3 });
  for (let i = 1; i < 119; i++) world.step(emptyInput());
  const last = world.fieldDisplays.read(wrapper);
  expect(last.collapse!.frames).toBe(119);
  world.step(emptyInput());
  expect(world.collapse).toBeNull();
  const done = world.fieldDisplays.read(wrapper);
  expect(done.phase).toBe('collapsed');
  expect(done.root.rooted).toBe(true); // alpha0/Destroy is not removeChild.
  expect(done.root.pose.alpha).toBe(0);
  expect(done.collapse!.frames).toBe(119);
  expect(done.collapse!.active).toBe(false);
  expect(world.fieldDisplays.readAvatar().pose).toMatchObject({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
  expect(world.transit).not.toBeNull();
});

test('collapse listener receiver may differ from the current bottom-layer owner', () => {
  const displays = new FieldDisplays(),
    current = field(),
    receiver = field();
  for (const wrapper of [current, receiver]) {
    displays.create(wrapper);
    displays.attach(wrapper, { x: 0, y: 0 });
    displays.attachBottom(wrapper);
  }
  displays.beginCollapse(receiver);
  displays.shrink(receiver, current);
  expect(displays.read(receiver).bottom.pose.scaleX).toBe(1);
  expect(displays.read(current).bottom.pose.scaleX).toBe(displays.read(receiver).root.pose.scaleX);
  expect(displays.read(current).root.pose.scaleX).toBe(1);
});

test('read snapshots never change identity, pose, clocks, entropy or shared authored placements', () => {
  const metadata = JSON.stringify(authored),
    world = new World([], [], 22);
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const wrapper = world.transit!.next,
    before = world.fieldDisplays.read(wrapper);
  let draws = 0;
  world.rng.next = () => {
    draws++;
    throw new Error('query drew RNG');
  };
  for (let i = 0; i < 10; i++) expect(world.fieldDisplays.read(wrapper)).toEqual(before);
  expect(draws).toBe(0);
  expect(JSON.stringify(authored)).toBe(metadata);
  expect(Object.isFrozen(before.slots.exteriorMask.pose.matrix)).toBe(true);
  world.fieldDisplays.setupChildren(wrapper, 2);
  expect(world.fieldDisplays.read(world.currentWrapper).slots.exteriorMask.pose.scaleX).toBe(
    0.9924774169921875,
  );
  expect(before.slots.exteriorMask.pose.scaleX).toBe(1);
  expect(JSON.stringify(authored)).toBe(metadata);
});

// Inputs/expectations below come from the independently retained AVM2 traces.
// Matrix getters expose binary32 coefficients. Decode the original decimal
// formatter back into that declared type (some17-digit prints differ by one
// Number ulp from the exact binary32-to-Number expansion). Cached Number
// comparisons use parsed trace text; they are not original f64 word proofs.
const sourceSetter = (row: number) => {
  const values = setterOriginal.rows
    .find((trace) => trace.startsWith(`BT3_FIELD_POSE ${row} `))!
    .split(' ')
    .slice(2)
    .map(Number);
  return {
    scaleX: values[0],
    scaleY: values[1],
    rotation: values[2],
    x: values[3],
    y: values[4],
    matrix: {
      a: Math.fround(values[7]),
      b: Math.fround(values[8]),
      c: Math.fround(values[9]),
      d: Math.fround(values[10]),
      tx: values[11] * 20,
      ty: values[12] * 20,
    },
  };
};
test('finite cached getters and float32 columns reproduce decoded original decimal controls', () => {
  const authored = { a: 0.9924774169921875, b: 0, c: 0, d: 0.9924774169921875, tx: -1, ty: -1 };
  let pose = new RetainedTransform(authored);
  pose.rotation = 180;
  expect(pose.read()).toMatchObject(sourceSetter(0));
  pose.scaleY = 1.2;
  pose.scaleX = 1.2;
  pose.rotation = 180;
  expect(pose.read()).toMatchObject(sourceSetter(1));
  pose.rotation = 0;
  pose.scaleY = 0.1;
  pose.scaleX = 0.1;
  expect(pose.read()).toMatchObject(sourceSetter(2));
  pose = new RetainedTransform(authored);
  pose.rotation = 180;
  pose.scaleY = 0.3;
  pose.scaleX = 1.2;
  expect(pose.read()).toMatchObject(sourceSetter(3));
});
test('World collapse retains original repeated getter arithmetic through119 updates and position setters read back twips', () => {
  const world = new World([], [], 17),
    field = world.currentWrapper;
  world.beginCollapse(0);
  for (let frame = 1; frame <= 119; frame++) {
    world.step(emptyInput());
    if (![1, 2, 51, 119].includes(frame)) continue;
    const read = world.fieldDisplays.read(field);
    expect(read.root.pose).toMatchObject(sourceSetter(100 + frame));
    expect(read.bottom.pose).toMatchObject(sourceSetter(200 + frame));
  }
  const root = new RetainedTransform();
  for (let i = 0; i < 10; i++) root.x = root.x - 0.07;
  expect(root.read().x).toBe(sourceSetter(400).x);
  // source Number getter is NOT the float32 matrix value or a count-derived scale.
  expect(world.fieldDisplays.read(field).root.pose.scaleX).toBe(0.4166666666666692);
  expect(world.fieldDisplays.read(field).root.pose.scaleX).not.toBe(1 - 119 / 204);
});

test('promotion does not reset the current-mask latch or derive a new rotation just by reading position', () => {
  const displays = new FieldDisplays(),
    old = field(),
    next = field();
  displays.create(old, true);
  displays.attach(old, { x: 0, y: 0 });
  displays.moveCurrent(old, { x: 1, y: 0 });
  displays.updateMasks(old);
  expect(displays.maskLatch).toBe(true);
  displays.create(next);
  displays.attach(next, { x: -10, y: 0 });
  // Conditional immediate arrival before a transit movement/_-Xa call on next.
  displays.arrive(next);
  expect(displays.maskLatch).toBe(true);
  expect(displays.read(next).slots.exteriorMask.pose.rotation).toBe(180);
  displays.moveCurrent(next, { x: -11, y: 0 });
  displays.updateMasks(next);
  expect(displays.maskLatch).toBe(false);
});
