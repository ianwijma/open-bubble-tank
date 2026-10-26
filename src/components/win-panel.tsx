'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { WIN_SCREEN, WinScreenState, winScreenPresentation } from '@/game/core/win-screen';
import { Dialog } from './ui';

/** Authored win art, with the retired Parts Pack Manager promotion intentionally omitted. */
export function WinPanel({
  pack,
  fps = 50,
  onContinue,
  onMenu,
}: {
  pack: AssetPack;
  fps?: number;
  onContinue: () => void;
  onMenu: () => void;
}) {
  const [hovered, setHovered] = useState('');
  const timeline = useRef(new WinScreenState());
  const [age, setAge] = useState(0);
  useEffect(() => {
    let request = 0,
      previous: number | undefined,
      carry = 0;
    const step = 1000 / Math.max(1, fps);
    const tick = (time: number) => {
      if (previous !== undefined) carry += time - previous;
      previous = time;
      let changed = false;
      while (carry >= step && !timeline.current.complete) {
        timeline.current.advance();
        carry -= step;
        changed = true;
      }
      if (changed) setAge(timeline.current.age);
      if (!timeline.current.complete) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [fps]);
  const shade = WIN_SCREEN.backdrop;
  const backdrop = pack.uiFrames.get(shade.symbol)?.[0];
  const presentation = winScreenPresentation(age);
  return (
    <Dialog title="You've Proven Yourself The Greatest!" className="stage-dialog win-screen">
      <div data-win-age={age} data-blur-passes={presentation.blurPasses}>
        {backdrop ? (
          <img
            alt=""
            aria-hidden="true"
            src={backdrop.url}
            style={{
              position: 'absolute',
              left: shade.x + backdrop.x,
              top: shade.y + backdrop.y,
              width: backdrop.width,
              height: backdrop.height,
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, background: '#00000040' }}
          />
        )}
        <div style={{ opacity: presentation.alpha }}>
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
                  disabled={presentation.alpha === 0}
                  onClick={piece.name === 'ws_continue_mc' ? onContinue : onMenu}
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
