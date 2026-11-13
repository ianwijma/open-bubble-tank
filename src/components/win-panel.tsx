'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { WIN_SCREEN } from '@/game/core/win-screen';
import type { WinScreen } from '@/game/services/win-screen';
import { Dialog } from './ui';

/** Authored win art, with the retired Parts Pack Manager promotion intentionally omitted. */
export function WinPanel({ pack, screen }: { pack: AssetPack; screen: WinScreen }) {
  const [hovered, setHovered] = useState('');
  const backdrop = useRef<HTMLCanvasElement>(null),
    foreground = useRef<HTMLDivElement>(null),
    container = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      screen.observe(() => {
        const canvas = backdrop.current!,
          context = canvas.getContext('2d')!;
        context.clearRect(0, 0, 550, 450);
        screen.drawBackdrop(context);
        foreground.current!.style.opacity = String(screen.motion.alpha);
        foreground.current!.style.zIndex = screen.foregroundRaised ? '2' : '0';
        const data = container.current!.dataset;
        data.winAge = String(screen.motion.age);
        data.blurPasses = String(screen.motion.blurPasses);
        data.contentFrame = String(screen.motion.contentFrame);
        data.foregroundRaised = String(screen.foregroundRaised);
        data.captureCount = String(screen.captureCount);
        data.savedFrames = String(screen.history?.savedFrames ?? 0);
      }),
    [screen],
  );
  return (
    <Dialog title="You've Proven Yourself The Greatest!" className="stage-dialog win-screen">
      <div ref={container}>
        <canvas ref={backdrop} className="win-bitmap" width={550} height={450} aria-hidden="true" />
        <div ref={foreground} style={{ opacity: 0, position: 'absolute', inset: 0 }}>
          {WIN_SCREEN.pieces.map((piece) => {
            const button = piece.name === 'ws_continue_mc' || piece.name === 'ws_main_menu';
            const label = piece.name === 'ws_continue_mc' ? 'Continue Your Game' : 'Main Menu';
            const raster = pack.uiFrames.get(piece.symbol)?.[
              button && hovered === piece.name ? 1 : 0
            ];
            const image = raster ? (
              <img
                alt=""
                aria-hidden="true"
                src={raster.url}
                style={{
                  position: 'absolute',
                  left: button ? raster.x - piece.bounds.x : piece.x + raster.x,
                  top: button ? raster.y - piece.bounds.y : piece.y + raster.y,
                  width: raster.width,
                  height: raster.height,
                  pointerEvents: 'none',
                }}
              />
            ) : null;
            if (button)
              return (
                <button
                  key={piece.symbol}
                  className="win-screen-button"
                  aria-label={label}
                  onClick={() =>
                    screen.complete(piece.name === 'ws_continue_mc' ? 'continue' : 'menu')
                  }
                  onPointerEnter={() => setHovered(piece.name)}
                  onPointerLeave={() => setHovered('')}
                  onFocus={() => setHovered(piece.name)}
                  onBlur={() => setHovered('')}
                  style={{
                    position: 'absolute',
                    left: piece.x + piece.bounds.x,
                    top: piece.y + piece.bounds.y,
                    width: piece.bounds.width,
                    height: piece.bounds.height,
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    color: hovered === piece.name ? '#fff' : '#6ff',
                    font: '17px Arial',
                    cursor: 'pointer',
                  }}
                >
                  {image ?? label}
                </button>
              );
            return (
              <span key={piece.symbol}>
                {'text' in piece ? <span className="sr-only">{piece.text}</span> : null}
                {image ??
                  ('text' in piece ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: piece.x + piece.bounds.x,
                        top: piece.y + piece.bounds.y,
                        width: piece.bounds.width,
                        whiteSpace: 'pre',
                        textAlign: 'center',
                        fontFamily: piece.font,
                        fontSize: piece.size,
                        lineHeight: `${piece.lineHeight}px`,
                        color: piece.color,
                      }}
                    >
                      {piece.text}
                    </span>
                  ) : null)}
              </span>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
