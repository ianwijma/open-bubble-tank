import { createRoot } from 'react-dom/client';
import { PausePanel } from '../../src/components/pause-panel';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { World, emptyInput } from '../../src/game/simulation/world';
import { GameRenderer } from '../../src/game/render/pixi-renderer';

/** Real pause/Info UI and a real paused World on one manually advanced stage clock. */
export async function showPauseFlow(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 5),
    stage = new StageRuntime(world.mainEffects);
  stage.random = () => world.rng.next();
  world.pause();
  const renderer = new GameRenderer(pack);
  await renderer.init(host, DEFAULT_SETTINGS);
  const panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.inset = '0';
  host.appendChild(panel);
  const root = createRoot(panel),
    controls = document.createElement('div');
  controls.id = 'pause-flow-controls';
  let generation = 0;
  const report = () => {
    host.dataset.worldMode = world.mode;
    host.dataset.playerAge = String(world.player.age);
    host.dataset.artAge = String(world.player.artAge);
  };
  const show = () => {
    root.render(
      <PausePanel
        key={generation++}
        pack={pack}
        tank={world.player}
        stage={stage}
        fps={50}
        closeKey="KeyP"
        onResume={() => {
          world.resume();
          report();
          root.render(null);
        }}
        onMenu={() => (host.dataset.pauseAction = 'menu')}
        onSettings={() => (host.dataset.pauseAction = 'settings')}
      />,
    );
  };
  const unsubscribe = stage.subscribe({
    elapsed: (milliseconds) => world.advanceTime(milliseconds),
    step: () => world.step(emptyInput(), 0, false),
    draw: () => {
      renderer.draw(world, DEFAULT_SETTINGS);
      report();
    },
  });
  for (const count of [1, 5, 20, 100]) {
    const button = document.createElement('button');
    button.textContent = `Advance${count} frames`;
    button.onclick = () => {
      for (let i = 0; i < count; i++) stage.advance(20, 50);
    };
    controls.appendChild(button);
  }
  const reset = document.createElement('button');
  reset.textContent = 'Pause again';
  reset.onclick = () => {
    world.pause();
    show();
    report();
  };
  controls.appendChild(reset);
  host.before(controls);
  renderer.draw(world, DEFAULT_SETTINGS);
  report();
  show();
  return () => {
    root.unmount();
    unsubscribe();
    renderer.destroy();
    panel.remove();
    controls.remove();
  };
}
