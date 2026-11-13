import { createRoot } from 'react-dom/client';
import { useLayoutEffect, useState } from 'react';
import { WinPanel } from '../../src/components/win-panel';
import { GameViewport } from '../../src/components/game-viewport';
import { MainStage } from '../../src/components/main-stage';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { FieldVisit } from '../../src/game/core/field-visit';
import { StageRuntime } from '../../src/game/services/stage-runtime';
import { WinScreen, winShade } from '../../src/game/services/win-screen';
import { World } from '../../src/game/simulation/world';
import { premultiplyBitmap } from '../../src/game/core/bitmap-blur';

/** Production viewport/Main paint and win service, with a manually delivered shared clock.
 * The boss-completion setup is a controlled fixture, not an ordinary earned playthrough.
 */
export function showWinScreen(
  pack: AssetPack,
  host: HTMLElement,
  onAction: (action: string) => void,
  controlled = true,
) {
  const stage = new StageRuntime();
  const advance = stage.advance.bind(stage);
  // Exact cohorts for lifecycle galleries; the accelerated pilot uses a live stage.
  if (controlled) stage.advance = () => {};
  const root = createRoot(host);
  let world: World | null = null,
    previousWorld: World | null = null;
  let win: WinScreen | null = null;
  let refresh = () => {};
  let ready = false,
    generation = 0;
  const controls = document.createElement('div');
  controls.id = 'win-flow-controls';
  const settings = { ...DEFAULT_SETTINGS, sound: false, music: false, shake: false };
  const report = () => {
    host.dataset.worldGeneration = String(generation);
    host.dataset.sameWorld = String(world === previousWorld);
    host.dataset.worldMode = world?.mode ?? 'menu';
    host.dataset.playerAge = String(world?.player.age ?? -1);
    host.dataset.artAge = String(world?.player.artAge ?? -1);
    host.dataset.hitTimer = String(world?.hitSoundTimer ?? -1);
    host.dataset.bossDefeated = String(world?.bossDefeated ?? false);
    host.dataset.backgroundAges = JSON.stringify(stage.background.layers.map((layer) => layer.age));
    host.dataset.retainedBytes = String(win?.history?.retainedBytes ?? 0);
    host.dataset.ready = String(ready);
  };
  const fresh = () => {
    win?.dispose();
    win = null;
    previousWorld = world ?? previousWorld;
    const target = new World([], [STARTER, STARTER], 18 + generation++, stage.effects);
    target.fieldVisit = new FieldVisit();
    target.field.boss = true;
    target.field.cleared = false;
    target.player.status.jam = 20;
    target.dropBubbles({ x: 160, y: 160 }, 5);
    target.onWinScreenOpen = () => {
      host.dataset.birth = JSON.stringify({
        cleared: target.field.cleared,
        completed: target.fieldVisit.completed,
        editEnabled: target.editSlider.enabled,
        forced: target.runtimeFor(target.field).pickups.some((p) => p.forced),
        playerAge: target.player.age,
      });
      const service = new WinScreen(stage, winShade(pack), (action) => {
        host.dataset.disposedBytes = String(service.history?.retainedBytes ?? 0);
        host.dataset.disposedAge = String(service.motion.age);
        win = null;
        previousWorld = target;
        if (action === 'continue') target.continueAfterWin();
        else {
          world = null; // Production shell deactivates/removes World on Menu.
          ready = false;
          stage.background.resume();
        }
        onAction(action);
        report();
        refresh();
      });
      win = service;
      refresh();
    };
    world = target;
    ready = false;
    report();
    refresh();
  };
  const button = (label: string, action: () => void) => {
    const element = document.createElement('button');
    element.textContent = label;
    element.onclick = action;
    controls.appendChild(element);
  };
  button('Complete boss field', () => {
    if (!ready || !world || win) return;
    // Queue an unpainted Main flash. Setup's refresh must paint it ABOVE the shade.
    stage.effects.flash(0xff0000);
    world.hitSoundTimer = 10;
    advance(20, 50);
    report();
  });
  for (const count of [1, 5, 20])
    button(`Win advance ${count}`, () => {
      for (let remaining = count; remaining > 0; remaining -= 5)
        advance(Math.min(5, remaining) * 20, 50); // Shared catch-up cohorts.
      report();
    });
  button('Win save stopped return', () => {
    if (world) world['flow'].saved = 'stopped';
  });
  button('Win new game', fresh);
  button('Compare completion pixels', () => {
    if (!win?.history) return;
    // Counterfactual post-tail capture: compose the live production canvases with
    // the SAME shade/Main layering; never copy the retained win bitmap itself.
    const canvas = document.createElement('canvas');
    canvas.width = 550;
    canvas.height = 450;
    const context = canvas.getContext('2d')!;
    for (const selector of ['.main-background canvas', '.game-canvas canvas']) {
      const source = host.querySelector<HTMLCanvasElement>(selector)!;
      context.drawImage(source, 0, 0, 550, 450);
    }
    winShade(pack)(context);
    const flashes = host.querySelector<HTMLCanvasElement>('.main-flashes')!;
    context.drawImage(flashes, -40, -40, 630, 530);
    const post = premultiplyBitmap(context.getImageData(0, 0, 550, 450).data);
    const pre = win.history.pixels;
    let different = 0;
    for (let i = 0; i < pre.length; i += 4)
      if (pre.slice(i, i + 4).some((value, c) => Math.abs(value - post[i + c]) > 2)) different++;
    // An unobstructed corner also checks Main's red flash stayed above the new shade.
    host.dataset.capturePixels = JSON.stringify({
      different,
      preCorner: [...pre.slice(0, 4)],
      postCorner: [...post.slice(0, 4)],
      captures: win.captureCount,
    });
  });
  host.before(controls);
  function Fixture() {
    const [, revision] = useState(0);
    refresh = () => revision((value) => value + 1);
    useLayoutEffect(
      () => () => {
        refresh = () => {};
      },
      [],
    );
    return (
      <MainStage runtime={stage} fps={50}>
        {world ? (
          <GameViewport
            key={generation}
            world={world}
            pack={pack}
            settings={settings}
            audio={null}
            stage={stage}
            onChange={() => {
              report();
              refresh();
            }}
            onReady={() => {
              ready = true;
              report();
            }}
          />
        ) : null}
        {win ? <WinPanel pack={pack} screen={win} /> : null}
      </MainStage>
    );
  }
  fresh();
  root.render(<Fixture />);
  return () => {
    win?.dispose();
    root.unmount();
    controls.remove();
  };
}
