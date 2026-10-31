'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { alphaHit, type AssetPack } from '@/game/assets/asset-pack';
import { ViewerHighlights, viewerCardWarning } from '@/game/core/viewer-highlights';
import { TANK_VIEWER, viewerRoot, type ViewerLimits } from '@/game/core/tank-viewer';
import type { ViewerPane } from '@/game/core/viewer-panes';
import type { StageRuntime } from '@/game/services/stage-runtime';

/** Frame-driven card decoration; React owns lifetime, the stage owns alpha and hit sampling. */
export function useViewerHighlights(
  pack: AssetPack,
  stage: StageRuntime,
  cards: readonly (ViewerPane | null)[],
  limits: ViewerLimits,
  enabled: boolean,
) {
  const [model] = useState(() => new ViewerHighlights());
  const host = useRef<HTMLDivElement>(null),
    pointer = useRef<{ x: number; y: number } | null>(null),
    focused = useRef<number | null>(null),
    lines = useRef<(HTMLDivElement | null)[]>([]),
    cautions = useRef<(HTMLDivElement | null)[]>([]),
    active = useRef(enabled);
  function paint() {
    model.rows.forEach((row, index) => {
      const line = lines.current[index],
        caution = cautions.current[index];
      if (line) {
        line.style.opacity = row.lines ? '1' : '0';
        line.dataset.viewerLines = String(row.lines);
      }
      if (caution) {
        caution.style.opacity = String(row.caution);
        caution.dataset.cautionAlpha = String(row.caution);
      }
    });
  }
  useLayoutEffect(() => {
    active.current = enabled;
    cards.forEach((pane, index) =>
      model.setup(
        index,
        pane?.instance ?? null,
        pane ? viewerCardWarning(pane.tank, limits) : false,
      ),
    );
    paint();
  });
  useEffect(() => {
    return stage.subscribe({
      step: () => {
        const rect = host.current?.getBoundingClientRect(),
          point = pointer.current,
          raster = pack.creatorFrames.get('viewer:1176:1');
        const hits = model.rows.map((_, index) => {
          if (focused.current === index) return true; // Keyboard focus is an accessibility addition.
          if (!rect?.width || !point) return false;
          const sx = ((point.x - rect.x) * 550) / rect.width,
            sy = ((point.y - rect.y) * 450) / rect.height,
            m = viewerRoot(`TankLoad${index + 1}_mc`).matrix,
            det = m.a * m.d - m.b * m.c,
            dx = sx - m.tx / 20,
            dy = sy - m.ty / 20,
            x = (m.d * dx - m.c * dy) / det,
            y = (-m.b * dx + m.a * dy) / det;
          if (raster) return alphaHit(raster, x, y);
          const b = TANK_VIEWER.mask;
          return x >= b.x && y >= b.y && x <= b.x + b.width && y <= b.y + b.height;
        });
        model.step(hits, active.current);
        paint();
      },
    });
  }, [model, pack, stage]);
  return { model, host, pointer, focused, lines, cautions };
}
