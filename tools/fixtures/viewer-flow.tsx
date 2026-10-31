import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TankViewer } from '../../src/components/tank-viewer';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { StageRuntime } from '../../src/game/services/stage-runtime';

/** Production viewer with an externally stepped stage clock for exact fade observations. */
export function showViewerFlow(pack: AssetPack, host: HTMLElement, avatar = false, level = 1) {
  const stage = new StageRuntime(),
    root = createRoot(host),
    controls = document.createElement('div');
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
      <TankViewer
        pack={pack}
        stage={stage}
        tanks={[]}
        avatar={avatar}
        limits={
          avatar
            ? { level, maxClass: level + 1, gunPoints: level === 2 ? 3 : 2 }
            : { level: 6, maxClass: 6, gunPoints: 100 }
        }
        helpSeen={true}
        onHelpComplete={() => {}}
        onSelect={(tank) => {
          host.dataset.viewerSelection = tank.id;
        }}
        onBack={() => {}}
        onSaveLocal={() => {}}
        onDelete={() => {}}
      />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
