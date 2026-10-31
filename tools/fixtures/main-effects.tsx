import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { MainStage } from '../../src/components/main-stage';
import { GameViewport } from '../../src/components/game-viewport';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { World } from '../../src/game/simulation/world';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Settings } from '../../src/game/core/types';

function MainEffectsFixture({
  pack,
  world,
  runtime,
}: {
  pack: AssetPack;
  world: World;
  runtime: StageRuntime;
}) {
  const [menu, setMenu] = useState(false),
    [fps, setFps] = useState<Settings['fps']>(50);
  const stackFlashes = () => {
    runtime.effects.flash(0xff0000, 0.2);
    runtime.effects.flash(0x0000ff, 0.5);
  };
  return (
    <div className="site-shell" style={{ position: 'relative', width: 550, height: 450 }}>
      <MainStage runtime={runtime} fps={fps}>
        {menu ? (
          <div
            className="fixture-menu"
            style={{ position: 'absolute', inset: 0, background: '#14566d', padding: 80 }}
          >
            Menu · the game viewport is unmounted
          </div>
        ) : (
          <GameViewport
            world={world}
            pack={pack}
            stage={runtime}
            settings={{ ...DEFAULT_SETTINGS, fps }}
            audio={null}
            onChange={() => {}}
          />
        )}
        <div
          className="fixture-interface"
          style={{
            position: 'absolute',
            left: 70,
            top: 70,
            border: '1px solid white',
            background: '#123e50',
            padding: 20,
          }}
        >
          {menu ? 'Menu interface' : 'Paused interface'}
        </div>
      </MainStage>
      <div style={{ position: 'absolute', right: 5, bottom: 5, zIndex: 40 }}>
        <button onClick={() => runtime.effects.shake(12)}>Shake 12</button>
        <button onClick={() => world.resume()}>Resume game</button>
        <button onClick={stackFlashes}>Stack flashes</button>
        <button
          onClick={() => {
            stackFlashes();
            setMenu(true);
          }}
        >
          Flash into menu
        </button>
        <button onClick={() => setMenu(!menu)}>{menu ? 'Mount game' : 'Unmount game'}</button>
        <select
          aria-label="Effect FPS"
          value={fps}
          onChange={(event) => setFps(Number(event.target.value) as Settings['fps'])}
        >
          <option value={35}>35 FPS</option>
          <option value={50}>50 FPS</option>
          <option value={90}>90 FPS</option>
        </select>
      </div>
    </div>
  );
}

/** Actual DOM Main, viewport renderer and shared stage loop, with retained frame evidence. */
export function showMainEffects(
  pack: AssetPack,
  host: HTMLElement,
  report: (proof: object) => void,
) {
  const runtime = new StageRuntime(),
    world = new World([], [], 1, runtime.effects);
  runtime.random = () => 1;
  world.pause();
  world.field.tutorial = 0;
  const root = createRoot(host);
  root.render(<MainEffectsFixture pack={pack} world={world} runtime={runtime} />);
  const samples: object[] = [],
    shakeSamples: object[] = [];
  let disposed = false;
  const capture = () => {
    const main = host.querySelector<HTMLElement>('.main-stage'),
      canvas = host.querySelector<HTMLCanvasElement>('.game-canvas canvas'),
      flashes = host.querySelector<HTMLCanvasElement>('.main-flashes'),
      ui = host.querySelector<HTMLElement>('.fixture-interface');
    if (!main || !flashes || !ui) return;
    const origin = host.getBoundingClientRect();
    const offset = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x - origin.x, y: r.y - origin.y };
    };
    return {
      remaining: runtime.effects.remaining,
      position: { ...runtime.effects.position },
      main: offset(main),
      canvas: canvas ? offset(canvas) : null,
      ui: offset(ui),
      alpha: runtime.effects.flashes.map((f) => f.alpha),
      pixel: [...flashes.getContext('2d')!.getImageData(315, 265, 1, 1).data],
      rotation: world.player.rotation,
    };
  };
  const unsubscribe = runtime.subscribe({
    step: () => {
      if (runtime.effects.remaining <= 0) return;
      const sample = capture();
      if (sample) shakeSamples.push(sample);
    },
    draw: () =>
      queueMicrotask(() => {
        if (disposed) return;
        const sample = capture();
        if (!sample) return;
        if (sample.remaining > 0 || sample.alpha.length) samples.push(sample);
        report({
          ...sample,
          samples,
          shakeSamples,
          gameFrames: world.stats.frames,
          mode: world.mode,
        });
      }),
  });
  return () => {
    disposed = true;
    unsubscribe();
    root.unmount();
  };
}
