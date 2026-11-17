import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CreatorText } from '../../src/components/creator-text';
import { CreatorPrimitives } from '../../src/components/creator-controls';
import { CREATOR_PALETTE } from '../../src/game/core/creator-palette';
import { creatorDialogFrame } from '../../src/game/core/creator-dialogs';

export function showCreatorText(host: HTMLElement) {
  const caption = { ...CREATOR_PALETTE.library.caption, name: 'caption' },
    cost = {
      ...CREATOR_PALETTE.row.fields.find((field) => field.name === 'cost_txt')!,
      name: 'cost',
    },
    wrapped = {
      ...CREATOR_PALETTE.stats.fields.find((field) => field.name === 'PrimarySecondary_txt')!,
      name: 'wrapped',
    },
    device = {
      ...creatorDialogFrame(3).fields[0],
      name: 'device',
      width: 180,
      color: [32, 160, 224, 128],
    },
    nowrap = { ...creatorDialogFrame(1).fields[0], name: 'device-nowrap', width: 160 },
    inline = { ...nowrap, name: 'inline-advances', deviceFont: false },
    primitive = creatorDialogFrame(2).art.find((leaf) => leaf.kind === 'text')!;
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <div style={{ position: 'relative', height: 450, background: '#0b3c5a' }}>
        <CreatorText field={caption} text="Click and Drag Object" x={20} y={20} />
        <CreatorText field={cost} text="12" x={20} y={60} />
        <CreatorText
          field={wrapped}
          text={'Primary Weapons:\n\n\nSecondary Weapons:'}
          x={20}
          y={100}
        />
        <CreatorText field={{ ...cost, name: 'clipped' }} text="1234567890" x={20} y={180} />
        <CreatorText
          field={{ ...caption, name: 'right', align: 1 }}
          text="Right"
          x={200}
          y={20}
          opacity={0.5}
        />
        <CreatorText
          field={device}
          text={'First device line\rSecond device line\rThird device line'}
          x={20}
          y={240}
        />
        <CreatorText
          field={nowrap}
          text="A very long device label that stays on one line"
          x={20}
          y={315}
        />
        <CreatorText field={inline} text="BC" x={200} y={60} />
        <svg
          data-primitive-font
          aria-hidden="true"
          viewBox="-2 -32 260 48"
          width={260}
          height={48}
          style={{ position: 'absolute', left: 200, top: 150 }}
        >
          <CreatorPrimitives
            pieces={[{ ...primitive, matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } }]}
          />
        </svg>
      </div>
    </StrictMode>,
  );
  return () => {
    root.unmount();
    delete host.dataset.creatorText;
  };
}
