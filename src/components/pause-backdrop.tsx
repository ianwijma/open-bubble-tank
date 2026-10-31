'use client';
import { useLayoutEffect, useRef } from 'react';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { PauseMotion } from '@/game/core/pause-motion';
import { PauseBitmapHistory, straightBitmap } from '@/game/core/bitmap-blur';

/** _-US captures once; only its own saved bitmap history changes thereafter. */
export function PauseBackdrop({ stage, motion }: { stage: StageRuntime; motion: PauseMotion }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const target = canvas.current!,
      context = target.getContext('2d')!;
    // Effect replay reuses the canvas after cleanup has released its backing store.
    target.width = 550;
    target.height = 450;
    const output = context.createImageData(550, 450);
    let history: PauseBitmapHistory | undefined,
      dirty = false,
      peak = 0;
    const initialize = () => {
      const capture = stage.capture.capture();
      if (!capture) return false;
      history = new PauseBitmapHistory(550, 450, capture.data);
      // Scene setup can be asynchronous. Reconstruct elapsed history without sampling it again.
      for (let frame = 1; frame <= peak; frame++) history.advance(frame, false);
      if (motion.phase === 'closing')
        for (let frame = peak - 1; frame >= motion.blurFrame; frame--) history.advance(frame, true);
      target.dataset.captureCount = '1';
      target.dataset.ready = 'true';
      dirty = true;
      return true;
    };
    const paint = () => {
      if (!history) return;
      if (dirty) {
        straightBitmap(history.pixels, output.data);
        context.putImageData(output, 0, 0);
        dirty = false;
      }
      target.dataset.savedFrames = String(history.savedFrames);
      target.dataset.historyIndex = String(history.index);
      target.dataset.retainedBytes = String(history.retainedBytes);
    };
    initialize();
    paint();
    const unsubscribe = stage.subscribe({
      step: () => {
        peak = Math.max(peak, motion.blurFrame);
        if (!history && !initialize()) return;
        if (history!.advance(motion.blurFrame, motion.phase === 'closing')) dirty = true;
      },
      draw: paint,
    });
    return () => {
      unsubscribe();
      history?.dispose();
      target.dataset.retainedBytes = String(history?.retainedBytes ?? 0);
      target.dataset.savedFrames = String(history?.savedFrames ?? 0);
      target.width = target.height = 0;
    };
  }, [motion, stage]);
  return (
    <canvas ref={canvas} className="pause-bitmap" width={550} height={450} aria-hidden="true" />
  );
}
