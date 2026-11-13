import original from '../../tests/fixtures/root-query-original.json';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { SwfClip } from '../../src/game/assets/swf-clip';
import {
  displayGeometryBounds,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../../src/game/core/display-geometry';
import { displayMatrixProduct, type DisplayMatrix } from '../../src/game/core/display-transform';

export function nativeRootGeometryProof(pack: AssetPack) {
  if (pack.mode !== 'swf') return null;
  const pose = new SwfClip(1544, pack);
  pose.start();
  const targetGeometry = pack.nativeClipGeometry(pose);
  return original.samples.map((row) => {
    const value = (field: string) => {
      const i = original.fields.indexOf(field);
      if (i < 0) throw new Error('Missing root query field ' + field);
      const words = original.binaryWords[row.wordIndices[i]],
        view = new DataView(new ArrayBuffer(8));
      view.setUint32(0, words[0]);
      view.setUint32(4, words[1]);
      return view.getFloat64(0);
    };
    const matrix = (prefix: string): DisplayMatrix => ({
      a: value(prefix + '.a'),
      b: value(prefix + '.b'),
      c: value(prefix + '.c'),
      d: value(prefix + '.d'),
      tx: value(prefix + '.tx') * 20,
      ty: value(prefix + '.ty') * 20,
    });
    const main = matrix('mainOwn'),
      node: DisplayGeometryNode =
        row.role === 'wrapper'
          ? { matrix: matrix('own'), content: { kind: 'container', children: [targetGeometry] } }
          : { ...targetGeometry, matrix: matrix('own') },
      parentToStage =
        row.role === 'wrapper' ? main : displayMatrixProduct(main, matrix('wrapperOwn')),
      receiver = { node, onStage: true, parentToStage, argumentToStage: main },
      query = (prefix: string) =>
        displayGeometryHitTestPoint(receiver, { x: value(prefix + '.x'), y: value(prefix + '.y') }),
      bounds = displayGeometryBounds(node);
    return {
      case: row.case,
      phase: row.phase,
      role: row.role,
      rawHit: query('input'),
      stageHit: query('stagePoint'),
      rootHit: query('rootPoint'),
      width: bounds ? (bounds.xMax - bounds.xMin) / 20 : 0,
      height: bounds ? (bounds.yMax - bounds.yMin) / 20 : 0,
    };
  });
}
