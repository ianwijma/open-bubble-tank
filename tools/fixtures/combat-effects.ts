import { Application, Graphics } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import art from '../../src/game/data/effect-art.json';
import { combatEffect, type CombatEffect } from '../../src/game/simulation/effects';
import { CombatEffectsView } from '../../src/game/render/combat-effects-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Isolated pixels exercise the production effect view and simulation lifetime. */
export async function showCombatEffectsProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures();
  await app.init({
    width: 550,
    height: 450,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const view = new CombatEffectsView(pack, textures),
    occluder = new Graphics();
  app.stage.addChild(view.bottom, occluder, view.top);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const draw = () => {
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
  };
  const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
  const ink = () => {
    const data = ctx.getImageData(0, 0, 550, 450).data;
    let count = 0,
      hash = 2166136261;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]) count++;
      for (let c = 0; c < 4; c++) hash = Math.imul(hash ^ data[i + c], 16777619);
    }
    return { count, hash: hash >>> 0 };
  };
  try {
    const world = new World([], [], 1);
    const trail = world.addCombatEffect(
      { x: 180, y: 60 },
      'rocketTrail',
      { line: { x: -120, y: 0 } },
      true,
    );
    world.mode = 'paused';
    const trailSamples = [];
    for (let frame = 1; frame <= 25; frame++) {
      view.update(world.effects);
      draw();
      if ([1, 13, 25].includes(frame))
        trailSamples.push({
          frame,
          age: trail.age,
          alpha: pixel(100, 60)[3],
          count: world.effects.length,
        });
      if (frame < 25) world.step(emptyInput());
    }
    world.mode = 'playing';
    world.step(emptyInput());
    view.update(world.effects);
    draw();
    const removed = { count: world.effects.length, ink: ink().count };
    const gallery = [];
    const entries = Object.entries(art) as [CombatEffect, typeof art.impact][];
    for (let index = 0; index < entries.length; index++) {
      const [key, clip] = entries[index];
      const effect = combatEffect(index + 100, { x: 275, y: 225 }, key, {
        line: key === 'rocketTrail' ? { x: -90, y: 0 } : undefined,
      });
      effect.age = Math.min(3, clip.frames - 2);
      view.update([effect]);
      draw();
      gallery.push({ key, symbol: clip.symbol, ...ink() });
    }
    const bottom = combatEffect(1000, { x: 275, y: 225 }, 'areaBurst', {});
    bottom.age = 10;
    occluder.rect(0, 0, 550, 450).fill(0x123456);
    view.update([bottom]);
    draw();
    const hiddenBottom = ink().hash;
    view.update([]);
    draw();
    const coveredHash = ink().hash;
    const impact = combatEffect(1001, { x: 275, y: 225 }, 'impact', {});
    impact.age = 2;
    view.update([impact]);
    draw();
    const topHash = ink().hash;
    occluder.clear();
    const effects = entries.map(([key, clip], i) => {
      const effect = combatEffect(
        i + 2000,
        { x: 70 + (i % 4) * 137, y: 75 + Math.floor(i / 4) * 150 },
        key,
        { scale: 0.35, line: key === 'rocketTrail' ? { x: -150, y: 0 } : undefined },
      );
      effect.age = Math.min(3, clip.frames - 2);
      return effect;
    });
    view.update(effects);
    draw();
    return { trailSamples, removed, gallery, hiddenBottom, coveredHash, topHash };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(canvas);
  }
}
