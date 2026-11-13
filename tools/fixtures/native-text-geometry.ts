import original from '../../tests/fixtures/text-engine-original.json' with { type: 'json' };
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { SwfClip } from '../../src/game/assets/swf-clip';
import {
  displayGeometryBounds,
  displayGeometryHit,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../../src/game/core/display-geometry';
import {
  DISPLAY_IDENTITY,
  displayMatrixProduct,
  type DisplayMatrix,
} from '../../src/game/core/display-transform';

export const textControlKey = (row: {
  case: string;
  phase: string;
  role: string;
  point: string;
  space: string;
}) => [row.case, row.phase, row.role, row.point, row.space].join('/');

export function textControlValues(row: (typeof original.samples)[number]) {
  return Object.fromEntries(
    row.wordIndices.map((index, i) => {
      const words = original.binaryWords[index],
        bytes = new DataView(new ArrayBuffer(8));
      bytes.setUint32(0, words[0]);
      bytes.setUint32(4, words[1]);
      return [original.fields[i], bytes.getFloat64(0)];
    }),
  );
}

/** Reconstruction against frozen builtin results, never an original-runtime
 * capture. Project one-leaf wrappers use their measured actual own matrices;
 * native leaf definitions/settings come from the supplied AssetPack. The derived
 * advanced copy has the identical original1659 rectangle/CSM/glyph body, so it
 * deliberately exercises that same native definition, not a new production ID.
 */
export function nativeTextGeometryProof(pack: AssetPack) {
  if (pack.mode !== 'swf') return null;
  const rows = new Map(
    original.samples.map((row) => [textControlKey(row), textControlValues(row)]),
  );
  const leaves = new Map(
    Array.from({ length: 8 }, (_, i) => {
      const id = 1659 + i;
      return [id, pack.nativeClipGeometry(new SwfClip(id, pack))] as const;
    }),
  );
  const maskPose = new SwfClip(1539, pack);
  maskPose.construct();
  const maskGeometry = pack.nativeClipGeometry(maskPose);
  return original.samples
    .filter((s) => s.role !== 'mask' && s.case !== 'derived-normal')
    .map((row) => {
      const v = rows.get(textControlKey(row))!;
      const peer = (role: string) => rows.get(textControlKey({ ...row, role }));
      const targetValues = peer('target')!,
        wrapperValues = peer('wrapper')!,
        maskValues = peer('mask');
      const matrix = (prefix: string): DisplayMatrix => ({
        a: v[prefix + '.a'],
        b: v[prefix + '.b'],
        c: v[prefix + '.c'],
        d: v[prefix + '.d'],
        tx: v[prefix + '.tx'] * 20,
        ty: v[prefix + '.ty'] * 20,
      });
      const wrapperOwn = matrix('wrapperOwn');
      const mask: DisplayGeometryNode = {
        ...maskGeometry,
        matrix: {
          ...DISPLAY_IDENTITY,
          tx: (maskValues?.x ?? 0) * 20,
          ty: (maskValues?.y ?? 0) * 20,
        },
        visible: maskValues?.visible !== 0,
        isRuntimeMask: targetValues.maskId === 4,
      };
      const id = row.case === 'derived-advanced' ? 1659 : Number(row.case.split('-')[1]);
      const target: DisplayGeometryNode = {
        ...leaves.get(id)!,
        matrix: matrix('targetOwn'),
        visible: targetValues.visible === 1,
        runtimeMask:
          targetValues.maskId === 4
            ? {
                node: mask,
                parentToStage: wrapperOwn,
                parentAncestry: [wrapperOwn, DISPLAY_IDENTITY],
              }
            : undefined,
      };
      const wrapper: DisplayGeometryNode = {
        matrix: wrapperOwn,
        visible: wrapperValues.visible === 1,
        content: {
          kind: 'container',
          children: [
            ...(targetValues.parentId === 2 ? [target] : []),
            ...(maskValues?.parentId === 2 ? [mask] : []),
          ],
        },
      };
      const node = row.role === 'wrapper' ? wrapper : target;
      const parentAncestry =
        row.role === 'wrapper' ? [DISPLAY_IDENTITY] : [wrapperOwn, DISPLAY_IDENTITY];
      const parentToStage =
        row.role === 'wrapper'
          ? DISPLAY_IDENTITY
          : displayMatrixProduct(DISPLAY_IDENTITY, wrapperOwn);
      const argument = { x: v['point.x'], y: v['point.y'] };
      const onStage = v.parentId !== 0 && row.phase !== 'wrapper-detached';
      const bounds = displayGeometryBounds(node);
      return {
        case: row.case,
        phase: row.phase,
        role: row.role,
        point: row.point,
        space: row.space,
        hit: displayGeometryHitTestPoint(
          { node, onStage, parentToStage, parentAncestry, argumentToStage: DISPLAY_IDENTITY },
          argument,
        ),
        // Off-stage public rejection is separate from the internal stage gate.
        internalHit: displayGeometryHit(node, argument, parentToStage, parentAncestry),
        onStage,
        width: bounds ? (bounds.xMax - bounds.xMin) / 20 : 0,
        height: bounds ? (bounds.yMax - bounds.yMin) / 20 : 0,
      };
    });
}
