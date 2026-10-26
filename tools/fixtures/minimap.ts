import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { World } from '../../src/game/simulation/world';
import { mapPoint } from '../../src/game/core/minimap';
import { MinimapView } from '../../src/game/render/minimap-view';
import { SwfTextures } from '../../src/game/render/swf-textures';

/** Synthetic traversal history makes visited-but-untraveled neighbors visually distinguishable. */
export async function showMinimapProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 50),
    home = world.field;
  const east = { ...home, col: 1, row: 0, cleared: false, destroyed: false };
  const south = { ...home, col: 0, row: 1, cleared: true, destroyed: false };
  const southeast = { ...home, col: 1, row: 1, cleared: true, destroyed: true };
  const far = { ...home, col: 30, row: 0, cleared: false, destroyed: false };
  for (const field of [east, south, southeast, far])
    world.fields.set(`${field.col},${field.row}`, field);
  for (const [i, [from, to]] of [
    [home, east],
    [east, southeast],
    [east, far],
  ].entries())
    world.connections.set(String(i), { from, to });
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
  const view = new MinimapView(pack, textures);
  app.stage.addChild(view.root);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const draw = () => {
    view.update(world);
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
  };
  const alpha = (x: number, y: number) =>
    ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3];
  try {
    draw();
    world.mapMode = 2;
    draw();
    const origin = mapPoint(home, home, 2),
      neighbor = mapPoint(east, home, 2),
      cleared = mapPoint(south, home, 2),
      destroyed = mapPoint(southeast, home, 2);
    const proof = {
      traveled: alpha((origin.x + neighbor.x) / 2, origin.y),
      untraveled: alpha(origin.x, (origin.y + cleared.y) / 2),
      uncleared: alpha(neighbor.x, neighbor.y),
      cleared: alpha(cleared.x, cleared.y),
      destroyed: alpha(destroyed.x, destroyed.y),
      clipped: alpha(430, origin.y),
      hidden: 0,
    };
    world.mapMode = 3;
    draw();
    proof.hidden = alpha(origin.x, origin.y);
    world.mapMode = 2;
    draw();
    return proof;
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
}
