import { Application, Rectangle } from 'pixi.js';
import { AssetPack } from '../../src/game/assets/asset-pack';
import type { SwfClip } from '../../src/game/assets/swf-clip';
import { PARTS, STARTER } from '../../src/game/data/catalog';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { captureCanvas } from './pixi-capture';

/** Independently sampled supplied/native and procedural trees, using production TankView. */
export async function showMockPartMotion(source: AssetPack, host: HTMLElement, bodies = false) {
  const mock = await AssetPack.mock(),
    packs = [source, mock],
    textures = new SwfTextures();
  const app = new Application();
  await app.init({
    width: 142,
    height: 70,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  const parts = PARTS.filter((p) =>
    bodies ? p.id < 2000 : (p.id >= 4000 && p.id < 5000) || (p.id >= 6001 && p.id <= 6005),
  );
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = Math.ceil(parts.length / 4) * 120;
  canvas.style.height = `${canvas.height / 2}px`;
  host.style.height = `${canvas.height / 2}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#24566a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const digest = (p: SwfClip): unknown => ({
    id: p.id,
    frame: p.frame,
    children: [...p.children.values()].map((c) => ({
      placement: c.placement,
      pose: digest(c.clip),
    })),
  });
  // The longest body clip is Air Bladder2445 with340 frames. Sample beyond its
  // loop boundary as well as the shorter tentacle/sliding/wiggle cycles.
  const phases = bodies
    ? [1, 10, 25, 40, 80, 121, 180, 240, 270, 340, 360, 400]
    : [1, 10, 20, 25, 40, 60];
  const results = [];
  try {
    for (const [index, definition] of parts.entries()) {
      const part = {
        ...STARTER.parts[1],
        key: `reference-${definition.id}`,
        type: definition.id,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      };
      const tanks = packs.map(() => createTank(500, { ...STARTER, parts: [part] }, 'player'));
      const views = packs.map((pack) => new TankView(tanks[0].design, pack, textures));
      for (const view of views) app.stage.addChild(view.container);
      const bounds = source.clipScriptBounds(source.partClip(tanks[0], part));
      const previewScale = bounds ? Math.min(1, 48 / Math.max(bounds.width, bounds.height)) : 1;
      for (const view of views) view.container.scale.set(previewScale);
      const frames = [];
      try {
        for (const age of phases) {
          const captures = packs.map((pack, column) => {
            tanks[column].artAge = age - 1;
            views[column].update(tanks[column]);
            const frame = captureCanvas(app.renderer, {
              target: views[column].container,
              frame: new Rectangle(-71, -35, 142, 70),
              resolution: 2,
            }) as HTMLCanvasElement;
            const pixels = frame
              .getContext('2d')!
              .getImageData(0, 0, frame.width, frame.height).data;
            let hash = 2166136261;
            for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619);
            if (age === 10) {
              ctx.drawImage(
                frame,
                (index % 4) * 275 + column * 137.5,
                Math.floor(index / 4) * 120 + 20,
                137.5,
                67.8,
              );
            }
            return {
              pixels,
              hash: hash >>> 0,
              pose: JSON.stringify(digest(pack.partClip(tanks[column], part))),
            };
          });
          let intersection = 0,
            union = 0;
          for (let i = 3; i < captures[0].pixels.length; i += 4) {
            const a = captures[0].pixels[i] > 64,
              b = captures[1].pixels[i] > 64;
            if (a || b) union++;
            if (a && b) intersection++;
          }
          frames.push({
            age,
            timelineEqual: captures[0].pose === captures[1].pose,
            iou: union ? intersection / union : 1,
            hashes: captures.map((c) => c.hash),
          });
        }
      } finally {
        for (const view of views) view.destroy();
      }
      const x = (index % 4) * 275,
        y = Math.floor(index / 4) * 120;
      ctx.fillStyle = '#e7f7ff';
      ctx.font = '12px Arial';
      ctx.fillText(definition.name, x + 5, y + 15);
      ctx.font = '10px Arial';
      ctx.fillText(source.mode === 'swf' ? 'Original' : 'Mock', x + 48, y + 107);
      ctx.fillText('Procedural', x + 180, y + 107);
      results.push({ id: definition.id, previewScale, frames });
    }
    const opacity = packs.map((pack) => {
      const tank = createTank(
        501,
        {
          ...STARTER,
          parts: [
            { ...STARTER.parts[0], type: 1003, x: -40, y: 0, scale: 1 },
            { ...STARTER.parts[1], type: 4001, x: 40, y: 0, scale: 1 },
          ],
        },
        'player',
      );
      const view = new TankView(tank.design, pack, textures);
      app.stage.addChild(view.container);
      const sample = (alpha: number) => {
        tank.alpha = alpha;
        view.update(tank);
        const frame = captureCanvas(app.renderer, {
          target: view.container,
          frame: new Rectangle(-71, -35, 142, 70),
          resolution: 2,
        }) as HTMLCanvasElement;
        const ctx = frame.getContext('2d')!;
        return [-40, 40].map((x) => ctx.getImageData((x + 71) * 2, 70, 1, 1).data[3]);
      };
      try {
        const full = sample(1),
          half = sample(0.5);
        return half.map((a, i) => a / full[i]);
      } finally {
        view.destroy();
      }
    });
    return { mode: source.mode, bodies, results, opacity };
  } finally {
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    mock.dispose();
    host.replaceChildren(canvas);
  }
}
