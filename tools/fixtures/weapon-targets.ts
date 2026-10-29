import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { WEAPONS } from '../../src/game/data/weapons';

export async function showWeaponTargets(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 3),
    renderer = new GameRenderer(pack);
  world.rng.next = () => 0.99;
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.viewZoom = 0.75;
  world.field.tutorial = 0;
  world.field.cleared = false;
  world.player.x = 160;
  world.player.y = -80;
  const body = { ...STARTER.parts[0], type: 1003, radius: 22.5 },
    base = { ...STARTER, avatar: false, speed: 0, life: 100, parts: [body] },
    ally = createTank(world.nextId(), base, 'ally', 80, 100, undefined, undefined, world),
    owner = createTank(
      world.nextId(),
      {
        ...base,
        id: 'E-twin-targets',
        parts: [
          body,
          { ...STARTER.parts[1], type: 4001, key: 'top', x: 0, y: -10 },
          { ...STARTER.parts[1], type: 4001, key: 'bottom', x: 0, y: 10 },
        ],
      },
      'enemy',
      -100,
      0,
      undefined,
      undefined,
      world,
    );
  world.allies = [ally];
  world.field.enemies = [owner];
  owner.guns[0].targeting = { targetId: ally.uid, allies: 1 };
  owner.guns[1].targeting = { targetId: world.player.uid, allies: 1 };
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  try {
    const snapshots = [];
    for (let frame = 1; frame <= 3; frame++) {
      if (frame === 2)
        world.allies.push(
          createTank(world.nextId(), base, 'ally', -80, 80, undefined, undefined, world),
        );
      for (const gun of owner.guns) gun.counter = WEAPONS[4001].rate - 1;
      world.step(emptyInput());
      if (frame === 1) {
        renderer.draw(world, { ...DEFAULT_SETTINGS, zoom: 0.75 });
        canvas.getContext('2d')!.drawImage(renderer.app.canvas, 0, 0, 550, 450);
      }
      snapshots.push({
        frame,
        targets: owner.guns.map((g) => g.targeting!.targetId),
        angles: owner.guns.map((g) => g.angle),
        shotAngles: world.bullets.slice(-2).map((b) => b.angle),
        shots: world.bullets.length,
      });
    }
    return { snapshots, player: world.player.uid, ally: ally.uid };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
