'use client';
import type { World } from '@/game/simulation/world';
import { Icon } from './ui';
import { tutorialDescription } from '@/game/core/tutorial';
import { WorldMap } from './world-map';
import { EditTankControl } from './edit-tank-control';
export function GameHud({
  world,
  onMap,
  onPause,
  onEdit,
}: {
  world: World;
  onMap: () => void;
  onPause: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="game-hud">
      <WorldMap world={world} onCycle={onMap} />
      <button className="pause-hit" aria-label="Pause game" onClick={onPause}>
        <Icon name="pause" size={12} />
      </button>
      <p className="sr-only" aria-label="Field guide">
        {tutorialDescription(world.field.tutorial)}
      </p>
      <p className="sr-only" aria-label="Tank health">
        {world.player.design.name}: {world.player.life} of {world.player.maxLife} health.
        {world.player.maxLife - world.player.life} Bubbles left.
      </p>
      <p className="sr-only" aria-label="Field readouts">
        Allies: {world.tacticalHud.allies.length}. Enemy health readouts:{' '}
        {world.tacticalHud.passives.filter((indicator) => indicator.kind === 'health').length}.
        Off-screen enemies on radar:{' '}
        {world.tacticalHud.passives.filter((indicator) => indicator.kind === 'radar').length}.
      </p>
      <EditTankControl world={world} onEdit={onEdit} />
    </div>
  );
}
