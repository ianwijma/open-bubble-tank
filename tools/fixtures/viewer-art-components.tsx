import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  ViewerArt,
  ViewerButton,
  ViewerFields,
  ViewerGroup,
  useViewerArtwork,
} from '../../src/components/tank-viewer-art';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { TANK_VIEWER, viewerRoot } from '../../src/game/core/tank-viewer';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { STARTER } from '../../src/game/data/catalog';

const matrix = (x: number, y: number) => ({ a: 1, b: 0, c: 0, d: 1, tx: x * 20, ty: y * 20 });
const large = {
  ...STARTER,
  parts: [{ ...STARTER.parts[0], type: 1005, scale: 4, x: 0, y: 0, rotation: 0 }],
};
const animated = {
  ...STARTER,
  parts: [{ ...STARTER.parts[0], type: 1504, x: 0, y: 0, rotation: 0 }],
};

function Artwork({
  pack,
  stage,
  fit,
  active,
  generation,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  fit: boolean;
  active: boolean;
  generation: number;
}) {
  const first = useRef<HTMLCanvasElement>(null),
    second = useRef<HTMLCanvasElement>(null);
  const jobs = [
    { key: 'large', tank: large, fit, canvas: () => first.current },
    ...(active
      ? [
          {
            key: `animated:${generation}`,
            tank: animated,
            fit: false,
            canvas: () => second.current,
          },
        ]
      : []),
  ];
  const error = useViewerArtwork(pack, stage, jobs);
  return (
    <>
      {error ? <span role="alert">{error}</span> : null}
      {[first, second].map((ref, i) => {
        if (i === 1 && !active) return null;
        return (
          <ViewerGroup key={i} matrix={matrix(130 + i * 280, 160)}>
            <ViewerArt pack={pack} symbol={1176} />
            <ViewerFields
              pack={pack}
              symbol={1176}
              values={{ largeName_txt: i ? 'Live pose' : 'Fitted tank' }}
              opacities={{ largeAuthor_txt: 0.35 }}
            />
            <div
              className="viewer-preview-mask"
              style={{
                left: TANK_VIEWER.mask.x,
                top: TANK_VIEWER.mask.y,
                width: TANK_VIEWER.mask.width,
                height: TANK_VIEWER.mask.height,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -TANK_VIEWER.mask.x,
                  top: -TANK_VIEWER.mask.y,
                }}
              >
                <canvas
                  ref={ref}
                  className="viewer-tank-art"
                  aria-label={i ? 'Animated tank' : 'Sized tank'}
                  width={1100}
                  height={1100}
                />
              </div>
            </div>
          </ViewerGroup>
        );
      })}
    </>
  );
}
function Fixture({
  pack,
  stage,
  controls,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  controls: HTMLElement;
}) {
  const [fit, setFit] = useState(true),
    [active, setActive] = useState(true),
    [generation, setGeneration] = useState(0),
    [mounted, setMounted] = useState(true),
    [disabled, setDisabled] = useState(false),
    [done, setDone] = useState(false),
    [hover, setHover] = useState(''),
    [clicks, setClicks] = useState(0);
  return (
    <>
      <div
        data-viewer-components
        data-fit={fit}
        data-active={active}
        data-generation={generation}
        style={{ position: 'absolute', inset: 0 }}
      >
        {mounted ? (
          <Artwork pack={pack} stage={stage} fit={fit} active={active} generation={generation} />
        ) : null}
        <ViewerButton
          pack={pack}
          piece={viewerRoot('btnNext_mc')}
          label="Next tank"
          disabled={disabled}
          done={done}
          onClick={() => setClicks((n) => n + 1)}
          onHover={setHover}
        />
        <output aria-label="Hover description" style={{ position: 'absolute', top: 330 }}>
          {hover}
        </output>
        <output aria-label="Button clicks" style={{ position: 'absolute', top: 350 }}>
          {clicks}
        </output>
      </div>
      {createPortal(
        <>
          <button onClick={() => stage.advance(20, 50)}>Advance one frame</button>
          <button
            onClick={() => {
              for (let i = 0; i < 20; i++) stage.advance(20, 50);
            }}
          >
            Advance twenty frames
          </button>
          <button onClick={() => stage.advance(0, 50)}>Redraw held frame</button>
          <button onClick={() => setFit((v) => !v)}>Toggle fit</button>
          <button onClick={() => setActive((v) => !v)}>Toggle animated job</button>
          <button onClick={() => setGeneration((v) => v + 1)}>Replace animated job</button>
          <button onClick={() => setDisabled((v) => !v)}>Toggle disabled</button>
          <button onClick={() => setDone((v) => !v)}>Toggle done</button>
          <button onClick={() => setMounted(false)}>Unmount artwork</button>
        </>,
        controls,
      )}
    </>
  );
}
export function showViewerArtComponents(pack: AssetPack, host: HTMLElement) {
  const stage = new StageRuntime(),
    controls = document.createElement('div');
  host.after(controls);
  const subscribe = stage.subscribe.bind(stage);
  let subscribers = 0;
  host.dataset.viewerSubscriptions = '0';
  stage.subscribe = (listener) => {
    host.dataset.viewerSubscriptions = String(++subscribers);
    const unsubscribe = subscribe(listener);
    return () => {
      unsubscribe();
      host.dataset.viewerSubscriptions = String(--subscribers);
    };
  };
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <Fixture pack={pack} stage={stage} controls={controls} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    controls.remove();
  };
}
