import { Application, Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { massiveChargeFrame } from '../../src/game/core/mounted-art';
import { captureCanvas } from './pixi-capture';

/** Two real mounted guns, independently fired through a paused production World. */
export async function showMountedArt(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 23);
  await app.init({
    width: 250,
    height: 120,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  world.field.enemies = [];
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [0, 1].map((i) => ({
        ...STARTER.parts[1],
        key: `massive-${i}`,
        type: 3008,
        x: i ? 62 : -62,
        y: 0,
        scale: 1,
        rotation: 0,
      })),
    },
    'player',
  );
  const tank = world.player,
    view = new TankView(tank.design, pack, textures);
  app.stage.addChild(view.container);
  world.pause();
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: {
    label: string;
    frames: number[];
    pink: number;
    hash: number;
    extraContact: number;
  }[] = [];
  const samples = Array.from({ length: 70 * 60 }, (_, i) => ({
    x: (i % 70) * 2 - 125,
    y: Math.floor(i / 70) * 2 - 60,
  }));
  const idle = samples.map((p) => pack.hitPart(tank, tank.guns[0].part, p.x, p.y));
  const capture = (label: string) => {
    view.update(tank);
    const frame = captureCanvas(app.renderer, {
      target: view.container,
      frame: new Rectangle(-125, -60, 250, 120),
      resolution: 2,
    }) as HTMLCanvasElement;
    const bytes = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let pink = 0,
      hash = 2166136261;
    for (let i = 0; i < bytes.length; i++) {
      hash = Math.imul(hash ^ bytes[i], 16777619);
      if (
        i % 4 === 0 &&
        bytes[i + 3] > 100 &&
        bytes[i] > 100 &&
        bytes[i] > bytes[i + 1] * 1.3 &&
        bytes[i + 2] > bytes[i + 1] * 1.15
      )
        pink++;
    }
    const frames = tank.guns.map((g) =>
      pack.mode === 'swf'
        ? [...pack.partClip(tank, g.part).children.values()].find(
            (c) => c.placement.name === 'bullet_mc',
          )!.clip.frame
        : massiveChargeFrame(g, tank.artAge),
    );
    const extraContact = samples.filter(
      (p, i) => !idle[i] && pack.hitPart(tank, tank.guns[0].part, p.x, p.y),
    ).length;
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 132);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    panels.push({ label, frames, pink, hash: hash >>> 0, extraContact });
  };
  const tick = (count: number) => {
    for (let i = 0; i < count; i++) world.step(emptyInput());
  };
  const fire = (index: number) => world.fireGun(tank, tank.guns[index], emptyInput());
  try {
    capture('Idle · both charges stopped');
    fire(0);
    tick(8);
    capture('First mount · 8 paused ticks');
    fire(1);
    tick(6);
    fire(0);
    capture('Second mount · independent phase');
    const firstPlayAge = tank.guns[0].mountedPlay!.age;
    tick(13);
    capture('First stopped · second still charging');
    tick(7);
    capture('Second mount · empty frame27');
    tick(1);
    fire(0);
    tick(6);
    capture('First mount · new charge');
    const cloneFrame =
      pack.mode === 'swf'
        ? [...pack.forcefieldPartClip(tank, tank.guns[0].part).children.values()].find(
            (c) => c.placement.name === 'bullet_mc',
          )!.clip.frame
        : 1;
    return {
      mode: pack.mode,
      panels,
      firstPlayAge,
      cloneFrame,
      age: tank.age,
      artAge: tank.artAge,
    };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(canvas);
  }
}
