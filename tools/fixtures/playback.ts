import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER, partById } from '../../src/game/data/catalog';
import { createTank } from '../../src/game/simulation/tank';
import { SwfSymbolView } from '../../src/game/render/swf-symbol-view';
import { SwfTextures } from '../../src/game/render/swf-textures';

/** Compare retained-pose alpha contact with pixels actually rendered by WebGL. */
export async function showPlaybackProof(pack: AssetPack, host: HTMLElement) {
  const output = document.createElement('canvas');
  output.width = 550;
  output.height = 450;
  host.replaceChildren(output);
  const ctx = output.getContext('2d')!;
  ctx.fillStyle = '#123e51';
  ctx.fillRect(0, 0, 550, 450);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#dffaff';
  const app = new Application(),
    textures = new SwfTextures();
  await app.init({
    width: 200,
    height: 200,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const sample = document.createElement('canvas');
  sample.width = sample.height = 400;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true })!;
  let solidSamples = 0,
    missedSolid = 0,
    spuriousHits = 0;
  const frames: { type: number; y: number; frames: number[] }[] = [];
  try {
    const cases = [
      [1001, 0],
      [1002, 0],
      [1501, -20],
      [1501, 20],
      [1502, 0],
      [1503, 0],
      [1504, 0],
      [1505, 0],
      [3008, 0],
    ];
    for (const [index, [type, y]] of cases.entries()) {
      const part = { ...STARTER.parts[0], key: 'proof', type, x: 0, y, scale: 1, rotation: 0 };
      const tank = createTank(7000 + index, { ...STARTER, parts: [part] }, 'player', 0, 0);
      const view = new SwfSymbolView(partById(type)!.symbol, pack, textures);
      view.root.position.set(100, 100);
      app.stage.addChild(view.root);
      const observed: number[] = [];
      for (const age of [0, 25, 49, 98]) {
        tank.age = age;
        const pose = pack.partClip(tank, part);
        observed.push(pose.frame);
        view.updatePose(pose);
        app.render();
        sampleCtx.clearRect(0, 0, 400, 400);
        sampleCtx.drawImage(app.canvas, 0, 0);
        const pixels = sampleCtx.getImageData(0, 0, 400, 400).data;
        for (let py = 8; py < 392; py += 4)
          for (let px = 8; px < 392; px += 4) {
            const alphas = [-1, 0, 1].flatMap((dy) =>
              [-1, 0, 1].map((dx) => pixels[((py + dy) * 400 + px + dx) * 4 + 3]),
            );
            const opaque = alphas.every((a) => a > 200),
              transparent = alphas.every((a) => a === 0);
            if (!opaque && !transparent) continue; // Exclude partial alpha and antialiasing boundaries.
            const x = (px + 0.5) / 2 - 100,
              localY = (py + 0.5) / 2 - 100;
            const hit = pack.hitPart(tank, part, x, y + localY);
            if (opaque) {
              solidSamples++;
              if (!hit) missedSolid++;
            } else if (hit) spuriousHits++;
          }
      }
      frames.push({ type, y, frames: observed });
      const x = (index % 3) * 183,
        row = Math.floor(index / 3) * 145;
      ctx.drawImage(app.canvas, x + 40, row + 5, 110, 110);
      ctx.fillText(`${partById(type)!.name}${y ? ` Y=${y}` : ''}`, x + 5, row + 126);
      ctx.fillText(observed.join(' → '), x + 5, row + 140);
      view.destroy();
    }
  } finally {
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
  return { solidSamples, missedSolid, spuriousHits, frames };
}
