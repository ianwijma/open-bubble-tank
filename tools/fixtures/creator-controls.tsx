import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { CreatorButton, CreatorSlider } from '../../src/components/creator-controls';
import { CREATOR_CONTROLS } from '../../src/game/core/creator-controls';
import type { AssetPack } from '../../src/game/assets/asset-pack';

function ControlsFixture({
  pack,
  host,
  controlsHost,
}: {
  pack: AssetPack;
  host: HTMLElement;
  controlsHost: HTMLElement;
}) {
  const [checked, setChecked] = useState(true),
    [undo, setUndo] = useState(false),
    [scale, setScale] = useState(1),
    [rotation, setRotation] = useState(0),
    [resetKey, setResetKey] = useState({}),
    [x, setX] = useState(0);
  const held = useRef(0),
    before = useRef(1);
  const report = (name: string, value: unknown) => {
    host.dataset[name] = JSON.stringify(value);
  };
  const record = (name: string) => report(name, Number(host.dataset[name] ?? '0') + 1);
  const labels: Record<string, string> = {
    SymmetricMode_mc: 'Symmetric Mode',
    LoadTank_mc: 'Load tank',
    SaveExit_mc: 'Save and exit',
    Exit_mc: 'Exit tank creator',
    DeleteButton_mc: 'Delete selected',
    BringFront_mc: 'Bring to front',
    SendBack_mc: 'Send to back',
    AlignCenter_mc: 'Align to center',
    Undo_mc: 'Undo',
    Left_mc: 'Nudge left',
    Right_mc: 'Nudge right',
  };
  return (
    <>
      <div className="creator stage-background" data-assets={pack.mode}>
        {CREATOR_CONTROLS.controls.map((c) => {
          const direction = c.name === 'Left_mc' ? -1 : c.name === 'Right_mc' ? 1 : 0;
          return (
            <CreatorButton
              key={c.name}
              pack={pack}
              name={c.name}
              label={labels[c.name]}
              checked={c.name === 'SymmetricMode_mc' ? checked : undefined}
              disabled={c.name === 'Undo_mc' && !undo}
              onClick={() => {
                if (c.name === 'SymmetricMode_mc') setChecked((v) => !v);
                if (direction) setX((v) => v + direction);
                record('controlClicks');
              }}
              onHoldStart={
                direction
                  ? () => {
                      held.current = direction;
                      record('holdStarts');
                    }
                  : undefined
              }
              onHoldEnd={
                direction
                  ? (click) => {
                      held.current = 0;
                      if (click) setX((v) => v + direction);
                      record('holdEnds');
                      report('holdClick', click);
                    }
                  : undefined
              }
            />
          );
        })}
        {CREATOR_CONTROLS.sliders.map((layout) => {
          const resize = layout.name === 'Resize_mc';
          return (
            <CreatorSlider
              key={layout.name}
              pack={pack}
              layout={layout}
              label={resize ? 'Part scale' : 'Part rotation'}
              value={resize ? scale : rotation}
              resetKey={resetKey}
              min={resize ? 0.5 : 0}
              max={resize ? 2 : 360}
              onBegin={() => {
                before.current = resize ? scale : rotation;
                record('sliderBegins');
              }}
              onChange={(v) => {
                if (resize) setScale(v);
                else setRotation(v);
                record('sliderChanges');
              }}
              onEnd={(cancel) => {
                if (cancel) {
                  if (resize) setScale(before.current);
                  else setRotation(before.current);
                }
                record('sliderEnds');
                report('sliderCancel', cancel);
              }}
            />
          );
        })}
        <span className="sr-only" data-control-values>
          {JSON.stringify({ checked, scale, rotation, x })}
        </span>
      </div>
      {createPortal(
        <div>
          <button onClick={() => setUndo((v) => !v)}>Toggle fixture undo</button>
          <button
            onClick={() => {
              setScale(3);
              setResetKey({});
            }}
          >
            Load fixture scale 3
          </button>
          <button
            onClick={() => {
              setScale(1);
              setRotation(0);
              setResetKey({});
            }}
          >
            Reset fixture selection
          </button>
          <button onClick={() => setX((v) => v + held.current * 3)}>
            Step fixture hold 3 frames
          </button>
        </div>,
        controlsHost,
      )}
    </>
  );
}
export function showCreatorControls(pack: AssetPack, host: HTMLElement) {
  for (const name of [
    'controlClicks',
    'holdStarts',
    'holdEnds',
    'sliderBegins',
    'sliderChanges',
    'sliderEnds',
  ])
    host.dataset[name] = '0';
  const controlsHost = document.createElement('div');
  controlsHost.id = 'creator-component-fixture-controls';
  host.before(controlsHost);
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <ControlsFixture pack={pack} host={host} controlsHost={controlsHost} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controlsHost.remove();
  };
}
