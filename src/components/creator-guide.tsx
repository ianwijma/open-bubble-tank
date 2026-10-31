'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_GUIDE, advanceCreatorGuide } from '@/game/core/creator-guide';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';

export function CreatorGuide({
  pack,
  seen,
  onStart,
  onClose,
}: {
  pack: AssetPack;
  seen: boolean;
  onStart?: () => void;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState(() => (seen ? 1 : 2)),
    [hover, setHover] = useState<string | null>(null),
    reported = useRef(seen),
    root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      onStart?.();
    }
  }, [onStart]);
  if (frame === 1) return null;
  const page = CREATOR_GUIDE.frames.find((f) => f.frame === frame)!,
    raster = pack.creatorFrames.get(`guide:${frame}`),
    m = CREATOR_GUIDE.parent;
  return (
    <section
      ref={root}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="creator-guide"
      aria-label="Tank creator guide"
      data-guide-frame={frame}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>('button')],
          current = buttons.indexOf(document.activeElement as HTMLButtonElement),
          next =
            current < 0
              ? event.shiftKey
                ? buttons.length - 1
                : 0
              : (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault();
        buttons[next]?.focus();
      }}
      style={{ transform: `matrix(${m.a},${m.b},${m.c},${m.d},${m.tx / 20},${m.ty / 20})` }}
    >
      <p className="sr-only" aria-live="polite">
        {page.text}
      </p>
      {raster ? (
        <CreatorRasterArt raster={raster} />
      ) : (
        <svg viewBox="0 0 550 450" aria-hidden="true">
          <CreatorPrimitives pieces={page.art} />
        </svg>
      )}
      {page.buttons
        .filter((b) => frame !== 2 || b.name !== 'back_tut')
        .map((button) => {
          const b = button.bounds,
            matrix = button.matrix,
            state = hover === button.name ? 2 : 1,
            art = pack.creatorFrames.get(`guide-button:${button.symbol}:${state}`);
          return (
            <button
              key={button.name}
              type="button"
              className="creator-guide-button"
              aria-label={
                button.name === 'back_tut'
                  ? 'Previous creator guide page'
                  : 'Next creator guide page'
              }
              onPointerEnter={() => setHover(button.name)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(button.name)}
              onBlur={() => setHover(null)}
              style={{
                left: matrix.tx / 20 + b.x,
                top: matrix.ty / 20 + b.y,
                width: b.width,
                height: b.height,
              }}
              onClick={() => {
                setHover(null);
                const next = advanceCreatorGuide(frame, button.name === 'back_tut');
                setFrame(next);
                if (next === 1) onClose();
              }}
            >
              {art ? (
                <CreatorRasterArt raster={art} offsetX={-b.x} offsetY={-b.y} />
              ) : (
                <svg viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`} aria-hidden="true">
                  <CreatorPrimitives pieces={button.art[state - 1]} />
                </svg>
              )}
            </button>
          );
        })}
    </section>
  );
}
