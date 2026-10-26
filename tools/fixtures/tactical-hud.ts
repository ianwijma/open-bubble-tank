import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { TacticalHudState } from '../../src/game/core/tactical-hud';
import { TacticalHudView } from '../../src/game/render/tactical-hud-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { HudView } from '../../src/game/render/hud-view';
import { EditSliderView } from '../../src/game/render/edit-slider-view';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';

/** Native overlay artwork in isolation, with authored frames, fixed HUD sizes and fill overrides. */
export async function showTacticalHudProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    state = new TacticalHudState();
  await app.init({
    width: 550,
    height: 450,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const view = new TacticalHudView(pack, textures);
  const hud = new HudView(pack, textures),
    edit = new EditSliderView(pack, textures);
  app.stage.addChild(view.root);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const copy = () => {
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
  };
  const draw = () => {
    view.update(state);
    app.render();
    copy();
  };
  const hash = () => {
    let value = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      value = Math.imul(value ^ byte, 16777619);
    return value >>> 0;
  };
  const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
  const ring = (x: number) => {
    const data = ctx.getImageData(x - 38, 82, 76, 76).data;
    let ink = 0,
      hash = 2166136261;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]) ink++;
      for (let c = 0; c < 4; c++) hash = Math.imul(hash ^ data[i + c], 16777619);
    }
    return { ink, hash: hash >>> 0 };
  };
  const barWidth = (x: number) => {
    let first = 550,
      last = -1;
    for (let dx = -70; dx <= 70; dx++)
      if (alpha(x + dx, 300) > 16) {
        first = Math.min(first, dx);
        last = Math.max(last, dx);
      }
    return last - first + 1;
  };
  try {
    draw();
    const empty = alpha(100, 120);
    state.allies = [1, 51, 100].map((frame, i) => ({
      uid: i,
      x: 100 + i * 175,
      y: 120,
      width: 63,
      frame,
    }));
    state.passives = [20, 60, 120].map((width, i) => ({
      kind: 'health',
      uid: i,
      x: 100 + i * 175,
      y: 300,
      width,
      fill: 0.5,
    }));
    state.passives.push(
      ...[0, 90, 180, -90].map((angle, uid) => ({ kind: 'radar' as const, uid, angle })),
    );
    draw();
    const proof = {
      empty,
      rings: [100, 275, 450].map(ring),
      barWidths: [100, 275, 450].map(barWidth),
      filled: alpha(420, 300),
      unfilled: alpha(480, 300),
      arrows: [
        [485, 225],
        [275, 435],
        [65, 225],
        [275, 15],
      ].map(([x, y]) => alpha(x, y)),
      cleared: 0,
      collapseUiFrozen: false,
      collapseFrames: 0,
    };
    const allies = state.allies,
      passives = state.passives;
    state.clear();
    draw();
    proof.cleared = [...ctx.getImageData(0, 0, 550, 450).data].filter(
      (v, i) => i % 4 === 3 && v > 0,
    ).length;
    const design = {
      ...STARTER,
      parts: [
        ...STARTER.parts,
        ...[5001, 5002].map((type, i) => ({ ...STARTER.parts[1], key: `interface${i}`, type })),
      ],
    };
    const world = new World([], [STARTER, design], 50);
    world.field.enemies = [createTank(1000, STARTER, 'enemy', 350, 0)];
    world.allies = [createTank(1001, STARTER, 'ally', -100, 0)];
    world.editSlider.trigger(1, 1);
    world.step({ ...emptyInput(), fire: true });
    world.beginCollapse(0);
    app.stage.addChild(hud.root, edit.root);
    const drawWorldHud = () => {
      view.update(world.tacticalHud);
      hud.update(world);
      edit.update(world.editSlider);
      app.render();
      copy();
    };
    drawWorldHud();
    const initial = hash();
    for (let i = 0; i < 20; i++) world.step({ ...emptyInput(), fire: true });
    drawWorldHud();
    proof.collapseUiFrozen = initial === hash();
    proof.collapseFrames = world.collapse?.age ?? 0;
    app.stage.removeChild(hud.root, edit.root);
    state.allies = allies;
    state.passives = passives;
    draw();
    return proof;
  } finally {
    hud.destroy();
    edit.destroy();
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
}
