import { createRoot } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { PausePanel } from '../../src/components/pause-panel';
import { SettingsPanel } from '../../src/components/settings-panel';
import type { Settings } from '../../src/game/core/types';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { StageCapture } from '../../src/game/services/stage-capture';
import { World, emptyInput } from '../../src/game/simulation/world';
import { GameRenderer } from '../../src/game/render/pixi-renderer';

function PauseFixture({
  pack,
  world,
  stage,
  onResume,
  host,
}: {
  pack: AssetPack;
  world: World;
  stage: StageRuntime;
  onResume: () => void;
  host: HTMLElement;
}) {
  const [covered, setCovered] = useState(false);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  return (
    <>
      <PausePanel
        pack={pack}
        tank={world.player}
        stage={stage}
        fps={50}
        closeKey="KeyP"
        covered={covered}
        onResume={onResume}
        onMenu={() => (host.dataset.pauseAction = 'menu')}
        onSettings={() => setCovered(true)}
      />
      {covered ? (
        <SettingsPanel
          pack={pack}
          settings={settings}
          onChange={setSettings}
          overPause
          onClose={() => setCovered(false)}
        />
      ) : null}
    </>
  );
}

/** Real pause/Info UI and a real paused World on one manually advanced stage clock. */
export async function showPauseFlow(pack: AssetPack, host: HTMLElement) {
  const captureProof = new StageCapture();
  const early = captureProof.capture() === undefined;
  const removeOverlay = captureProof.register({
    order: 10,
    draw: (context) => {
      context.globalAlpha = 128 / 255;
      context.fillStyle = '#ff0000';
      context.fillRect(0, 0, 550, 450);
      context.globalAlpha = 1;
    },
  });
  const removeBase = captureProof.register({
    order: 0,
    base: true,
    draw: (context) => {
      context.fillStyle = '#0000ff';
      context.fillRect(0, 0, 550, 450);
      context.globalAlpha = 0.1; // The next layer must not inherit another provider's state.
    },
  });
  const combined = [...captureProof.capture()!.data.slice(0, 4)];
  removeOverlay();
  const base = [...captureProof.capture()!.data.slice(0, 4)];
  removeBase();
  host.dataset.captureLayers = JSON.stringify({
    early,
    combined,
    base,
    released: captureProof.capture() === undefined,
  });
  const world = new World([], [], 5),
    stage = new StageRuntime(world.mainEffects);
  stage.random = () => world.rng.next();
  world.pause();
  const renderer = new GameRenderer(pack);
  await renderer.init(host, DEFAULT_SETTINGS);
  const releaseCapture = stage.capture.register({
    order: 0,
    base: true,
    draw: (context) => renderer.capture(context),
  });
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
      <StrictMode key={generation++}>
        <PauseFixture
          pack={pack}
          world={world}
          stage={stage}
          host={host}
          onResume={() => {
            world.resume();
            report();
            root.render(null);
          }}
        />
      </StrictMode>,
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
  const inspect = document.createElement('button');
  inspect.textContent = 'Inspect live scene';
  inspect.onclick = () => {
    let hash = 2166136261;
    for (const byte of stage.capture.capture()!.data) hash = Math.imul(hash ^ byte, 16777619);
    host.dataset.sourceHash = String(hash >>> 0);
  };
  controls.appendChild(inspect);
  host.before(controls);
  renderer.draw(world, DEFAULT_SETTINGS);
  report();
  show();
  return () => {
    root.unmount();
    unsubscribe();
    releaseCapture();
    renderer.destroy();
    panel.remove();
    controls.remove();
  };
}
