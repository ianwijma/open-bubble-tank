import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CreatorText } from '../../src/components/creator-text';
import { CREATOR_PALETTE } from '../../src/game/core/creator-palette';
import type { AssetPack } from '../../src/game/assets/asset-pack';

function hash(value: string | null) {
  if (value === null) return null;
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

export function showCreatorText(pack: AssetPack, host: HTMLElement) {
  const caption = { ...CREATOR_PALETTE.library.caption, name: 'caption' },
    cost = {
      ...CREATOR_PALETTE.row.fields.find((field) => field.name === 'cost_txt')!,
      name: 'cost',
    },
    wrapped = {
      ...CREATOR_PALETTE.stats.fields.find((field) => field.name === 'PrimarySecondary_txt')!,
      name: 'wrapped',
    };
  const color = `rgb(${cost.color.slice(0, 3).join(',')})`;
  host.dataset.creatorText = JSON.stringify({
    expectedFont: hash(pack.textSvg('12', cost.size, color, cost.font, cost.spacing, cost.fontId)),
    prefixFont: hash(pack.textSvg('12', cost.size, color, cost.font, cost.spacing)),
  });
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <div style={{ position: 'relative', height: 450, background: '#0b3c5a' }}>
        <CreatorText pack={pack} field={caption} text="Click and Drag Object" x={20} y={20} />
        <CreatorText pack={pack} field={cost} text="12" x={20} y={60} />
        <CreatorText
          pack={pack}
          field={wrapped}
          text={'Primary Weapons:\n\n\nSecondary Weapons:'}
          x={20}
          y={100}
        />
        <CreatorText
          pack={pack}
          field={{ ...cost, name: 'clipped' }}
          text="1234567890"
          x={20}
          y={180}
        />
        <CreatorText
          pack={pack}
          field={{ ...caption, name: 'right', align: 1 }}
          text="Right"
          x={200}
          y={20}
          opacity={0.5}
        />
      </div>
    </StrictMode>,
  );
  return () => {
    root.unmount();
    delete host.dataset.creatorText;
  };
}
