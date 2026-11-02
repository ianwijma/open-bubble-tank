import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { CreatorWeaponIcon } from '../../src/game/core/creator-details';
import { CreatorSelectionInfo } from '../../src/components/creator-selection-info';

const initial: CreatorWeaponIcon[] = [
  { key: 'carrier', type: 4013, x: 15, y: -20 },
  { key: 'behavior', type: 6003, x: -65, y: 40 },
];
function SelectionInfoFixture({ pack }: { pack: AssetPack }) {
  const [icons, setIcons] = useState(initial);
  return (
    <div className="creator stage-background">
      <button onClick={() => setIcons((previous) => previous.map((icon) => ({ ...icon })))}>
        Rebuild identical selection
      </button>
      <button onClick={() => setIcons([])}>Clear selection</button>
      <CreatorSelectionInfo pack={pack} icons={icons} />
    </div>
  );
}
export function showCreatorSelectionInfo(pack: AssetPack, host: HTMLElement) {
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <SelectionInfoFixture pack={pack} />
    </StrictMode>,
  );
  return () => root.unmount();
}
