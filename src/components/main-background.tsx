'use client';
import { useLayoutEffect, useRef } from 'react';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { MainBackgroundView } from '@/game/render/main-background-view';

export function MainBackground({ stage }: { stage: StageRuntime }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const view = new MainBackgroundView();
    view.canvas.setAttribute('aria-hidden', 'true');
    host.current!.appendChild(view.canvas);
    const draw = () => view.draw(stage.background);
    draw();
    const unsubscribe = stage.subscribe({ draw });
    const release = stage.capture.register({
      order: -1,
      draw: (context) => {
        draw();
        context.drawImage(view.canvas, 0, 0);
      },
    });
    return () => {
      unsubscribe();
      release();
      view.canvas.remove();
    };
  }, [stage]);
  return <div ref={host} className="main-background" aria-hidden="true" />;
}
