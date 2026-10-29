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

function MenuFixture({
  pack,
  stage,
  motion,
  reportAction,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  motion: MainMenuMotion;
  reportAction: (name: string) => void;
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
          reportAction(name);
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
  const stage = new StageRuntime(),
    motion = new MainMenuMotion();
  const root = createRoot(host),
    controls = document.createElement('div');
  host.dataset.menuActionCount = '0';
  const reportAction = (name: string) => {
    host.dataset.menuAction = name;
    host.dataset.menuActionCount = String(Number(host.dataset.menuActionCount) + 1);
  };
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
      <MenuFixture pack={pack} stage={stage} motion={motion} reportAction={reportAction} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
