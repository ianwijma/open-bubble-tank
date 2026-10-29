'use client';
import type { RefObject } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_PALETTE } from '@/game/core/creator-palette';
import { creatorDetailText, type CreatorDetailFocus } from '@/game/core/creator-details';
import { partById } from '@/game/data/catalog';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
export function CreatorPartDetails({
  pack,
  focus,
  canvas,
  id,
}: {
  pack: AssetPack;
  focus: CreatorDetailFocus | null;
  canvas: RefObject<HTMLCanvasElement | null>;
  id: string;
}) {
  if (!focus) return null;
  const p = CREATOR_PALETTE.details,
    part = partById(focus.id);
  if (!part) return null;
  const fields = creatorDetailText(part),
    base = pack.creatorFrames.get('details:static'),
    frame = focus.selected ? 2 : 1,
    arrow = pack.creatorFrames.get(`details:arrow:${frame}`),
    b = p.arrow.bounds,
    mask = p.arrow.mask;
  const arrowY = focus.rowY - p.origin.ty / 20;
  return (
    <aside
      role="tooltip"
      id={id}
      aria-label={`${part.name} details`}
      className="creator-part-details"
      data-part={part.id}
      data-instance={focus.instance}
      style={{
        left: p.origin.tx / 20,
        top: p.origin.ty / 20,
        width: p.bounds.width,
        height: p.bounds.height,
      }}
    >
      {base ? (
        <CreatorRasterArt raster={base} />
      ) : (
        <svg aria-hidden="true" width={p.bounds.width} height={p.bounds.height}>
          <CreatorPrimitives pieces={p.static} />
        </svg>
      )}
      {p.fields.map((field) => (
        <CreatorText key={field.name} pack={pack} field={field} text={fields[field.name] ?? ''} />
      ))}
      <span
        className="creator-details-arrow-mask"
        style={{ left: mask.x, top: mask.y, width: mask.width, height: mask.height }}
      >
        <span
          data-details-arrow={frame}
          style={{
            position: 'absolute',
            left: p.arrow.matrix.tx / 20 - mask.x,
            top: arrowY - mask.y,
            opacity: focus.alpha,
          }}
        >
          {arrow ? (
            <CreatorRasterArt raster={arrow} />
          ) : (
            <svg
              aria-hidden="true"
              width={b.width}
              height={b.height}
              viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
              style={{ position: 'absolute', left: b.x, top: b.y }}
            >
              <CreatorPrimitives pieces={p.arrow.art[frame - 1]} />
            </svg>
          )}
        </span>
      </span>
      <canvas
        ref={canvas}
        width={98}
        height={98}
        aria-hidden="true"
        className="creator-details-thumbnail"
        style={{
          left: p.viewer.mask.x,
          top: p.viewer.mask.y,
          width: p.viewer.mask.width,
          height: p.viewer.mask.height,
        }}
      />
    </aside>
  );
}
