import { Application, Container } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { World } from '../../src/game/simulation/world';
import { FieldCaptions } from '../../src/game/render/field-captions';
import { EditSliderView } from '../../src/game/render/edit-slider-view';
import { EditSliderState } from '../../src/game/core/edit-slider';
import { SwfTextures } from '../../src/game/render/swf-textures';

export async function showFieldOverlayProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 50);
  await app.init({
    width: 550,
    height: 450,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const captions = new FieldCaptions(pack, textures),
    camera = new Container();
  camera.position.set(275, 225);
  camera.addChild(captions.root);
  app.stage.addChild(camera);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const draw = () => {
    captions.update(world);
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
    return ctx.getImageData(0, 0, 550, 450).data;
  };
  const coverage = (pixels: Uint8ClampedArray) => {
    let count = 0,
      hash = 2166136261,
      minX = 550;
    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = pixels[i];
      hash = Math.imul(hash ^ alpha, 16777619);
      if (alpha) {
        count++;
        minX = Math.min(minX, ((i - 3) / 4) % 550);
      }
    }
    return { count, hash, minX };
  };
  const sliders: EditSliderView[] = [];
  try {
    const stages = [];
    for (let stage = 0; stage <= 4; stage++) {
      world.field.tutorial = stage;
      stages.push(coverage(draw()).count);
    }
    world.field.tutorial = 1;
    const initial = coverage(draw());
    world.field.scale = 2;
    const scaledField = coverage(draw());
    camera.x -= 80;
    const moved = coverage(draw());
    camera.visible = false;
    const states = [];
    for (const mode of [1, 2, 3] as const) {
      const state = new EditSliderState();
      state.trigger(1, mode);
      for (let i = 0; i < 100; i++) state.advance();
      const slider = new EditSliderView(pack, textures);
      slider.update(state);
      sliders.push(slider);
      app.stage.addChild(slider.root);
      states.push(state);
    }
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
    const normal = ctx.getImageData(20, 132, 1, 1).data[3];
    states[0].hovered = true;
    sliders[0].update(states[0]);
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
    const hovered = ctx.getImageData(20, 132, 1, 1).data[3];
    return {
      stages,
      fieldScalePreserved: initial.hash === scaledField.hash,
      cameraShift: moved.minX - initial.minX,
      normal,
      hovered,
      sliderWidths: states.map((s) => s.layout.bounds.width),
    };
  } finally {
    for (const slider of sliders) slider.destroy();
    captions.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
}
