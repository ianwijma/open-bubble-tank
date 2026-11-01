import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { CreatorStats } from '../../src/components/creator-stats';
import { STARTER } from '../../src/game/data/catalog';
import type { TankDesign } from '../../src/game/core/types';
import type { AssetPack } from '../../src/game/assets/asset-pack';

function StatisticsFixture({ pack, controls }: { pack: AssetPack; controls: HTMLElement }) {
  const [avatar, setAvatar] = useState(true),
    [classId, setClassId] = useState(1);
  const design: TankDesign = {
    ...STARTER,
    avatar,
    classId,
    parts: [2002, 2001, 2001, 2003, 3001, 5002, 5001, 4002, 4001, 6001].map((type, i) => ({
      key: String(i),
      type,
      x: 0,
      y: 0,
      radius: 7,
      scale: 1,
      rotation: 0,
      twin: '',
    })),
  };
  return (
    <>
      <div className="creator stage-background">
        <CreatorStats pack={pack} design={design} classId={classId} />
      </div>
      {createPortal(
        <>
          <button onClick={() => setAvatar((value) => !value)}>
            {avatar ? 'Show enemy statistics' : 'Show avatar statistics'}
          </button>
          <button onClick={() => setClassId(6)}>Use class 6</button>
        </>,
        controls,
      )}
    </>
  );
}

export function showCreatorStatistics(pack: AssetPack, host: HTMLElement) {
  const controls = document.createElement('div');
  controls.id = 'creator-statistics-fixture-controls';
  host.before(controls);
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <StatisticsFixture pack={pack} controls={controls} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
