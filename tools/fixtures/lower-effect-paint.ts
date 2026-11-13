import { Application, Container, Graphics, Sprite } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { FieldLowerEffectsView } from '../../src/game/render/field-lower-effects-view';
import { fieldTransform } from '../../src/game/render/field-transform';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import type { CombatEffectsView } from '../../src/game/render/combat-effects-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { combatEffect } from '../../src/game/simulation/effects';
import { World } from '../../src/game/simulation/world';
import { setEffectFixturePose } from './effect-pose';
import original from '../../tests/fixtures/lower-effect-paint-original.json';

/** Same GLUE disc/positions as the frozen original; no candidate generates expectations. */
export async function showLowerEffectPaint(pack: AssetPack, host: HTMLElement) {
  const app = new Application();
  await app.init({
    width: 120,
    height: 120,
    resolution: 1,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    antialias: true,
  });
  host.appendChild(app.canvas);
  const world = new World([], [], 113),
    textures = new SwfTextures();
  const read = world.fieldDisplays.read(world.field);
  const view = new FieldLowerEffectsView(read, pack, textures);
  view.update({
    field: world.field,
    read,
    transform: fieldTransform(world, world.field, 'underMask'),
  });
  app.stage.addChild(view.root);
  let disc: Container;
  if (pack.mode === 'swf') {
    const raster = await pack.rasterSymbol(1543);
    if (!raster) throw new Error('Missing controlled original disc');
    const sprite = new Sprite(textures.get(raster));
    sprite.position.set(raster.x, raster.y);
    sprite.width = raster.width;
    sprite.height = raster.height;
    disc = new Container();
    disc.addChild(sprite);
  } else
    disc = new Graphics().circle(0, 0, 50).fill(0xbbd9f2).stroke({ color: 0xffffff, width: 1 });
  view.content.addChild(disc);
  const results = [];
  const before = JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]);
  let clippedPaint = '';
  try {
    for (const [i, sample] of original.samples.entries()) {
      app.stage.position.set(60 - sample.x, 60 - sample.y);
      disc.position.set(sample.x, sample.y);
      disc.visible = sample.mode !== 'hidden';
      view.maskSlot.angle = sample.rotation;
      if (sample.mode === 'bare') {
        view.content.mask = null;
        // Original draw(target) excludes the mask's separate parent branch.
        view.maskSlot.visible = false;
      }
      app.render();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 120;
      const context = canvas.getContext('2d')!;
      context.drawImage(app.canvas, 0, 0);
      const pixels = original.points.map(([x, y]) => [
        ...context.getImageData(60 + x, 60 + y, 1, 1).data,
      ]);
      results.push({ i, pixels });
      if (sample.mode === 'masked' && sample.x === 425 && sample.y === 0 && sample.rotation === 0)
        clippedPaint = canvas.toDataURL();
    }
    return {
      results,
      clippedPaint,
      pure: before === JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]),
      game: await gameControl(pack, host),
    };
  } finally {
    app.destroy(true, { children: true });
    textures.destroy();
  }
}

/** Real engine CreateEffect/reparenting through GameRenderer, with a deliberately absent-mask control. */
async function gameControl(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 114),
    renderer = new GameRenderer(pack, true);
  const settings = { ...DEFAULT_SETTINGS, quality: 'low' as const, zoom: 1 };
  await renderer.init(host, settings);
  world.fieldDisplays.moveCurrent(world.field, { x: 400, y: 0 });
  const effect = combatEffect(
    7001,
    'impact',
    { layer: 'bottom', randomRotation: false, scale: 3 },
    world.effectEngine.artwork,
  );
  setEffectFixturePose(effect, 6, { x: 420, y: 0 });
  world.effectEngine.create(effect, 'bottom', world.field);
  const effects = (renderer as unknown as { combatEffects: CombatEffectsView }).combatEffects;
  const draw = () => {
    renderer.draw(world, settings);
    for (const child of renderer.app.stage.children) child.visible = child === renderer.root;
    for (const child of renderer.root.children) child.visible = child === effects.bottom;
    renderer.app.render();
  };
  const count = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 550;
    canvas.height = 450;
    const context = canvas.getContext('2d')!;
    context.drawImage(renderer.app.canvas, 0, 0);
    const pixels = context.getImageData(0, 0, 550, 450).data;
    let painted = 0,
      outside = 0;
    for (let y = 0; y < 450; y++)
      for (let x = 0; x < 550; x++)
        if (pixels[(y * 550 + x) * 4 + 3] > 16) {
          painted++;
          if (x >= 302) outside++;
        }
    return { painted, outside, png: canvas.toDataURL() };
  };
  try {
    const before = JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]);
    draw();
    const lower = effects.lower(world.field);
    if (!lower) throw new Error('Production lower-effect mask projection absent');
    const node = lower.content.children[0];
    const masked = count();
    const mask = lower.content.mask;
    lower.content.mask = null;
    lower.maskSlot.visible = false;
    renderer.app.render();
    const bare = count();
    lower.content.mask = mask;
    lower.maskSlot.visible = true;
    draw();
    const pure =
      before === JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]);
    const stable = effects.lower(world.field) === lower && lower.content.children[0] === node;
    world.effectEngine.create(effect, 'top', world.field);
    draw();
    const reparented = effects.top.children.includes(node) && lower.content.children.length === 0;
    world.effectEngine.detachLayer(world.effectEngine.layer(world.field, 'bottom')!);
    draw();
    return {
      masked,
      bare,
      pure,
      stable,
      reparented,
      disposed: lower.root.destroyed && !effects.lower(world.field) && !node.destroyed,
    };
  } finally {
    renderer.destroy();
  }
}
