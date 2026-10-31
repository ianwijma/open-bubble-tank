import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MainMenu } from '../../src/components/main-menu';
import { SettingsPanel } from '../../src/components/settings-panel';
import { Dialog } from '../../src/components/ui';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { MainMenuMotion } from '../../src/game/core/main-menu';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Settings } from '../../src/game/core/types';
import { StageRuntime } from '../../src/game/services/stage-runtime';

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
          <SettingsPanel pack={pack} settings={settings} onChange={setSettings} onClose={close} />
        ) : null}
        {overlay === 'credits' ? (
          <Dialog title="Credits" onClose={close}>
            <div className="credits">Credits transition</div>
            <button onClick={close}>Back</button>
          </Dialog>
        ) : null}
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
