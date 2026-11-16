/** Candidate only: consumes already frozen words. Never produces an oracle. */
import original from '../fixtures/world-motion-original.json';
import { World, emptyInput } from '../../src/game/simulation/world';
import {
  displayMatrixPoint,
  displayMatrixProduct,
  inverseDisplayMatrix,
  type DisplayMatrix,
} from '../../src/game/core/display-transform';
import type { Vec } from '../../src/game/core/types';

type Row = (typeof original.samples)[number];
export function values(row: Row): Record<string, number> {
  return Object.fromEntries(
    row.words.map(([hi, lo], i) => {
      const bytes = new DataView(new ArrayBuffer(8));
      bytes.setUint32(0, hi);
      bytes.setUint32(4, lo);
      return [original.fields[i], bytes.getFloat64(0)];
    }),
  );
}
export function measured(phase: string, age: number, role: string) {
  const row = original.samples.find((s) => s.phase === phase && s.age === age && s.role === role);
  if (!row) throw new Error(`Missing original ${phase}/${age}/${role}`);
  return values(row);
}
const own = (v: Record<string, number>): DisplayMatrix => ({
  a: v['own.a'],
  b: v['own.b'],
  c: v['own.c'],
  d: v['own.d'],
  tx: v['own.tx'] * 20,
  ty: v['own.ty'] * 20,
});
const project = (matrix: DisplayMatrix, p: Vec): Vec => {
  const result = displayMatrixPoint(matrix, { x: (p.x * 20) | 0, y: (p.y * 20) | 0 });
  return { x: result.x / 20, y: result.y / 20 };
};
export function pointComparison(row: Row) {
  const v = values(row),
    find = (role: string) => own(measured(row.phase, row.age, role));
  const main = find('main'),
    world = displayMatrixProduct(main, find('world'));
  const root = displayMatrixProduct(world, find(row.role === 'nextMask' ? 'nextRoot' : 'root'));
  let matrix: DisplayMatrix;
  if (row.role === 'main') matrix = main;
  else if (row.role === 'world') matrix = world;
  else if (['avatarUnder', 'under', 'currentMask', 'nextMask'].includes(row.role))
    matrix = displayMatrixProduct(root, own(v));
  else if (row.role === 'bottom')
    matrix = displayMatrixProduct(displayMatrixProduct(root, find('under')), own(v));
  else matrix = displayMatrixProduct(world, own(v));
  const inverse = inverseDisplayMatrix(matrix);
  if (!inverse) throw new Error('Unexpected singular finite control');
  return {
    phase: row.phase,
    age: row.age,
    role: row.role,
    actual: {
      point0: { x: v['point0.x'], y: v['point0.y'] },
      point100x40: { x: v['point100x40.x'], y: v['point100x40.y'] },
      stage: { x: v['stage.x'], y: v['stage.y'] },
      local: { x: v['local.x'], y: v['local.y'] },
    },
    candidate: {
      point0: project(matrix, { x: 0, y: 0 }),
      point100x40: project(matrix, { x: 100, y: 40 }),
      stage: project(world, { x: v['position.x'], y: v['position.y'] }),
      local: project(inverse, { x: v['stage.x'], y: v['stage.y'] }),
    },
  };
}
export const directions = ['right', 'down', 'both', 'negative'] as const;
interface CameraSnapshot {
  phase: string;
  age: number;
  root: Vec;
  avatarUnder: Vec;
  avatar: Vec;
  top: Vec;
  bullet: Vec;
  highlight: Vec;
  bridge: Vec;
  point: Vec;
  velocity: Vec;
  mask: number;
  rootGlobal: Vec;
}
export function publicSequence(phase: (typeof directions)[number]) {
  const world = new World([], [], 4),
    field = world.currentWrapper;
  const snapshots: CameraSnapshot[] = [];
  const snapshot = (label: string, age: number) => {
    const read = world.fieldDisplays.read(field),
      avatar = world.fieldDisplays.readAvatar().pose;
    snapshots.push({
      phase: label,
      age,
      root: { x: read.root.pose.x, y: read.root.pose.y },
      avatarUnder: { x: read.slots.avatarUnder.pose.x, y: read.slots.avatarUnder.pose.y },
      avatar: { x: avatar.x, y: avatar.y },
      top: world.worldDisplays.read(field, 'top').pose,
      bullet: world.worldDisplays.read(field, 'bullet').pose,
      highlight: world.worldDisplays.read(field, 'highlight').pose,
      bridge: { x: world.player.x, y: world.player.y },
      point: world.actorParents.point(world.player, field)!,
      velocity: { ...world.player.velocity },
      mask: read.slots.exteriorMask.pose.rotation,
      rootGlobal: world.actorParents.fieldGlobal({ x: 100, y: 40 }, field)!,
    });
  };
  for (let age = 1; age <= 40; age++) {
    const input = emptyInput();
    if (age <= 10) {
      input.right = phase === 'right' || phase === 'both';
      input.down = phase === 'down' || phase === 'both';
      input.left = input.up = phase === 'negative';
    }
    world.step(input);
    if ([1, 2, 10, 20, 40].includes(age)) snapshot(phase, age);
  }
  world.mainEffects.position = { x: 0.07, y: -0.07 };
  snapshot(phase + '-fraction', 40);
  if (phase === 'both') {
    const origin = world.actorParents.point(world.player, field)!;
    world.adjustBubblefieldObjects({ x: 250.079 - origin.x, y: -100.149 - origin.y });
    snapshot('teleport', 41);
  }
  return snapshots;
}
