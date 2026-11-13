import { importActorFixtures } from './actor-attachments';
import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { captureFrame } from './pixi-capture';

/** Real active World frames and production paint, sampled with an opaque reference pose. */
export async function showPhasing(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 31);
  world.rng.next = () => 0.5;
  world.hitTest = () => false;
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      id: 'E-phasing-fixture',
      avatar: false,
      speed: 0,
      life: 100,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 6004 }],
    },
    'enemy',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  world.field.enemies = [tank];
  importActorFixtures(world);
  world.field.cleared = false;
  tank.guns[0].phasing!.counter = 0;
  // Retain one art pose: changing body geometry must not masquerade as an alpha change.
  const painted = { ...tank };
  const view = new TankView(tank.design, pack, textures);
  await app.init({
    width: 110,
    height: 110,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  app.stage.addChild(view.container);
  view.container.position.set(55, 55);
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const ctx = gallery.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const samples: { frame: number; counter: number; alpha: number; ink: number }[] = [];
  let frame = 0;
  for (const target of [0, 20, 50, 150, 200, 300]) {
    while (frame < target) {
      world.step(emptyInput());
      frame++;
    }
    painted.alpha = tank.alpha;
    view.update(painted);
    const captured = captureFrame(app.renderer, { target: app.stage });
    let ink = 0;
    for (let i = 3; i < captured.pixels.length; i += 4) ink += captured.pixels[i];
    const cell = samples.length,
      x = (cell % 3) * 180,
      y = Math.floor(cell / 3) * 210;
    ctx.drawImage(captured.canvas, x + 30, y + 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Run ${frame}: ${tank.alpha}`, x + 6, y + 20);
    samples.push({ frame, counter: tank.guns[0].phasing!.counter, alpha: tank.alpha, ink });
  }
  const before = { counter: tank.guns[0].phasing!.counter, alpha: tank.alpha };
  world.pause();
  for (let i = 0; i < 20; i++) world.step(emptyInput());
  const paused = { counter: tank.guns[0].phasing!.counter, alpha: tank.alpha };
  view.destroy();
  textures.destroy();
  app.destroy(true, { children: true });
  host.appendChild(gallery);
  return { samples, before, paused };
}
