'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_DIALOGS } from '@/game/core/creator-dialogs';
import { CreatorAlertClock } from '@/game/core/creator-alert';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';

export function CreatorAlert({
  pack,
  fps,
  request,
  onActiveChange,
}: {
  pack: AssetPack;
  fps: number;
  request: { message: string } | null;
  onActiveChange: (active: boolean) => void;
}) {
  const [clock] = useState(() => new CreatorAlertClock()),
    [, refresh] = useState(0),
    root = useRef<HTMLElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    description = useId();
  useEffect(() => {
    if (!request) return;
    clock.show(request.message);
    onActiveChange(true);
    refresh((n) => n + 1);
    timer.current = setTimeout(() => clock.timerComplete(), 2000);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [clock, request, onActiveChange]);
  useEffect(() => {
    let handle = 0,
      previous = performance.now(),
      accumulator = 0;
    const tick = (now: number) => {
      accumulator += document.hidden ? 0 : Math.min(100, now - previous);
      previous = now;
      const frames = Math.floor(accumulator / (1000 / fps));
      if (frames) {
        accumulator %= 1000 / fps;
        if (clock.fading) {
          const visible = clock.visible;
          clock.step(frames);
          refresh((n) => n + 1);
          if (visible && !clock.visible) onActiveChange(false);
        }
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [clock, fps, onActiveChange]);
  const visible = clock.visible;
  useEffect(() => {
    if (visible) root.current?.focus({ preventScroll: true });
  }, [visible]);
  if (!visible) return null;
  function dismiss() {
    if (!clock.visible) return;
    clock.dismiss();
    if (timer.current !== null) clearTimeout(timer.current);
    onActiveChange(false);
    refresh((n) => n + 1);
  }
  const layout = CREATOR_DIALOGS.alert,
    raster = pack.creatorFrames.get('alert'),
    m = layout.matrix;
  return (
    <section
      ref={root}
      role="alertdialog"
      aria-modal="true"
      aria-label="Tank creator error"
      aria-describedby={description}
      tabIndex={-1}
      className="creator-alert"
      data-alert-alpha={clock.alpha}
      style={{
        opacity: clock.alpha,
        transform: `matrix(${m.a},${m.b},${m.c},${m.d},${m.tx / 20},${m.ty / 20})`,
      }}
      onPointerUp={dismiss}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          root.current?.querySelector('button')?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dismiss();
        }
      }}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} />
      ) : (
        <svg viewBox="0 0 550 450" aria-hidden="true">
          <CreatorPrimitives pieces={layout.art} />
        </svg>
      )}
      <div id={description}>
        {layout.fields.map((field) => (
          <CreatorText
            key={field.name}
            pack={pack}
            field={field}
            text={field.name === 'description_txt' ? clock.message : (field.initialText ?? '')}
          />
        ))}
      </div>
      <button
        type="button"
        className="creator-alert-dismiss"
        aria-label="Dismiss creator error"
        onClick={dismiss}
      />
    </section>
  );
}
