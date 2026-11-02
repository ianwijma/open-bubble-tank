'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { TANK_VIEWER } from '@/game/core/tank-viewer';
import type { ViewerRejections } from '@/game/core/viewer-rejections';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
import { ViewerGroup } from './tank-viewer-art';

/** Authored1557: timed pointer shield, independent backdrop/title/field fades, no modal dismissal. */
export function ViewerRejectionEffects({
  pack,
  stage,
  model,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  model: ViewerRejections;
}) {
  const effects = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot),
    roots = useRef(new Map<string, HTMLDivElement>()),
    layers = useRef(new Map<string, Map<number, HTMLDivElement>>());
  const paint = useCallback(() => {
    for (const [id, root] of roots.current) {
      const frame = model.frame(id);
      root.style.display = frame === undefined ? 'none' : '';
      if (frame === undefined) continue;
      root.dataset.rejectionFrame = String(frame);
      for (const [index, node] of layers.current.get(id) ?? []) {
        const alpha = TANK_VIEWER.rejection.frames[frame - 1][index];
        node.style.opacity = String(alpha);
        node.dataset.rejectionAlpha = String(alpha);
      }
    }
  }, [model]);
  useLayoutEffect(paint, [effects, paint]);
  useEffect(
    () =>
      stage.subscribe({
        step: () => {
          model.step();
          paint();
        },
      }),
    [model, stage, paint],
  );
  function layer(id: string, index: number, node: HTMLDivElement | null) {
    let entries = layers.current.get(id);
    if (node) {
      if (!entries) layers.current.set(id, (entries = new Map()));
      entries.set(index, node);
    } else {
      entries?.delete(index);
      if (!entries?.size) layers.current.delete(id);
    }
  }
  const art = TANK_VIEWER.rejection;
  return (
    <div className="viewer-rejections">
      {effects.map((effect) => (
        <div
          key={effect.id}
          className="viewer-rejection"
          role="status"
          aria-label={`You Cannot Select This Tank: ${effect.message}`}
          ref={(node) => {
            if (node) roots.current.set(effect.id, node);
            else roots.current.delete(effect.id);
          }}
        >
          <div aria-hidden="true">
            <ViewerGroup matrix={{ a: 1, b: 0, c: 0, d: 1, tx: art.x * 20, ty: art.y * 20 }}>
              {art.pieces.map((piece) => {
                const raster = pack.creatorFrames.get(`viewer:rejection:${piece.symbol}`);
                return (
                  <div
                    className="viewer-group"
                    key={piece.symbol}
                    data-rejection-layer={piece.symbol}
                    ref={(node) => layer(effect.id, piece.index, node)}
                  >
                    <ViewerGroup matrix={piece.matrix}>
                      {raster ? (
                        <CreatorRasterArt raster={raster} />
                      ) : (
                        <svg className="viewer-art" width={1} height={1}>
                          <CreatorPrimitives pieces={piece.art} />
                        </svg>
                      )}
                    </ViewerGroup>
                  </div>
                );
              })}
              <div
                className="viewer-group"
                data-rejection-layer="message"
                ref={(node) => layer(effect.id, art.fieldIndex, node)}
              >
                {art.fields.map((field) => (
                  <ViewerGroup key={field.name} matrix={field.matrix}>
                    <CreatorText pack={pack} field={field} text={effect.message} />
                  </ViewerGroup>
                ))}
              </div>
            </ViewerGroup>
          </div>
        </div>
      ))}
    </div>
  );
}
