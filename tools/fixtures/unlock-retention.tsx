import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { TankCreator } from '../../src/components/tank-creator';
import { TankViewer } from '../../src/components/tank-viewer';
import type { ViewerLimits } from '../../src/game/core/tank-viewer';

/** Real world damage/upgrade rules feeding the production creator/viewer at level1. */
export function showUnlockRetention(pack: AssetPack, host: HTMLElement) {
  const root = createRoot(host),
    stage = new StageRuntime(),
    controls = document.createElement('div');
  controls.id = 'unlock-retention-controls';
  host.before(controls);
  let world = new World([], [STARTER, STARTER, STARTER, STARTER], 1),
    generation = 0;
  world.getOffers();
  for (let death = 0; death < 2; death++) {
    world.damage(world.player, 100000);
    for (let i = 0; i < 25; i++) world.step(emptyInput());
  }
  function report() {
    controls.dataset.unlockLevel = String(world.progression.level);
    controls.dataset.radarUnlocked = String(world.unlockedParts.includes(5001));
  }
  function editor(initial = STARTER) {
    report();
    root.render(
      <StrictMode>
        <TankCreator
          key={++generation}
          pack={pack}
          fps={50}
          overGame
          initial={initial}
          level={world.progression.level}
          maxClass={Math.min(6, world.progression.level + 1)}
          unlockedParts={world.unlockedParts}
          onSave={(tank) => tank}
          onExit={() => {}}
          onLoad={viewer}
        />
      </StrictMode>,
    );
  }
  function viewer(limits: ViewerLimits & { avatar: boolean }) {
    root.render(
      <StrictMode>
        <TankViewer
          pack={pack}
          stage={stage}
          tanks={[]}
          avatar={limits.avatar}
          limits={limits}
          helpSeen
          onHelpComplete={() => {}}
          onSelect={editor}
          onBack={() => editor()}
          onSaveLocal={() => {}}
          onDelete={() => {}}
        />
      </StrictMode>,
    );
  }
  const fresh = document.createElement('button');
  fresh.textContent = 'Start fresh unlock session';
  fresh.onclick = () => {
    world = new World([], [], 1);
    world.player.life = world.player.maxLife;
    world.step(emptyInput()); // First upgrade creates its menu and unlocks tier1.
    world.selectUpgrade(STARTER);
    editor();
  };
  const advance = document.createElement('button');
  advance.textContent = 'Unlock viewer advance 20 frames';
  advance.onclick = () => {
    for (let i = 0; i < 20; i++) stage.advance(20, 50);
  };
  controls.append(fresh, advance);
  editor();
  return () => {
    root.unmount();
    controls.remove();
  };
}
