import { StrictMode, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PARTS } from '../../src/game/data/catalog';
import { orderedPalette } from '../../src/game/simulation/editor-palette';
import { CreatorPaletteFrame, CreatorPaletteRows } from '../../src/components/creator-palette';
import { CreatorPartDetails } from '../../src/components/creator-part-details';
import type { CreatorDetailFocus } from '../../src/game/core/creator-details';

const context = { avatar: true, level: 0, classId: 1, budget: 10, gp: 0, bp: 0 };
const parts = orderedPalette(
  PARTS.filter((part) => Math.floor(part.id / 1000) === 2),
  context,
);
function PaletteFixture() {
  const [chosen, setChosen] = useState<number | null>(2001);
  const [focus, setFocus] = useState<CreatorDetailFocus | null>(null);
  const instance = useRef(0),
    canvas = useRef<HTMLCanvasElement>(null),
    id = useId();
  return (
    <div className="creator stage-background">
      <CreatorPaletteFrame />
      <CreatorPaletteRows
        parts={parts}
        context={context}
        chosen={chosen}
        onChoose={setChosen}
        detailsId={focus ? id : undefined}
        onDetails={(anchor) =>
          setFocus(anchor ? { ...anchor, instance: ++instance.current } : null)
        }
      />
      <CreatorPartDetails focus={focus} canvas={canvas} id={id} />
    </div>
  );
}
export function showCreatorPaletteRows(host: HTMLElement) {
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <PaletteFixture />
    </StrictMode>,
  );
  return () => root.unmount();
}
