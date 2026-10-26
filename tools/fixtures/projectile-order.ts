import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { tickBullet } from '../../src/game/simulation/projectiles';

/** Real alpha contact, simulation phases, callbacks and native rendering in one fixture. */
export async function showProjectileOrderProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 4),
    renderer = new GameRenderer(pack);
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.projectileWidth = pack.projectileWidth;
  world.field.tutorial = 0;
  const body = { ...STARTER.parts[0], type: 1003, x: 0, y: 0, scale: 1, radius: 22.5 };
  const target = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0, parts: [body] },
    'enemy',
    100,
    0,
  );
  world.field.enemies = [target];
  let edge = 100;
  for (let x = 50; x <= 100; x += 0.25)
    if (pack.hitTest(target, x, 0)) {
      edge = x;
      break;
    }
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  const shot = world.bullets[0];
  shot.x = edge - 10;
  shot.y = 0;
  shot.angle = shot.heading = 0;
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  const snapshots = [];
  try {
    for (let step = 0; step <= 2; step++) {
      if (step) world.step(emptyInput());
      renderer.draw(world, DEFAULT_SETTINGS);
      ctx.drawImage(renderer.app.canvas, 0, step * 150, 550 / 3, 150);
      ctx.drawImage(
        renderer.app.canvas,
        310 * 2,
        190 * 2,
        100 * 2,
        70 * 2,
        200,
        step * 150,
        350,
        150,
      );
      snapshots.push({
        step,
        life: target.life,
        bullets: world.bullets.length,
        x: shot.x,
        effects: world.effects.map((e) => ({ symbol: e.symbol, x: e.x })),
      });
    }
    const buster = {
      ...shot,
      uid: world.nextId(),
      kind: 'buster' as const,
      symbol: 1800,
      age: 0,
      dead: false,
      x: 0,
      y: 100,
      speed: 10,
    };
    const deflected = {
      ...shot,
      uid: world.nextId(),
      kind: 'seeker' as const,
      symbol: 1809,
      enemy: true,
      dead: false,
      x: 5,
      y: 100,
      angle: 90,
      targetId: world.player.uid,
    };
    world.bullets = [buster, deflected];
    tickBullet(world, buster, emptyInput());
    tickBullet(world, deflected, emptyInput());
    const massiveWidth = pack.projectileWidth({ ...shot, symbol: 1794, angle: 0, artScale: 1 });
    return {
      edge,
      snapshots,
      massiveWidth,
      deflection: {
        alive: !deflected.dead,
        x: deflected.x,
        y: deflected.y,
        angle: deflected.angle,
        velocity: deflected.deflected,
      },
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
