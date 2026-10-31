'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { MainBackground } from './main-background';

/** Main includes game pixels, HUD, menus and independent flash rectangles. */
export function MainStage({
  runtime,
  fps,
  children,
}: {
  runtime: StageRuntime;
  fps: number;
  children: ReactNode;
}) {
  const main = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    fpsRef = useRef(fps);
  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !main.current) return;
    let previousX = NaN,
      previousY = NaN,
      paintedFlash = false;
    const presentTransform = () => {
      const { x, y } = runtime.effects.position;
      if (x === previousX && y === previousY) return;
      main.current!.style.transform = `translate(${x}px, ${y}px)`;
      previousX = x;
      previousY = y;
    };
    // Resolve the transform before input reads mouse coordinates, including catch-up frames.
    const unsubscribe = runtime.subscribe({ beforeStep: presentTransform });
    const releaseCapture = runtime.capture.register({
      order: 10,
      draw: (context) => context.drawImage(canvas.current!, -40, -40, 630, 530),
    });
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      runtime.advance(now - last, fpsRef.current);
      last = now;
      presentTransform();
      const { flashes } = runtime.effects;
      if (paintedFlash || flashes.length) ctx.clearRect(0, 0, 630, 530);
      for (const flash of flashes) {
        ctx.globalAlpha = Math.max(0, flash.alpha) * flash.fillAlpha;
        ctx.fillStyle = `#${(flash.color & 0xffffff).toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 630, 530);
      }
      ctx.globalAlpha = 1;
      paintedFlash = flashes.length > 0;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      releaseCapture();
    };
  }, [runtime]);
  return (
    <div ref={main} className="main-stage">
      <MainBackground stage={runtime} />
      {children}
      <canvas ref={canvas} className="main-flashes" width={630} height={530} aria-hidden="true" />
    </div>
  );
}
