import type { World } from '@/game/simulation/world';
import { MINIMAP, mapModeName, mapCenter } from '@/game/core/minimap';
export function WorldMap({ world, onCycle }: { world: World; onCycle: () => void }) {
  const center = mapCenter(world);
  return (
    <>
      <button
        className="map-hit"
        style={{ left: MINIMAP.origin.x, top: MINIMAP.origin.y }}
        aria-label="Change map size"
        aria-describedby="map-description"
        aria-expanded={world.mapMode === 2}
        title={`Map: ${mapModeName(world.mapMode)}. Click to cycle compact, large, and hidden.`}
        onClick={onCycle}
        onPointerEnter={() => {
          world.mapHovered = true;
        }}
        onPointerLeave={(event) => {
          if (!event.currentTarget.matches(':focus-visible')) world.mapHovered = false;
        }}
        onFocus={() => {
          world.mapHovered = true;
        }}
        onBlur={(event) => {
          if (!event.currentTarget.matches(':hover')) world.mapHovered = false;
        }}
        onKeyDown={(event) => {
          if (event.code === 'Space') {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) onCycle();
          }
        }}
      />
      <p className="sr-only" id="map-description">
        Map: {mapModeName(world.mapMode)}. Position ({center.col}, {center.row}).{' '}
        {world.fields.size} fields, {world.connections.size} traveled paths.
      </p>
    </>
  );
}
