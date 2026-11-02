import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TankViewer } from '../../src/components/tank-viewer';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { ENEMIES } from '../../src/game/data/catalog';
import type { TankDesign } from '../../src/game/core/types';

function Flow({
  pack,
  stage,
  host,
  mode,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  host: HTMLElement;
  mode: 'flow' | 'actions' | 'guide' | 'avatar' | 'eligibility';
}) {
  const [tanks, setTanks] = useState<TankDesign[]>(() =>
    mode === 'actions'
      ? [{ ...ENEMIES[0], id: 'L10000099', name: 'AAA Local Tank', sourceCode: undefined }]
      : [],
  );
  return (
    <TankViewer
      pack={pack}
      stage={stage}
      tanks={tanks}
      avatar={mode === 'avatar' || mode === 'eligibility'}
      limits={
        mode === 'eligibility'
          ? { level: 2, maxClass: 3, gunPoints: 3 }
          : mode === 'avatar'
            ? { level: 1, maxClass: 2, gunPoints: 2 }
            : { level: 6, maxClass: 6, gunPoints: 100 }
      }
      helpSeen={mode !== 'guide'}
      onHelpComplete={() => {
        host.dataset.viewerHelpComplete = 'true';
      }}
      onSelect={(tank) => {
        host.dataset.viewerSelection = tank.id;
      }}
      onBack={() => {
        host.dataset.viewerBack = 'true';
      }}
      onSaveLocal={(tank) => {
        setTanks((items) => [...items.filter((t) => t.id !== tank.id), tank]);
        host.dataset.viewerSaved = tank.id;
      }}
      onDelete={(id) => {
        setTanks((items) => items.filter((t) => t.id !== id));
        host.dataset.viewerDeleted = id;
      }}
    />
  );
}

/** Production viewer with an externally stepped stage clock for exact fade observations. */
export function showViewerFlow(
  pack: AssetPack,
  host: HTMLElement,
  mode: 'flow' | 'actions' | 'guide' | 'avatar' | 'eligibility' = 'flow',
) {
  const stage = new StageRuntime(),
    root = createRoot(host),
    controls = document.createElement('div');
  const subscribe = stage.subscribe.bind(stage);
  let subscriptions = 0;
  host.dataset.viewerFlowSubscriptions = '0';
  stage.subscribe = (listener) => {
    host.dataset.viewerFlowSubscriptions = String(++subscriptions);
    const unsubscribe = subscribe(listener);
    let active = true;
    return () => {
      unsubscribe();
      if (active) {
        active = false;
        host.dataset.viewerFlowSubscriptions = String(--subscriptions);
      }
    };
  };
  controls.id = 'viewer-flow-controls';
  for (const count of [1, 5, 20]) {
    const button = document.createElement('button');
    button.textContent = `Viewer advance ${count} frames`;
    button.onclick = () => {
      for (let i = 0; i < count; i++) stage.advance(20, 50);
    };
    controls.append(button);
  }
  host.before(controls);
  root.render(
    <StrictMode>
      <Flow pack={pack} stage={stage} host={host} mode={mode} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
