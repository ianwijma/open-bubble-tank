import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CreatorSaveDialog } from '../../src/components/creator-save-dialog';
import { defaultProfile, submitCreatedTank } from '../../src/game/services/profile';
import { STARTER } from '../../src/game/data/catalog';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { TankDesign } from '../../src/game/core/types';

export function showCreatorSaveDialog(pack: AssetPack, host: HTMLElement) {
  function Fixture() {
    const profile = useRef(defaultProfile());
    const [dialog, setDialog] = useState<{
      kind: 'save' | 'exit';
      tank: TankDesign;
      opener: HTMLElement;
    } | null>(null);
    const [exits, setExits] = useState(0);
    const open = (kind: 'save' | 'exit', opener: HTMLElement, empty = false) =>
      setDialog({
        kind,
        opener,
        tank: { ...STARTER, name: 'Legacy: Tank', parts: empty ? [] : STARTER.parts },
      });
    return (
      <div style={{ position: 'relative', height: 450 }}>
        <button onClick={(e) => open('save', e.currentTarget)}>Open save</button>
        <button onClick={(e) => open('exit', e.currentTarget)}>Open exit</button>
        <button onClick={(e) => open('save', e.currentTarget, true)}>Open empty save</button>
        <output data-testid="fixture-exits">{exits}</output>
        {dialog ? (
          <CreatorSaveDialog
            pack={pack}
            kind={dialog.kind}
            tank={dialog.tank}
            opener={dialog.opener}
            onSave={(tank) => {
              const result = submitCreatedTank(profile.current, tank);
              profile.current = result.profile;
              host.dataset.creatorSubmission = JSON.stringify(result.profile);
              return result.tank ?? undefined;
            }}
            onClose={() => setDialog(null)}
            onExit={() => {
              setExits((value) => value + 1);
              setDialog(null);
            }}
          />
        ) : null}
      </div>
    );
  }
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <Fixture />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    delete host.dataset.creatorSubmission;
  };
}
