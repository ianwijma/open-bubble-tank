'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { TANK_VIEWER, viewerWidget, viewerEquipmentFields } from '@/game/core/tank-viewer';
import { ViewerArt, ViewerFields, ViewerGroup } from './tank-viewer-art';
import { CreatorRasterArt } from './creator-controls';
/** InnerlargeSTatisticsbuttons1137: closed mask, fresh ten-frame expanding child, immediate collapse. */
export function TankViewerStatistics({
  pack,
  stage,
  tank,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  tank: TankDesign;
}) {
  const [open, setOpen] = useState(false),
    windowRef = useRef<HTMLDivElement>(null),
    originRef = useRef<HTMLDivElement>(null),
    hit = useRef<HTMLButtonElement>(null),
    rasters = useRef(new Map<number, HTMLDivElement>());
  useEffect(() => {
    let age = 1;
    function paint() {
      const b = open ? TANK_VIEWER.statistics.frames[age - 1].mask : TANK_VIEWER.statistics.closed;
      for (const node of [windowRef.current, hit.current])
        if (node)
          Object.assign(node.style, {
            left: `${b.x}px`,
            top: `${b.y}px`,
            width: `${b.width}px`,
            height: `${b.height}px`,
          });
      if (originRef.current)
        Object.assign(originRef.current.style, { left: `${-b.x}px`, top: `${-b.y}px` });
      for (const [frame, node] of rasters.current)
        node.style.display = frame === age ? 'block' : 'none';
      windowRef.current?.setAttribute('data-statistics-frame', String(open ? age : 0));
    }
    paint();
    return stage.subscribe({
      step: () => {
        if (open && age < 10) {
          age++;
          paint();
        }
      },
    });
  }, [open, stage]);
  const w = viewerWidget(1137, open ? 2 : 1),
    clip = w.children.find((p) => p.name === 'textBoxes_mc')!;
  return (
    <ViewerGroup
      matrix={viewerWidget(1169).children.find((p) => p.name === 'largeTankStats_mc')!.matrix}
    >
      <div className="viewer-statistics-window" ref={windowRef}>
        <div className="viewer-group" ref={originRef}>
          {pack.mode === 'mock' ? (
            <div
              aria-hidden="true"
              className="viewer-group viewer-statistics-background"
              style={{
                left: TANK_VIEWER.statistics.background.bounds.x,
                top: TANK_VIEWER.statistics.background.bounds.y,
                width: TANK_VIEWER.statistics.background.bounds.width,
                height: TANK_VIEWER.statistics.background.bounds.height,
                background: `linear-gradient(to bottom, ${TANK_VIEWER.statistics.background.stops.map((s) => `rgb(${s.color.slice(0, 3).join(',')}) ${(s.ratio / 255) * 100}%`).join(',')})`,
              }}
            />
          ) : null}
          {open && pack.mode === 'swf' ? (
            TANK_VIEWER.statistics.frames.map(({ age }) => (
              <div
                key={age}
                className="viewer-group"
                style={{ display: age === 1 ? 'block' : 'none' }}
                ref={(node) => {
                  if (node) rasters.current.set(age, node);
                  else rasters.current.delete(age);
                }}
              >
                {pack.creatorFrames.get(`viewer:statistics:${age}`) ? (
                  <CreatorRasterArt raster={pack.creatorFrames.get(`viewer:statistics:${age}`)!} />
                ) : null}
              </div>
            ))
          ) : (
            <ViewerArt pack={pack} symbol={1137} frame={open ? 2 : 1} />
          )}
          <ViewerGroup matrix={clip.matrix}>
            <ViewerArt pack={pack} symbol={1129} />
            <ViewerFields pack={pack} symbol={1129} values={viewerEquipmentFields(tank)} />
          </ViewerGroup>
        </div>
      </div>
      <button
        ref={hit}
        className="viewer-button"
        aria-label="Tank equipment details"
        aria-expanded={open}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
    </ViewerGroup>
  );
}
