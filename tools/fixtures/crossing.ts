import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Four real renderer frames with two field-owned populations, without game debug APIs. */
export async function showCrossingProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 8),
    renderer = new GameRenderer(pack);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const context = canvas.getContext('2d')!;
  const design = {
    ...STARTER,
    avatar: false,
    speed: 0,
    life: 100,
    reward: 0,
    parts: [{ ...STARTER.parts[0], type: 1003, radius: 22.5, scale: 1 }],
  };
  world.player.x = 425;
  world.player.life = 40;
  world.field.tutorial = 0;
  world.field.enemies = [createTank(world.nextId(), design, 'enemy', 350, -80)];
  const old = world.field;
  const bullet = (x: number): Projectile => ({
    uid: world.nextId(),
    owner: -1,
    enemy: true,
    x,
    y: 80,
    angle: 90,
    heading: 90,
    speed: 1,
    damage: 1,
    radius: 2,
    kind: 'shell',
    age: 0,
    life: 500,
    explode: 0,
    hit: new Set(),
    targetId: null,
    dead: false,
    symbol: 1717,
    orbit: 0,
  });
  const outgoing = bullet(350);
  world.bullets.push(outgoing);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    runtime = world.runtimeFor(next),
    incoming = bullet(-300);
  next.tutorial = 0;
  next.enemies = [createTank(world.nextId(), design, 'enemy', -230, -80)];
  runtime.bullets.push(incoming);
  const ally = createTank(world.nextId(), design, 'ally', -200, 0);
  runtime.allies.push(ally);
  runtime.pickups.push({
    uid: world.nextId(),
    x: -200,
    y: -150,
    vx: 0.5,
    vy: 0,
    value: 5,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  });
  runtime.effects.push({
    uid: world.nextId(),
    x: -230,
    y: 50,
    kind: 'hit',
    age: 0,
    duration: 500,
    radius: 30,
    color: 0xffffff,
  });
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  await renderer.init(host, DEFAULT_SETTINGS);
  const snapshots = [];
  try {
    for (const [index, frames] of [0, 10, 10, 100].entries()) {
      for (let frame = 0; frame < frames && world.transit; frame++) world.step(emptyInput());
      renderer.draw(world, { ...DEFAULT_SETTINGS, zoom: 0.65, shake: false });
      context.drawImage(
        renderer.app.canvas,
        (index % 2) * 275,
        Math.floor(index / 2) * 225,
        275,
        225,
      );
      const states = world.activeFields();
      snapshots.push({
        mode: world.mode,
        playerX: world.player.x,
        actors: states.flatMap(({ field, runtime, offset }) =>
          [...field.enemies, ...runtime.allies].map((tank) => ({
            uid: tank.uid,
            age: tank.age,
            x: tank.x + offset.x,
            y: tank.y + offset.y,
          })),
        ),
        bullets: states.flatMap(({ runtime, offset }) =>
          runtime.bullets.map((shot) => ({
            uid: shot.uid,
            age: shot.age,
            x: shot.x + offset.x,
            y: shot.y + offset.y,
          })),
        ),
        renderedTanks: renderer.entities.children.map((child) => ({ x: child.x, y: child.y })),
        renderedShots: renderer.nativeShots.children.map((child) => ({ x: child.x, y: child.y })),
      });
    }
    return {
      snapshots,
      retained:
        world.field === next && world.bullets.includes(incoming) && world.allies.includes(ally),
      abandoned: !world.bullets.includes(outgoing) && world.runtimeFor(old).bullets.length === 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
