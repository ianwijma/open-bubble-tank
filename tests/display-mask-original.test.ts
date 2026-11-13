import { expect, test } from 'bun:test';
import original from './fixtures/field-mask-original.json';
import {
  displayGeometryBounds,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../src/game/core/display-geometry';
import { DISPLAY_IDENTITY } from '../src/game/core/display-transform';

type Sample = (typeof original.samples)[number];
type Wrapper = (typeof original.wrappers)[number];
function value(sample: Sample, field: string) {
  const index = original.fields.indexOf(field),
    words = original.binaryWords[sample.wordIndices[index]],
    bytes = new DataView(new ArrayBuffer(8));
  if (index < 0 || !words) throw new Error('Missing frozen field ' + field);
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}
const sample = (label: string, phase: string, role: string) => {
  const found = original.samples.find(
    (s) => s.case === label && s.phase === phase && s.role === role,
  );
  if (!found) throw new Error(`Missing original ${label}/${phase}/${role}`);
  return found;
};

/** Control-local geometry only: independently verified original centres hit and
 * their1000px displacement misses. Reject every other Point rather than using a
 * rectangular/circular approximation of the original contours.
 */
function controlLeaf(symbol: number): DisplayGeometryNode {
  const radius = symbol === 1539 ? 8475 : symbol === 1544 ? 1010 : undefined;
  if (radius === undefined) throw new Error('Unknown control leaf ' + symbol);
  return {
    matrix: DISPLAY_IDENTITY,
    content: {
      kind: 'leaf',
      bounds: { xMin: -radius, yMin: -radius, xMax: radius, yMax: radius },
      hit: ({ x, y }) => {
        if (x === 0 && y === 0) return true;
        if (Math.abs(x) === 1000 && y === 0) return false;
        throw new Error(`Unqualified contour Point ${x}/${y}`);
      },
    },
  };
}
function authored(wrapper: Wrapper): DisplayGeometryNode {
  return {
    matrix: DISPLAY_IDENTITY,
    content: {
      kind: 'container',
      children: wrapper.children.map((child) => {
        const nested = original.wrappers.find((w) => w.id === child.symbol),
          geometry = nested ? authored(nested) : controlLeaf(child.symbol);
        return {
          ...geometry,
          matrix: { ...DISPLAY_IDENTITY, tx: child.x * 20 },
          depth: child.depth,
          clipDepth: child.clipDepth ?? undefined,
        };
      }),
    },
  };
}
const query = (node: DisplayGeometryNode, row: Sample) =>
  displayGeometryHitTestPoint(
    {
      node,
      onStage: value(row, 'parentId') !== 0,
      parentToStage: DISPLAY_IDENTITY,
      argumentToStage: DISPLAY_IDENTITY,
    },
    { x: value(row, 'point.x'), y: value(row, 'point.y') },
  );
const dimensions = (node: DisplayGeometryNode) => {
  const b = displayGeometryBounds(node);
  return b ? [(b.xMax - b.xMin) / 20, (b.yMax - b.yMin) / 20] : [0, 0];
};

test('depth-latch traversal matches the independent original overlap/end/nested controls and declared Script bounds', () => {
  for (const wrapper of original.wrappers.filter(
    (w) => !['runtime', 'visibility'].includes(w.label),
  )) {
    const node = authored(wrapper),
      row = sample(wrapper.label, 'baseline', 'wrapper');
    expect(Number(query(node, row))).toBe(value(row, 'hit'));
    expect(dimensions(node)).toEqual([value(row, 'width'), value(row, 'height')]);
  }
});

test('authored visibility follows original hidden-mask versus hidden-target controls', () => {
  const wrapper = original.wrappers.find((w) => w.label === 'visibility')!;
  for (const phase of [
    'baseline',
    'mask-hidden',
    'mask-alpha0',
    'target-hidden',
    'target-alpha0',
  ]) {
    const node = authored(wrapper);
    if (node.content.kind !== 'container') throw new Error('Missing wrapper');
    const children = node.content.children.map((child, i) => ({
      ...child,
      visible: value(sample('visibility', phase, i === 0 ? 'm1' : 'target'), 'visible') === 1,
    }));
    const current = { ...node, content: { kind: 'container' as const, children } },
      row = sample('visibility', phase, 'wrapper');
    expect(Number(query(current, row))).toBe(value(row, 'hit'));
    expect(dimensions(current)).toEqual([value(row, 'width'), value(row, 'height')]);
  }
});

test('runtime reference masks reproduce every measured assignment/reparent/removal phase', () => {
  const phases = [
    ...new Set(original.samples.filter((s) => s.case === 'runtime').map((s) => s.phase)),
  ];
  for (const phase of phases) {
    const m = sample('runtime', phase, 'm1'),
      t = sample('runtime', phase, 'target'),
      w = sample('runtime', phase, 'wrapper'),
      mask: DisplayGeometryNode = {
        ...controlLeaf(1539),
        matrix: { ...DISPLAY_IDENTITY, tx: value(m, 'x') * 20, ty: value(m, 'y') * 20 },
        visible: value(m, 'visible') === 1,
        isRuntimeMask: value(t, 'maskId') === 4,
      },
      target: DisplayGeometryNode = {
        ...controlLeaf(1544),
        matrix: { ...DISPLAY_IDENTITY, tx: value(t, 'x') * 20, ty: value(t, 'y') * 20 },
        runtimeMask:
          value(t, 'maskId') === 4 ? { node: mask, parentToStage: DISPLAY_IDENTITY } : undefined,
      },
      physical = [mask, target].filter((_, i) => value(i === 0 ? m : t, 'parentId') === 2),
      wrapper: DisplayGeometryNode = {
        matrix: DISPLAY_IDENTITY,
        content: { kind: 'container', children: physical },
      };
    for (const [node, row] of [
      [wrapper, w],
      [target, t],
      [mask, m],
    ] as const) {
      expect(Number(query(node, row))).toBe(value(row, 'hit'));
      expect(dimensions(node)).toEqual([value(row, 'width'), value(row, 'height')]);
    }
    if (phase === 'different-parent') {
      const holder = sample('runtime', phase, 'holder'),
        node: DisplayGeometryNode = {
          matrix: DISPLAY_IDENTITY,
          content: { kind: 'container', children: [mask] },
        };
      expect(Number(query(node, holder))).toBe(value(holder, 'hit'));
      expect(dimensions(node)).toEqual([value(holder, 'width'), value(holder, 'height')]);
    }
  }
});
