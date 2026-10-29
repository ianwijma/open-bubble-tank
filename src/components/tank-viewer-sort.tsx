'use client';
import { useEffect, useRef } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { TANK_VIEWER, viewerWidget, viewerRoot, type ViewerSort } from '@/game/core/tank-viewer';
import { ViewerArt, ViewerGroup, ViewerButton, viewerTransform } from './tank-viewer-art';
const identity = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const sorts: Record<string, { label: string; sort: ViewerSort }> = {
  btnSortByName_mc: { label: 'name', sort: 'name' },
  btnSortByAuthor_mc: { label: 'author', sort: 'author' },
  btnSortByClass_mc: { label: 'class', sort: 'classId' },
  btnSortByGuns_mc: { label: 'gun points', sort: 'guns' },
  btnSortByBubbles_mc: { label: 'bubble points', sort: 'bubbles' },
};
/** SortTanks1225 replaces two independently playing children whenever its hover frame changes. */
export function TankViewerSort({
  pack,
  stage,
  open,
  enabled,
  onOpen,
  onSort,
  onHover,
  x = 501.6,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  open: boolean;
  enabled: boolean;
  onOpen: (open: boolean) => void;
  onSort: (sort: ViewerSort) => void;
  onHover: (text: string) => void;
  x?: number;
}) {
  const icon = open ? 1224 : 1221,
    menu = open ? 1222 : 1218,
    iconFrames = useRef(new Map<number, HTMLDivElement>()),
    buttons = useRef(new Map<string, HTMLDivElement>()),
    rootElement = useRef<HTMLDivElement>(null);
  const base = viewerRoot('btnSortTanks_mc'),
    root = { ...base.matrix, tx: Math.round(x * 20) },
    clip = viewerWidget(1225, open ? 2 : 1).children.find((p) => p.name === 'containerButtons_mc')!,
    b = TANK_VIEWER.sortButtonBounds;
  useEffect(() => {
    let frame = 1;
    const paint = () => {
      rootElement.current?.setAttribute('data-icon-frame', String(Math.min(frame, 5)));
      rootElement.current?.setAttribute('data-menu-frame', String(Math.min(frame, 10)));
      for (const [i, node] of iconFrames.current)
        node.style.display = i === Math.min(frame, 5) ? 'block' : 'none';
      for (const piece of viewerWidget(menu, Math.min(frame, 10)).children) {
        const node = buttons.current.get(piece.name);
        if (node) node.style.transform = viewerTransform(piece.matrix);
      }
    };
    paint();
    const unsubscribe = stage.subscribe({
      step: () => {
        if (frame < 10) {
          frame++;
          paint();
        }
      },
    });
    return unsubscribe;
  }, [stage, icon, menu]);
  return (
    <ViewerGroup matrix={root} className="viewer-sort">
      <div
        ref={rootElement}
        className="viewer-sort-motion"
        onPointerEnter={() => {
          if (enabled) onOpen(true);
        }}
        onPointerLeave={() => onOpen(false)}
      >
        <button
          className="viewer-button"
          aria-label="Sort tanks"
          aria-expanded={open}
          disabled={!enabled}
          style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
          onClick={() => onOpen(true)}
          onFocus={() => {
            onOpen(true);
            onHover('Sort your list of tanks by...');
          }}
        />
        <ViewerGroup matrix={TANK_VIEWER.sortIconMatrix}>
          {[1, 2, 3, 4, 5].map((frame) => (
            <div
              key={`${icon}:${frame}`}
              className="viewer-group"
              ref={(node) => {
                if (node) iconFrames.current.set(frame, node);
                else iconFrames.current.delete(frame);
              }}
              style={{ display: frame === 1 ? 'block' : 'none' }}
            >
              <ViewerArt pack={pack} symbol={icon} frame={frame} />
            </div>
          ))}
        </ViewerGroup>
        <ViewerGroup matrix={clip.matrix}>
          {viewerWidget(menu, 1).children.map((piece) => (
            <div
              key={piece.name}
              className="viewer-group"
              ref={(node) => {
                if (node) buttons.current.set(piece.name, node);
                else buttons.current.delete(piece.name);
              }}
              style={{ transform: viewerTransform(piece.matrix) }}
            >
              <ViewerButton
                pack={pack}
                piece={{ ...piece, matrix: identity }}
                label={`Sort by ${sorts[piece.name].label}`}
                disabled={!open || !enabled}
                onClick={() => onSort(sorts[piece.name].sort)}
                onHover={onHover}
              />
            </div>
          ))}
        </ViewerGroup>
      </div>
    </ViewerGroup>
  );
}
