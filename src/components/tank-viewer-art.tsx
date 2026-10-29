'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { SwfMatrix } from '@/game/assets/asset-pack';
import type { TankDesign, Rect } from '@/game/core/types';
import { viewerWidget, viewerFit, type ViewerPiece } from '@/game/core/tank-viewer';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
export const viewerTransform = (m: SwfMatrix) =>
  `matrix(${m.a},${m.b},${m.c},${m.d},${m.tx / 20},${m.ty / 20})`;
export function ViewerGroup({
  matrix,
  children,
  className = '',
}: {
  matrix: SwfMatrix;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`viewer-group ${className}`} style={{ transform: viewerTransform(matrix) }}>
      {children}
    </div>
  );
}
export function ViewerArt({
  pack,
  symbol,
  frame = 1,
}: {
  pack: AssetPack;
  symbol: number;
  frame?: number;
}) {
  const w = viewerWidget(symbol, frame),
    r = pack.creatorFrames.get(`viewer:${symbol}:${frame}`);
  return r ? (
    <CreatorRasterArt raster={r} />
  ) : (
    <svg className="viewer-art" width={1} height={1} aria-hidden="true">
      <CreatorPrimitives pieces={w.art} />
    </svg>
  );
}
export function ViewerFields({
  pack,
  symbol,
  frame = 1,
  values = {},
  opacities = {},
}: {
  pack: AssetPack;
  symbol: number;
  frame?: number;
  values?: Record<string, string>;
  opacities?: Record<string, number>;
}) {
  return viewerWidget(symbol, frame).fields.map((f) => (
    <ViewerGroup key={f.name} matrix={f.matrix}>
      <CreatorText
        pack={pack}
        field={f}
        text={values[f.name] ?? f.initialText ?? ''}
        opacity={opacities[f.name] ?? 1}
      />
    </ViewerGroup>
  ));
}
export function ViewerButton({
  pack,
  piece,
  label,
  disabled = false,
  done = false,
  onClick,
  onHover,
}: {
  pack: AssetPack;
  piece: ViewerPiece;
  label: string;
  disabled?: boolean;
  done?: boolean;
  onClick: () => void;
  onHover?: (value: string) => void;
}) {
  const [over, setOver] = useState(false);
  const frame = done || disabled ? 5 : over ? 2 : 1;
  const w = viewerWidget(piece.symbol, frame) ?? viewerWidget(piece.symbol, over ? 2 : 1),
    b = piece.bounds;
  return (
    <ViewerGroup matrix={piece.matrix}>
      <button
        className="viewer-button"
        disabled={disabled || done}
        aria-label={label}
        style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
        onClick={onClick}
        onPointerEnter={() => {
          setOver(true);
          onHover?.(label);
        }}
        onPointerLeave={() => {
          setOver(false);
          onHover?.('');
        }}
        onFocus={() => {
          setOver(true);
          onHover?.(label);
        }}
        onBlur={() => {
          setOver(false);
          onHover?.('');
        }}
      >
        <span style={{ position: 'absolute', left: -b.x, top: -b.y }}>
          <ViewerArt pack={pack} symbol={piece.symbol} frame={w.frame} />
          <ViewerFields pack={pack} symbol={piece.symbol} frame={w.frame} />
        </span>
      </button>
    </ViewerGroup>
  );
}
export interface ViewerJob {
  key: string;
  tank: TankDesign;
  fit: boolean;
  canvas: () => HTMLCanvasElement | null;
}
/** One renderer retains independent part instances for all four cards and the selection clone. */
export function useViewerArtwork(pack: AssetPack, stage: StageRuntime, jobs: ViewerJob[]) {
  const [error, setError] = useState('');
  const current = useRef(jobs);
  useEffect(() => {
    current.current = jobs;
  });
  useEffect(() => {
    let cancelled = false,
      unsubscribe: (() => void) | undefined,
      renderer: import('@/game/render/creator-artwork').CreatorArtwork | undefined;
    const scales = new Map<string, number>(),
      active = new Set<string>();
    let age = 1;
    async function start() {
      const { CreatorArtwork } = await import('@/game/render/creator-artwork');
      if (cancelled) return;
      renderer = new CreatorArtwork(pack, 550);
      await renderer.init();
      if (cancelled) {
        renderer.destroy();
        return;
      }
      function draw() {
        if (!renderer) return;
        const keys = new Set(current.current.map((j) => j.key));
        for (const key of active)
          if (!keys.has(key)) {
            renderer.removeLayer(`viewer:${key}`);
            active.delete(key);
            scales.delete(key);
          }
        for (const job of current.current) {
          const canvas = job.canvas(),
            ctx = canvas?.getContext('2d');
          if (!canvas || !ctx) continue;
          const layer = `viewer:${job.key}` as const,
            parts = job.tank.parts.map((part) => ({ part }));
          ctx.setTransform(2, 0, 0, 2, 550, 550);
          ctx.clearRect(-275, -275, 550, 550);
          if (job.fit && !scales.has(job.key)) {
            renderer.draw(ctx, layer, parts, age);
            const boxes: Rect[] = job.tank.parts.flatMap((part) => {
              const b = renderer!.localBounds(part, layer);
              if (!b) return [];
              const a = (part.rotation * Math.PI) / 180,
                c = Math.cos(a) * part.scale,
                s = Math.sin(a) * part.scale;
              const ps = [b.x, b.x + b.width].flatMap((x) =>
                [b.y, b.y + b.height].map((y) => ({
                  x: part.x + x * c - y * s,
                  y: part.y + x * s + y * c,
                })),
              );
              const x = Math.min(...ps.map((p) => p.x)),
                y = Math.min(...ps.map((p) => p.y));
              return [
                {
                  x,
                  y,
                  width: Math.max(...ps.map((p) => p.x)) - x,
                  height: Math.max(...ps.map((p) => p.y)) - y,
                },
              ];
            });
            scales.set(job.key, viewerFit(job.tank, boxes));
            ctx.clearRect(-275, -275, 550, 550);
          }
          renderer.draw(ctx, layer, parts, age, job.fit ? (scales.get(job.key) ?? 1) : 1);
          active.add(job.key);
        }
      }
      unsubscribe = stage.subscribe({
        step: () => {
          age++;
        },
        draw,
      });
      draw();
    }
    void start().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to render tank previews.');
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      renderer?.destroy();
    };
  }, [pack, stage]);
  return error;
}
