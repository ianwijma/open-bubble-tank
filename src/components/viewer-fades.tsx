'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ViewerFades } from '@/game/core/viewer-fades';

/** Retain the preceding panel during source alpha-out, without per-frame React renders. */
export function useViewerFade<T>(
  value: T | null,
  name: string,
  fades: ViewerFades,
  reset = false,
  initialAlpha = 0,
) {
  const [retained, setRetained] = useState(value),
    element = useRef<HTMLDivElement>(null);
  if (value !== null && value !== retained) setRetained(value);
  useLayoutEffect(() => {
    const state = fades.state(name, initialAlpha);
    const paint = () => {
      if (element.current) {
        element.current.style.opacity = String(state.alpha);
        element.current.dataset.viewerAlpha = String(state.alpha);
      }
      if (value === null && fades.settled(name) && state.alpha === 0) setRetained(null);
    };
    const unsubscribe = fades.subscribe(paint);
    if (value !== null) fades.show(name, reset);
    else fades.hide(name);
    paint();
    return unsubscribe;
  }, [fades, name, value, reset, initialAlpha]);
  return { value: retained, ref: element, active: value !== null };
}
