import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MainMenu } from '../../src/components/main-menu';
import { SettingsPanel } from '../../src/components/settings-panel';
import { CreditsPanel } from '../../src/components/credits-panel';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { MainMenuMotion } from '../../src/game/core/main-menu';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Settings } from '../../src/game/core/types';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { MainBackground } from '../../src/components/main-background';
import {
  MainBackground as BackgroundModel,
  type BackgroundParticle,
} from '../../src/game/core/main-background';
import { MainBackgroundView } from '../../src/game/render/main-background-view';

function backgroundPaintProof() {
  const view = new MainBackgroundView(),
    state = new BackgroundModel(() => 0.5);
  const context = view.canvas.getContext('2d')!;
  const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data];
  const baseline = pixel(20, 20),
    edgeBaseline = pixel(0, 5);
  const particle = (x: number, y: number, alpha: number): BackgroundParticle => ({
    x,
    y,
    alpha,
    z: -0.5,
    vx: 0,
    vy: 0,
    dead: alpha === 0 || x < 0,
  });
  state.layers[0].painted = [particle(20, 20, 255), particle(20, 20, 0)];
  state.revision++;
  view.draw(state);
  const erased = pixel(20, 20);
  // setPixel32 truncates to signed integers and still paints the current dead particle.
  state.layers[0].painted = [particle(-0.9, 5.9, 255)];
  state.revision++;
  view.draw(state);
  const edge = pixel(0, 5);
  state.layers[0].painted = [particle(20, 20, 255)];
  state.layers[1].painted = [particle(20, 20, 255)];
  state.revision++;
  view.draw(state);
  return { baseline, erased, edgeBaseline, edge, twoLayers: pixel(20, 20) };
}

function MenuFixture({
  pack,
  stage,
  motion,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  motion: MainMenuMotion;
}) {
  const overlayRoot = useRef<HTMLFieldSetElement>(null);
  const [overlay, setOverlay] = useState<'settings' | 'credits' | null>(null);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const close = () => {
    if (motion.back()) setOverlay(null);
  };
  return (
    <>
      <MainBackground stage={stage} />
      <MainMenu
        pack={pack}
        stage={stage}
        motion={motion}
        covered={overlay !== null}
        overlayRoot={overlayRoot}
        onAction={(name) => {
          if ((name === 'settings_btn' || name === 'credits_btn') && motion.open())
            setOverlay(name === 'settings_btn' ? 'settings' : 'credits');
        }}
      />
      <fieldset
        ref={overlayRoot}
        className="main-menu-overlay"
        disabled={motion.busy}
        data-menu-busy={String(motion.busy)}
      >
        {overlay === 'settings' ? (
          <SettingsPanel
            pack={pack}
            settings={settings}
            onChange={(next, control) => {
              if (control === 'efficiency') stage.background.efficient = next.efficient;
              setSettings(next);
            }}
            onClose={close}
          />
        ) : null}
        {overlay === 'credits' ? <CreditsPanel pack={pack} stage={stage} onClose={close} /> : null}
      </fieldset>
    </>
  );
}

/** Production menu component and shared stage, with deterministic external frame controls. */
export function showMainMenuFlow(pack: AssetPack, host: HTMLElement) {
  host.dataset.backgroundPaintProof = JSON.stringify(backgroundPaintProof());
  const stage = new StageRuntime(),
    motion = new MainMenuMotion();
  const root = createRoot(host),
    controls = document.createElement('div');
  controls.id = 'main-menu-flow-controls';
  for (const count of [1, 5, 20, 95, 100]) {
    const button = document.createElement('button');
    button.textContent = `Menu advance ${count} frames`;
    button.onclick = () => {
      for (let i = 0; i < count; i++) stage.advance(20, 50);
    };
    controls.appendChild(button);
  }
  host.before(controls);
  root.render(
    <StrictMode>
      <MenuFixture pack={pack} stage={stage} motion={motion} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
