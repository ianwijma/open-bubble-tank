import original from '../../tests/fixtures/field-mask-original.json';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { SwfClip } from '../../src/game/assets/swf-clip';
import {
  displayGeometryBounds,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../../src/game/core/display-geometry';
import { DISPLAY_IDENTITY } from '../../src/game/core/display-transform';

type Sample = (typeof original.samples)[number];
function value(sample: Sample, field: string) {
  const index = original.fields.indexOf(field),
    words = original.binaryWords[sample.wordIndices[index]],
    bytes = new DataView(new ArrayBuffer(8));
  if (index < 0 || !words) throw new Error('Missing original field ' + field);
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}
const sample = (label: string, phase: string, role: string) => {
  const row = original.samples.find(
    (s) => s.case === label && s.phase === phase && s.role === role,
  );
  if (!row) throw new Error(`Missing original control ${label}/${phase}/${role}`);
  return row;
};

/** The outer project controls copy the independently parsed wrapper placements.
 * Their leaves use actual supplied vectors through the new native adapter.
 * This does not claim a complete native field provider or public root mapping.
 */
export function nativeMaskGeometryProof(pack: AssetPack) {
  if (pack.mode !== 'swf') return null;
  const leaf = (id: number) => {
    const pose = new SwfClip(id, pack);
    pose.start();
    return pack.nativeClipGeometry(pose);
  };
  const authored = (wrapper: (typeof original.wrappers)[number]): DisplayGeometryNode => ({
    matrix: DISPLAY_IDENTITY,
    content: {
      kind: 'container',
      children: wrapper.children.map((child) => {
        const nested = original.wrappers.find((w) => w.id === child.symbol);
        return {
          ...(nested ? authored(nested) : leaf(child.symbol)),
          matrix: { ...DISPLAY_IDENTITY, tx: child.x * 20 },
          depth: child.depth,
          clipDepth: child.clipDepth ?? undefined,
        };
      }),
    },
  });
  const rows: {
    case: string;
    phase: string;
    role: string;
    hit: boolean;
    width: number;
    height: number;
  }[] = [];
  const record = (node: DisplayGeometryNode, row: Sample) => {
    const bounds = displayGeometryBounds(node);
    rows.push({
      case: row.case,
      phase: row.phase,
      role: row.role,
      hit: displayGeometryHitTestPoint(
        {
          node,
          onStage: value(row, 'parentId') !== 0,
          parentToStage: DISPLAY_IDENTITY,
          argumentToStage: DISPLAY_IDENTITY,
        },
        { x: value(row, 'point.x'), y: value(row, 'point.y') },
      ),
      width: bounds ? (bounds.xMax - bounds.xMin) / 20 : 0,
      height: bounds ? (bounds.yMax - bounds.yMin) / 20 : 0,
    });
  };
  for (const wrapper of original.wrappers.filter(
    (w) => !['runtime', 'visibility'].includes(w.label),
  ))
    record(authored(wrapper), sample(wrapper.label, 'baseline', 'wrapper'));
  const visibility = original.wrappers.find((w) => w.label === 'visibility')!;
  for (const phase of [
    'baseline',
    'mask-hidden',
    'mask-alpha0',
    'target-hidden',
    'target-alpha0',
  ]) {
    const node = authored(visibility);
    if (node.content.kind !== 'container') throw new Error('Missing wrapper');
    const children = node.content.children.map((child, i) => ({
      ...child,
      visible: value(sample('visibility', phase, i === 0 ? 'm1' : 'target'), 'visible') === 1,
    }));
    record(
      { ...node, content: { kind: 'container', children } },
      sample('visibility', phase, 'wrapper'),
    );
  }
  for (const phase of [
    ...new Set(original.samples.filter((s) => s.case === 'runtime').map((s) => s.phase)),
  ]) {
    const m = sample('runtime', phase, 'm1'),
      t = sample('runtime', phase, 'target'),
      mask: DisplayGeometryNode = {
        ...leaf(1539),
        matrix: { ...DISPLAY_IDENTITY, tx: value(m, 'x') * 20, ty: value(m, 'y') * 20 },
        visible: value(m, 'visible') === 1,
        isRuntimeMask: value(t, 'maskId') === 4,
      },
      target: DisplayGeometryNode = {
        ...leaf(1544),
        matrix: { ...DISPLAY_IDENTITY, tx: value(t, 'x') * 20, ty: value(t, 'y') * 20 },
        runtimeMask:
          value(t, 'maskId') === 4 ? { node: mask, parentToStage: DISPLAY_IDENTITY } : undefined,
      },
      wrapper: DisplayGeometryNode = {
        matrix: DISPLAY_IDENTITY,
        content: {
          kind: 'container',
          children: [mask, target].filter((_, i) => value(i === 0 ? m : t, 'parentId') === 2),
        },
      };
    record(wrapper, sample('runtime', phase, 'wrapper'));
    record(target, t);
    record(mask, m);
    if (phase === 'different-parent')
      record(
        { matrix: DISPLAY_IDENTITY, content: { kind: 'container', children: [mask] } },
        sample('runtime', phase, 'holder'),
      );
  }
  return rows;
}
