'use client';
import { useEffect, useRef } from 'react';
import type { World } from '@/game/simulation/world';

/** The model owns motion; this transparent native button follows the painted hit bounds each frame. */
export function EditTankControl({ world, onEdit }: { world: World; onEdit: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let frame = 0;
    let lastBounds = '';
    const update = () => {
      const button = ref.current,
        state = world.editSlider,
        b = state.layout.bounds;
      if (button) {
        const bounds = `left:${state.x + b.x}px;top:${state.y + b.y}px;width:${b.width}px;height:${b.height}px`;
        if (bounds !== lastBounds) {
          button.style.cssText = bounds;
          lastBounds = bounds;
        }
        const disabled = !world.canEdit || state.x + b.x + b.width <= 0;
        if (button.disabled !== disabled) button.disabled = disabled;
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [world]);
  return (
    <button
      ref={ref}
      className="edit-hit"
      aria-label="Edit your tank"
      onClick={() => {
        if (world.canEdit) onEdit();
      }}
      onPointerEnter={() => {
        world.editSlider.hovered = true;
      }}
      onPointerLeave={(event) => {
        if (!event.currentTarget.matches(':focus-visible')) world.editSlider.hovered = false;
      }}
      onFocus={() => {
        world.editSlider.hovered = true;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.matches(':hover')) world.editSlider.hovered = false;
      }}
      onKeyDown={(event) => {
        if (event.code === 'Space') {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat && world.canEdit) onEdit();
        }
      }}
    />
  );
}
