import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { GameViewport } from '../../src/components/game-viewport';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { Settings } from '../../src/game/core/types';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { createTank } from '../../src/game/simulation/tank';
import { World } from '../../src/game/simulation/world';

function ClockViewport({ pack, world }: { pack: AssetPack; world: World }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS }),
    [, render] = useState(0);
  return (
    <div className="site-shell" style={{ position: 'relative', width: 550, height: 450 }}>
      <GameViewport
        world={world}
        pack={pack}
        settings={settings}
        audio={null}
        onChange={() => render((value) => value + 1)}
      />
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
        <label>
          Stage FPS{' '}
          <select
            aria-label="Stage FPS"
            value={settings.fps}
            onChange={(event) =>
              setSettings((old) => ({ ...old, fps: Number(event.target.value) as Settings['fps'] }))
            }
          >
            <option value="35">35</option>
            <option value="50">50</option>
            <option value="90">90</option>
          </select>
        </label>
        <button
          onClick={() => {
            world.resume();
            render((value) => value + 1);
          }}
        >
          Resume fixture
        </button>
      </div>
    </div>
  );
}

/** Mount the production viewport/input/clock loop; inspection remains development-only. */
export function showPlayerClocks(
  pack: AssetPack,
  host: HTMLElement,
  report: (proof: object) => void,
) {
  const world = new World([], [], 1);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [
        STARTER.parts[0],
        { ...STARTER.parts[1], type: 2017, key: 'beam' },
        { ...STARTER.parts[1], type: 3015, key: 'rockets' },
      ],
    },
    'player',
    0,
    0,
    50,
    1,
  );
  world.field.tutorial = 0;
  const root = createRoot(host);
  root.render(<ClockViewport world={world} pack={pack} />);
  const inspect = () =>
    report({
      mode: world.mode,
      beams: world.bullets.filter((bullet) => bullet.kind === 'beam').length,
      rockets: world.bullets.filter((bullet) => bullet.kind === 'rocket').length,
      rocketAges: world.bullets
        .filter((bullet) => bullet.kind === 'rocket')
        .map((bullet) => bullet.age),
      trailSegments: world.effects.filter((effect) => effect.symbol === 2175 && effect.line).length,
      secondary: world.secondaryCounter,
      frames: world.stats.frames,
    });
  const interval = setInterval(inspect, 20);
  inspect();
  return () => {
    clearInterval(interval);
    root.unmount();
  };
}
