'use client';
import { useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_PALETTE } from '@/game/core/creator-palette';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';

export function CreatorPaletteTabs({
  pack,
  avatar,
  category,
  onCategory,
}: {
  pack: AssetPack;
  avatar: boolean;
  category: number;
  onCategory: (category: number) => void;
}) {
  const p = CREATOR_PALETTE,
    [hover, setHover] = useState(0);
  return (
    <div
      className="palette-tabs"
      role="group"
      aria-label="Part categories"
      style={{ left: p.origin.tx / 20, top: p.origin.ty / 20 }}
    >
      {p.tabs
        .filter((tab) =>
          avatar ? [1, 2, 3, 5].includes(tab.category) : [1, 4, 6].includes(tab.category),
        )
        .map((tab) => {
          const selected = category === tab.category,
            frame = selected || hover === tab.category ? 1 : 2,
            b = tab.bounds,
            raster = pack.creatorFrames.get(`palette:${tab.name}:${frame}`);
          return (
            <button
              key={tab.category}
              aria-label={tab.label}
              aria-pressed={selected}
              style={{
                left: tab.matrix.tx / 20 + b.x,
                top: tab.matrix.ty / 20 + b.y,
                width: b.width,
                height: b.height,
              }}
              onPointerEnter={() => setHover(tab.category)}
              onPointerLeave={() => setHover(0)}
              onFocus={() => setHover(tab.category)}
              onBlur={() => setHover(0)}
              onClick={() => {
                if (!selected) onCategory(tab.category);
              }}
            >
              {raster ? (
                <CreatorRasterArt raster={raster} offsetX={-b.x} offsetY={-b.y} />
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
                  width={b.width}
                  height={b.height}
                  style={{ overflow: 'visible' }}
                >
                  <CreatorPrimitives pieces={tab.art[frame - 1]} />
                </svg>
              )}
            </button>
          );
        })}
    </div>
  );
}
