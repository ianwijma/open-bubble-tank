import { setEffectFixturePose } from './effect-pose';
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
  app.stage.addChild(view.bottom, occluder, view.top, view.screen);
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
      world.step(emptyInput());
      view.update(world.effects);
      draw();
      if ([1, 13, 25].includes(frame))
        trailSamples.push({
          frame,
          // Compatibility visual offset; stageAge separately records actual clock telemetry.
          age: trail.frame! - 1,
          stageAge: trail.age,
          alpha: pixel(100, 60)[3],
          count: world.effects.length,
        });
    }
    world.mode = 'playing';
    // Explicit Run poll at the presented final frame; a new stage entry would wrap first.
    world.effectEngine.poll();
    view.update(world.effects);
    draw();
    const removed = { count: world.effects.length, ink: ink().count };
    // Late first paint must use the independently running retained tree, including
    // the stopped103 descendant and its still-running14-frame child.
    const retainedWorld = new World([], [], 11);
    retainedWorld.mode = 'paused';
    const late = retainedWorld.addCombatEffect({ x: 0, y: 0 }, 'collapse', {}, true);
    for (let i = 0; i < 121; i++) retainedWorld.step(emptyInput());
    const pose = late.playback!.pose;
    const stopped = [...pose.children.values()].find((child) => child.clip.id === 2069)!.clip;
    const nested = [...stopped.children.values()].find((child) => child.clip.id === 2068)!.clip;
    const before = [pose.age, pose.frame, stopped.frame, nested.frame];
    view.update([late]);
    const nativeView = view['nodes'].get(late);
    const retainedProof = {
      frame: late.frame,
      stopped: stopped.frame,
      nested: nested.frame,
      exactPose: pack.mode === 'swf' ? nativeView?.['renderedPose'] === pose : null,
      pureRead: false,
    };
    view.update([late]);
    retainedProof.pureRead = before.every(
      (value, i) => value === [pose.age, pose.frame, stopped.frame, nested.frame][i],
    );
    view.update([]);
    const gallery = [];
    const entries = Object.entries(art) as [CombatEffect, typeof art.impact][];
    for (let index = 0; index < entries.length; index++) {
      const [key, clip] = entries[index];
      const effect = combatEffect(
        index + 100,
        key,
        {
          line: key === 'rocketTrail' ? { x: -90, y: 0 } : undefined,
        },
        world.effectEngine.artwork,
      );
      setEffectFixturePose(effect, Math.min(3, clip.frames - 2), { x: 275, y: 225 });
      view.update([effect]);
      draw();
      gallery.push({ key, symbol: clip.symbol, ...ink() });
    }
    const bottom = combatEffect(1000, 'areaBurst', {}, world.effectEngine.artwork);
    setEffectFixturePose(bottom, 10, { x: 275, y: 225 });
    occluder.rect(0, 0, 550, 450).fill(0x123456);
    view.update([bottom]);
    draw();
    const hiddenBottom = ink().hash;
    view.update([]);
    draw();
    const coveredHash = ink().hash;
    const impact = combatEffect(1001, 'impact', {}, world.effectEngine.artwork);
    setEffectFixturePose(impact, 2, { x: 275, y: 225 });
    view.update([impact]);
    draw();
    const topHash = ink().hash;
    occluder.clear();
    const effects = entries.map(([key, clip], i) => {
      const effect = combatEffect(
        i + 2000,
        key,
        { scale: 0.35, line: key === 'rocketTrail' ? { x: -150, y: 0 } : undefined },
        world.effectEngine.artwork,
      );
      setEffectFixturePose(effect, Math.min(3, clip.frames - 2), {
        x: 70 + (i % 4) * 137,
        y: 75 + Math.floor(i / 4) * 150,
      });
      return effect;
    });
    view.update(effects);
    draw();
    return { trailSamples, removed, retainedProof, gallery, hiddenBottom, coveredHash, topHash };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(canvas);
  }
}
