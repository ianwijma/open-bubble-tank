import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AssetPack, type SymbolResult } from '../src/game/assets/asset-pack';
import { SwfClip } from '../src/game/assets/swf-clip';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import {
  displayGeometryBounds,
  displayGeometryHit,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../src/game/core/display-geometry';
import { DISPLAY_IDENTITY, displayMatrixProduct } from '../src/game/core/display-transform';
import original from './fixtures/text-engine-original.json';
import {
  nativeTextGeometryProof,
  textControlKey,
  textControlValues,
} from '../tools/fixtures/native-text-geometry';

const file =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const bounds = { xMin: -331, xMax: 5577, yMin: 15, yMax: 1780 };
function metadataPack(overrides: Record<string, unknown> = {}) {
  const pack = new AssetPack('swf');
  const text = {
    id: 1659,
    bounds: { ...bounds },
    matrix: { ...DISPLAY_IDENTITY, a: 0, d: 0, tx: 99999 },
    records: [],
  };
  const settings = { id: 1659, useFlashType: 1, gridFit: 2, thickness: 0, sharpness: 0 };
  Object.assign(pack, {
    texts: new Map([[1659, text]]),
    symbols: { symbols: { csmTextSettings: [{ ...settings, ...overrides }] } },
  });
  return { pack, text, settings };
}
const group = (child: DisplayGeometryNode): DisplayGeometryNode => ({
  matrix: DISPLAY_IDENTITY,
  content: { kind: 'container', children: [child] },
});
const publicHit = (node: DisplayGeometryNode, onStage = true) =>
  displayGeometryHitTestPoint(
    {
      node,
      onStage,
      parentToStage: DISPLAY_IDENTITY,
      parentAncestry: [DISPLAY_IDENTITY],
      argumentToStage: DISPLAY_IDENTITY,
    },
    { x: -16, y: 80 },
  );

test('native selection requires measured StaticText IDs and actual supported CSM metadata; glyph matrix never changes declared bounds', () => {
  const { pack, text } = metadataPack();
  const node = pack.nativeClipGeometry(new SwfClip(1659, pack));
  expect(node.content).toEqual({ kind: 'advanced-static-text', bounds });
  expect(displayGeometryBounds(node)).toEqual(bounds);
  expect(publicHit(node)).toBe(true);
  text.bounds.xMax = 9999;
  expect(displayGeometryBounds(node)).toEqual(bounds);
  for (const override of [
    { useFlashType: 0 },
    { useFlashType: 2 },
    { useFlashType: 3 },
    { gridFit: 0 },
    { gridFit: 1 },
    { gridFit: 7 },
    { thickness: 1 },
    { sharpness: NaN },
  ]) {
    const { pack: unsupported } = metadataPack(override);
    expect(() => unsupported.nativeClipGeometry(new SwfClip(1659, unsupported))).toThrow(
      'Unsupported native StaticText metadata',
    );
  }
  for (const settings of [undefined, [], [{ id: 1659 }, { id: 1659 }]]) {
    Object.assign(pack, { symbols: { symbols: { csmTextSettings: settings } } });
    expect(() => pack.nativeClipGeometry(new SwfClip(1659, pack))).toThrow(
      'Unsupported native StaticText metadata',
    );
  }
  Object.assign(pack, { texts: new Map([[999, { ...text, id: 999 }]]) });
  expect(() => pack.nativeClipGeometry(new SwfClip(999, pack))).toThrow(
    'Unsupported native StaticText metadata',
  );
  Object.assign(pack, { texts: new Map(), leaves: new Map([[999, { pixels: [255] }]]) });
  expect(() => pack.nativeClipGeometry(new SwfClip(999, pack))).toThrow(
    'Unsupported retained geometry',
  );
});

test('direct text bypasses assigned mask and inverse, while MovieClip wrappers retain both guards and public attachment', () => {
  const { pack } = metadataPack();
  const leaf = pack.nativeClipGeometry(new SwfClip(1659, pack));
  let maskReads = 0;
  const missMask: DisplayGeometryNode = {
    matrix: DISPLAY_IDENTITY,
    content: {
      kind: 'leaf',
      bounds,
      hit: () => {
        maskReads++;
        return false;
      },
    },
  };
  const masked = {
    ...leaf,
    visible: false,
    runtimeMask: { node: missMask, parentToStage: DISPLAY_IDENTITY },
  };
  expect(publicHit(masked)).toBe(true);
  expect(maskReads).toBe(0);
  expect(publicHit({ ...group(leaf), runtimeMask: masked.runtimeMask })).toBe(false);
  expect(maskReads).toBe(1);
  for (const matrix of [
    { ...DISPLAY_IDENTITY, a: 0 },
    { ...DISPLAY_IDENTITY, d: 0 },
    { ...DISPLAY_IDENTITY, a: 0, d: 0 },
  ]) {
    const child = { ...leaf, matrix };
    expect(displayGeometryHit(child, { x: 0, y: 0.75 }, DISPLAY_IDENTITY, [DISPLAY_IDENTITY])).toBe(
      matrix.d !== 0,
    );
    const parent = { ...group(leaf), matrix };
    const point = { x: matrix.a === 0 ? 0 : -16, y: matrix.d === 0 ? 0 : 80 };
    expect(displayGeometryHit(leaf, point, matrix, [matrix, DISPLAY_IDENTITY])).toBe(true);
    expect(displayGeometryHit(parent, point, DISPLAY_IDENTITY, [DISPLAY_IDENTITY])).toBe(false);
  }
  expect(publicHit(leaf, false)).toBe(false);
  expect(
    displayGeometryHitTestPoint(
      {
        node: leaf,
        onStage: false,
        parentToStage: DISPLAY_IDENTITY,
        argumentToStage: DISPLAY_IDENTITY,
      },
      { x: -16, y: 80 },
    ),
  ).toBe(false);
  const main = { ...DISPLAY_IDENTITY, tx: 20000, ty: -10000 };
  const receiver = {
    node: leaf,
    onStage: true,
    parentToStage: main,
    parentAncestry: [main],
    argumentToStage: main,
  };
  expect(displayGeometryHitTestPoint(receiver, { x: -16, y: 80 })).toBe(true);
  expect(displayGeometryHitTestPoint(receiver, { x: 984, y: -420 })).toBe(false);
  expect(displayGeometryHit(leaf, { x: 984, y: -420 }, main, [main])).toBe(true);
});

test('text cannot silently consume a grouped ancestor, authored mask role or scrollRect', () => {
  const { pack } = metadataPack();
  const leaf = pack.nativeClipGeometry(new SwfClip(1659, pack));
  expect(() => displayGeometryHit(leaf, { x: -16, y: 80 })).toThrow('explicit parentAncestry');
  expect(() => publicHit({ ...leaf, isRuntimeMask: true })).toThrow(
    'Unsupported StaticText mask role',
  );
  expect(() => publicHit({ ...leaf, clipDepth: 4 })).toThrow('Unsupported StaticText mask role');
  expect(() => publicHit({ ...leaf, scrollRect: bounds })).toThrow(
    'Unsupported retained geometry scrollRect',
  );
  expect(() =>
    publicHit({
      matrix: DISPLAY_IDENTITY,
      content: {
        kind: 'container',
        children: [
          { ...leaf, depth: 2 },
          { matrix: DISPLAY_IDENTITY, depth: 1, clipDepth: 4, content: { kind: 'empty' } },
        ],
      },
    }),
  ).toThrow('Unsupported authored mask/StaticText');
});

test('explicit ancestry preserves nonassociative twip products through nested containers including Main', () => {
  const { pack } = metadataPack();
  const leaf = {
    ...pack.nativeClipGeometry(new SwfClip(1659, pack)),
    matrix: { ...DISPLAY_IDENTITY, tx: 1 },
  };
  const parent = { ...DISPLAY_IDENTITY, a: 1.5 },
    main = { ...DISPLAY_IDENTITY, a: 1.5 };
  const collapsed = displayMatrixProduct(main, parent);
  // Synthetic seam regression, not an additional original-runtime qualification:
  // bottom-up translation rounds 1 -> 2 -> 3 twips; grouping gives 2 twips.
  const edge = { x: -743 / 20, y: 80 };
  expect(displayGeometryHit(leaf, edge, collapsed, [parent, main])).toBe(false);
  expect(displayGeometryHit(leaf, edge, collapsed, [collapsed])).toBe(true);
  expect(displayGeometryHit(leaf, { ...edge, x: -742 / 20 }, collapsed, [parent, main])).toBe(true);
  const nested = { ...group(leaf), matrix: parent };
  expect(displayGeometryHit(nested, edge, main, [main])).toBe(false);
  expect(displayGeometryHit(nested, { ...edge, x: -742 / 20 }, main, [main])).toBe(true);
  // Existing shape products remain top-down, even in a mixed tree.
  let seenTx: number | undefined;
  const shape: DisplayGeometryNode = {
    ...leaf,
    content: {
      kind: 'leaf',
      bounds,
      hit: (_, __, context) => {
        seenTx = context.toStage.tx;
        return false;
      },
    },
  };
  displayGeometryHit(
    { ...nested, content: { kind: 'container', children: [shape, leaf] } },
    edge,
    main,
    [main],
  );
  expect(seenTx).toBe(2);
});

test('text beyond every authored mask end remains queryable without authorizing masked text', () => {
  const { pack } = metadataPack();
  const text = pack.nativeClipGeometry(new SwfClip(1659, pack));
  const mask: DisplayGeometryNode = {
    matrix: DISPLAY_IDENTITY,
    depth: 4,
    clipDepth: 8,
    content: { kind: 'leaf', bounds, hit: () => false },
  };
  const tree = (depth?: number): DisplayGeometryNode => ({
    matrix: DISPLAY_IDENTITY,
    content: { kind: 'container', children: [mask, { ...text, depth }] },
  });
  // Runtime addChild follows authored depths. Source exact-end admission also
  // means depth8 is outside this mask; neither case assigns a text mask role.
  for (const depth of [8, 20, undefined]) expect(publicHit(tree(depth))).toBe(true);
  expect(() => publicHit(tree(6))).toThrow('Unsupported authored mask/StaticText');
  const hidden = { ...tree(), matrix: { ...DISPLAY_IDENTITY, a: 0 } };
  expect(publicHit(hidden)).toBe(false);
});

test.skipIf(!existsSync(file))(
  'all 1890 applicable frozen contacts pass actual supplied metadata through native provider and public/internal traversal',
  async () => {
    const { bytes } = await decompressSWF(new Uint8Array(readFileSync(file)));
    const symbols = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
    expect(symbols.errors).toEqual([]);
    const pack = new AssetPack('swf');
    Object.assign(pack, {
      symbols,
      texts: new Map(symbols.symbols.texts.map((t) => [t.id, t])),
      sprites: new Map(symbols.symbols.sprites.map((s) => [s.id, s])),
      shapes: new Map(symbols.symbols.shapes.map((s) => [s.id, s])),
    });
    const expected = original.samples.filter(
      (s) => s.role !== 'mask' && s.case !== 'derived-normal',
    );
    const rows = nativeTextGeometryProof(pack)!;
    expect(rows).toHaveLength(1890);
    expect(rows.map(textControlKey)).toEqual(expected.map(textControlKey));
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i],
        value = textControlValues(expected[i]);
      expect({ key: textControlKey(row), hit: Number(row.hit) }).toEqual({
        key: textControlKey(expected[i]),
        hit: value.hit,
      });
      if (row.onStage) expect(row.internalHit).toBe(row.hit);
      expect([row.width, row.height]).toEqual([value.width, value.height]);
    }
    // Real tutorial tree, not a manufactured wrapper or reconstructed age. Owner
    // construction is separate; both repeated reads preserve its actual objects.
    const pose = new SwfClip(1667, pack, () => {
      throw new Error('Unexpected entropy');
    });
    pose.construct();
    // Frame1 contains DefineEditText1655, deliberately outside this advanced
    // StaticText integration; a complete tutorial provider must still reject it.
    expect(() => pack.nativeClipGeometry(pose)).toThrow(
      'Unsupported retained geometry symbol 1655',
    );
    const seen = new Set<number>();
    for (const frame of [3, 4, 5, 6]) {
      // Owner explicitly selects the authored tutorial frame; reads do not infer
      // a frame from age, start a clip, or run its constructor/frame scripts.
      const retained = new SwfClip(1667, pack, () => {
        throw new Error('Unexpected entropy');
      });
      retained.start(frame, false);
      const before = {
        age: retained.age,
        frame: retained.frame,
        placements: structuredClone(retained.placements),
        children: [...retained.children],
      };
      const tree = pack.nativeClipGeometry(retained);
      expect(tree.content.kind).toBe('container');
      if (tree.content.kind !== 'container') throw new Error('Missing tutorial frame');
      for (const child of tree.content.children)
        expect(child.content.kind).toBe('advanced-static-text');
      for (const child of retained.children.values()) seen.add(child.clip.id);
      expect(displayGeometryBounds(tree)).toBeDefined();
      expect(pack.nativeClipGeometry(retained)).toEqual(tree);
      expect({
        age: retained.age,
        frame: retained.frame,
        placements: retained.placements,
        children: [...retained.children],
      }).toEqual(before);
    }
    expect([...seen]).toEqual([1659, 1660, 1661, 1662, 1663, 1664, 1665, 1666]);
  },
);
