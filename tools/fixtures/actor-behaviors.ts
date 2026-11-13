import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Real World movement, registered behavior updates and production native/mock drawing. */
export async function showActorBehaviors(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 81),
    renderer = new GameRenderer(pack);
  world.rng.next = () => 0.5;
  world.hitTest = () => false;
  world.player.life = 40;
  world.field.tutorial = 0;
  world.fieldDisplays.selectTutorial(world.field, 0);
  const tanks = [
    [6001, -250, -100],
    [6003, -130, 90],
    [6005, 260, 0],
    [6004, 0, -150],
    [6002, 0, 140],
  ].map(([type, x, y]) =>
    createTank(
      world.nextId(),
      {
        ...STARTER,
        id: `E-behavior-${type}`,
        avatar: false,
        speed: 2,
        life: 100,
        parts: [
          { ...STARTER.parts[0], type: 1003, x: 0, y: 0, scale: 1, radius: 22.5 },
          { ...STARTER.parts[1], type, x: 0, y: -25 },
        ],
      },
      'enemy',
      x,
      y,
      undefined,
      undefined,
      world,
    ),
  );
  tanks[0].rotation = 90;
  tanks[0].life = 50;
  world.field.enemies = tanks;
  importActorFixtures(world);
  world.field.cleared = false;
  const state = () =>
    tanks.map((t) => ({
      id: t.guns[0].part.type,
      x: t.x,
      y: t.y,
      rotation: t.rotation,
      destination: t.movement.swarmPoint && { ...t.movement.swarmPoint },
      wall: t.movement.wallFlower,
      skittish: t.movement.skittish,
      counter: t.guns[0].phasing?.counter,
      wallAge: t.guns[0].wallFlower?.age,
      alpha: t.alpha,
    }));
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 675;
  host.style.height = '675px';
  canvas.style.width = '550px';
  canvas.style.height = '675px';
  const context = canvas.getContext('2d')!;
  await renderer.init(host, DEFAULT_SETTINGS);
  const samples = [];
  let frame = 0;
  try {
    for (const target of [0, 1, 2, 3, 30, 120]) {
      while (frame < target) {
        world.step(emptyInput());
        frame++;
      }
      renderer.draw(world, { ...DEFAULT_SETTINGS, zoom: 0.45, shake: false });
      const column = samples.length % 2,
        row = Math.floor(samples.length / 2);
      context.drawImage(renderer.app.canvas, column * 275, row * 225, 275, 225);
      context.fillStyle = '#fff';
      context.font = '12px Arial';
      context.fillText(`Active frame ${frame}`, column * 275 + 8, row * 225 + 18);
      samples.push({ frame, tanks: state() });
    }
    const before = state();
    world.pause();
    for (let i = 0; i < 10; i++) world.step(emptyInput());
    const paused = state();
    return { samples, before, paused };
  } finally {
    renderer.destroy();
    host.appendChild(canvas);
  }
}
