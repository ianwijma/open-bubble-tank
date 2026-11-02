'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { ViewerFades } from '@/game/core/viewer-fades';
/** Paint alpha without replacing the retained MovieClip or rendering React each frame. */
export function ViewerPaneLayer({
  fades,
  name,
  active,
  children,
}: {
  fades: ViewerFades;
  name: string;
  active: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const paint = () => {
      if (ref.current) {
        ref.current.style.opacity = String(fades.state(name).alpha);
        ref.current.dataset.viewerAlpha = String(fades.state(name).alpha);
      }
    };
    paint();
    return fades.subscribe(paint);
  }, [fades, name]);
  return (
    <div
      className="viewer-group"
      ref={ref}
      data-viewer-pane={name}
      inert={!active}
      aria-hidden={!active || undefined}
    >
      {children}
    </div>
  );
}
