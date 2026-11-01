import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { PARTS } from '../../src/game/data/catalog';
import { orderedPalette } from '../../src/game/simulation/editor-palette';
import { CreatorPaletteFrame, CreatorPaletteRows } from '../../src/components/creator-palette';

const context = { avatar: true, level: 0, classId: 1, budget: 10, gp: 0, bp: 0 };
const parts = orderedPalette(
  PARTS.filter((part) => Math.floor(part.id / 1000) === 2),
  context,
);
function PaletteFixture({ pack }: { pack: AssetPack }) {
  const [chosen, setChosen] = useState<number | null>(2001);
  return (
    <div className="creator stage-background">
      <CreatorPaletteFrame pack={pack} />
      <CreatorPaletteRows
        pack={pack}
        parts={parts}
        context={context}
        chosen={chosen}
        onChoose={setChosen}
      />
    </div>
  );
}
export function showCreatorPaletteRows(pack: AssetPack, host: HTMLElement) {
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <PaletteFixture pack={pack} />
    </StrictMode>,
  );
  return () => root.unmount();
}
