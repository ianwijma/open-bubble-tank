'use client';
import { useLayoutEffect, useRef } from 'react';
import type { UpgradeMenu } from '@/game/services/upgrade-menu';
import { straightBitmap } from '@/game/core/bitmap-blur';

/** Setup's single saved image stays outside the six foreground clips' alpha. */
export function UpgradeBackdrop({ menu }: { menu: UpgradeMenu }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const target = canvas.current!,
      context = target.getContext('2d')!,
      output = context.createImageData(550, 450);
    target.width = 550;
    target.height = 450;
    let previousCounter = NaN;
    const unsubscribe = menu.observe(() => {
      const { motion, history } = menu;
      if (history && previousCounter !== motion.counter) {
        straightBitmap(history.pixels, output.data);
        context.putImageData(output, 0, 0);
        previousCounter = motion.counter;
      }
      target.dataset.captureCount = String(menu.captureCount);
      target.dataset.upgradeCounter = String(motion.counter);
      target.dataset.upgradeClosing = String(motion.closing);
      target.dataset.upgradeChild = motion.child ?? '';
      target.dataset.savedFrames = String(history?.savedFrames ?? 0);
      target.dataset.historyIndex = String(history?.index ?? 0);
      target.dataset.retainedBytes = String(history?.retainedBytes ?? 0);
    });
    return () => {
      unsubscribe();
      target.width = target.height = 0;
    };
  }, [menu]);
  return (
    <canvas ref={canvas} className="upgrade-bitmap" width={550} height={450} aria-hidden="true" />
  );
}
