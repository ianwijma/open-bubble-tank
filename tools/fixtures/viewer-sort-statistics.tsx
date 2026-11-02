import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { TankViewerSort } from '../../src/components/tank-viewer-sort';
import { TankViewerStatistics } from '../../src/components/tank-viewer-statistics';
import { ViewerGroup } from '../../src/components/tank-viewer-art';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { ViewerSort } from '../../src/game/core/tank-viewer';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { STARTER } from '../../src/game/data/catalog';

const enemy = {
  ...STARTER,
  avatar: false,
  parts: [4001, 4001, 6003].map((type, i) => ({ ...STARTER.parts[0], key: String(i), type })),
};
function Fixture({
  pack,
  stage,
  controls,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  controls: HTMLElement;
}) {
  const [open, setOpen] = useState(false),
    [enabled, setEnabled] = useState(true),
    [mounted, setMounted] = useState(true),
    [useEnemy, setEnemy] = useState(false),
    [description, setDescription] = useState(''),
    [selected, setSelected] = useState<ViewerSort[]>([]);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, overflow: 'clip' }}>
        {mounted ? (
          <>
            <TankViewerSort
              pack={pack}
              stage={stage}
              open={open}
              enabled={enabled}
              onOpen={setOpen}
              onHover={setDescription}
              onSort={(sort) => {
                setSelected((items) => [...items, sort]);
                setOpen(false);
              }}
            />
            <ViewerGroup matrix={{ a: 1, b: 0, c: 0, d: 1, tx: 400, ty: 4600 }}>
              <TankViewerStatistics
                pack={pack}
                stage={stage}
                tank={useEnemy ? enemy : STARTER}
                onHover={setDescription}
              />
            </ViewerGroup>
          </>
        ) : null}
        <output
          aria-label="Widget description"
          style={{ position: 'absolute', left: 10, top: 410 }}
        >
          {description}
        </output>
        <output aria-label="Selected sorts" style={{ position: 'absolute', left: 10, top: 430 }}>
          {selected.join(',')}
        </output>
      </div>
      {createPortal(
        <>
          <button onClick={() => stage.advance(20, 50)}>Advance one frame</button>
          <button
            onClick={() => {
              for (let i = 0; i < 9; i++) stage.advance(20, 50);
            }}
          >
            Advance nine frames
          </button>
          <button
            onClick={() => {
              for (let i = 0; i < 20; i++) stage.advance(20, 50);
            }}
          >
            Advance twenty frames
          </button>
          <button onClick={() => setEnabled((value) => !value)}>Toggle sort enabled</button>
          <button onClick={() => setEnemy((value) => !value)}>Toggle tank type</button>
          <button onClick={() => setMounted(false)}>Unmount widgets</button>
        </>,
        controls,
      )}
    </>
  );
}
export function showViewerSortStatistics(pack: AssetPack, host: HTMLElement) {
  const stage = new StageRuntime(),
    controls = document.createElement('div');
  host.after(controls);
  let count = 0;
  const subscribe = stage.subscribe.bind(stage);
  host.dataset.viewerWidgetSubscriptions = '0';
  stage.subscribe = (listener) => {
    host.dataset.viewerWidgetSubscriptions = String(++count);
    const unsubscribe = subscribe(listener);
    return () => {
      unsubscribe();
      host.dataset.viewerWidgetSubscriptions = String(--count);
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
