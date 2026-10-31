import { Application, Sprite, Texture } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { CONTACT_IDENTITY, descendContact } from '../../src/game/assets/contact-transform';
import { SwfClip } from '../../src/game/assets/swf-clip';
import { MAIN_MENU, MainMenuMotion } from '../../src/game/core/main-menu';
import { menuLocal } from '../../src/game/core/menu-hit';
import { MainMenuView } from '../../src/game/render/main-menu-view';
import { MainBackgroundView } from '../../src/game/render/main-background-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import reference from '../../tests/fixtures/menu-pointer-reference.json';

/** Query production native geometry using independently observed source hover states. */
export async function showNativeMenuPicking(pack: AssetPack, host: HTMLElement) {
  delete host.dataset.nativeMenuPicks;
  if (pack.mode !== 'swf') {
    host.textContent = 'Supply the original SWF to inspect native menu picking.';
    return () => host.replaceChildren();
  }
  const app = new Application(),
    textures = new SwfTextures(),
    motion = new MainMenuMotion();
  let view: MainMenuView | undefined, background: Texture | undefined;
  const dispose = () => {
    view?.destroy();
    if (app.renderer) app.destroy({ removeView: true }, { children: true });
    background?.destroy(true);
    textures.destroy();
    delete host.dataset.nativeMenuPicks;
  };
  try {
    await app.init({
      width: 550,
      height: 450,
      resolution: 2,
      backgroundAlpha: 0,
      autoStart: false,
      preference: 'webgl',
      antialias: true,
    });
    host.appendChild(app.canvas);
    view = new MainMenuView(pack, textures);
    background = Texture.from(new MainBackgroundView().canvas);
    app.stage.addChild(new Sprite(background), view.root);
    const advance = (count: number) => {
      for (let i = 0; i < count; i++) motion.advance();
      view!.update(motion);
    };
    advance(196);
    let previousControl: string | undefined;
    const samples = reference.observations
      .filter((sample) => sample.target)
      .map((sample) => {
        const control = sample.target!.name === 'inner' ? sample.target!.parent : undefined;
        // Drive the pose from the source observation, never from the picker's own answer.
        if (previousControl !== control) {
          if (previousControl) view!.hover(previousControl, false);
          if (control) view!.hover(control, true);
        }
        previousControl = control;
        advance(20);
        return { label: sample.label, target: view!.hit(sample, motion) ?? null };
      });
    const corners = MAIN_MENU.controls.map((piece) => ({
      name: piece.name,
      target:
        view!.hit(
          {
            x: piece.matrix.tx / 20 + (piece.bounds.x + 0.2) * piece.matrix.a,
            y: piece.matrix.ty / 20 + (piece.bounds.y + 0.2) * piece.matrix.d,
          },
          motion,
        ) ?? null,
    }));
    if (previousControl) view.hover(previousControl, false);
    view.hover('play_btn', true);
    view.update(motion);
    const play = MAIN_MENU.controls.find((piece) => piece.name === 'play_btn')!,
      pose = new SwfClip(play.symbol, pack);
    pose.advance(1);
    const inner = [...pose.children.values()].find((child) => child.placement.name === 'inner')!;
    inner.clip.gotoAndPlay(2);
    const inverse = descendContact(
      descendContact(CONTACT_IDENTITY, play.matrix)!,
      inner.placement.matrix,
    )!;
    let stroke:
      { x: number; y: number; target: ReturnType<MainMenuView['hit']> | null } | undefined;
    // Frame2 uses stroked morph489; the stopped frame7 switches back to unstroked shape488.
    // Find a real transparent stroke point where omitted Play scale changes contact.
    for (let x = -5; x <= 5 && !stroke; x += 0.125) {
      for (let y = 0; y <= play.bounds.height && !stroke; y += 0.125) {
        const local = menuLocal({ x, y }, inner.placement.matrix)!;
        if (
          !pack.hitClip(inner.clip, local.x, local.y) ||
          pack.hitClip(inner.clip, local.x, local.y, 0, inverse)
        )
          continue;
        const point = {
          x: play.matrix.a * x + play.matrix.c * y + play.matrix.tx / 20,
          y: play.matrix.b * x + play.matrix.d * y + play.matrix.ty / 20,
        };
        stroke = { ...point, target: view.hit(point, motion) ?? null };
      }
    }
    view.hover('play_btn', false);
    const series = [];
    for (let frame = 1; frame <= 19; frame++) {
      motion.series.pose.gotoAndStop(frame);
      view.update(motion);
      series.push({
        frame,
        generic: view.hit({ x: 50, y: 431 }, motion) ?? null,
        corner: view.hit({ x: 5.1, y: 420.1 }, motion) ?? null,
        links: [175, 235.8, 300.1, 369.025].map((x) => view!.hit({ x, y: 431 }, motion) ?? null),
      });
    }
    motion.series.pose.gotoAndStop(10);
    view.update(motion);
    app.render();
    host.dataset.nativeMenuPicks = JSON.stringify({ samples, corners, stroke, series });
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
