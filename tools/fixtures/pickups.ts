import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Native alpha contact and the rendered bubble disappear in the same collection phase. */
export async function showPickupProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 1),
    renderer = new GameRenderer(pack);
  world.player = createTank(
    world.player.uid,
    { ...STARTER, parts: [{ ...STARTER.parts[0], type: 1003, radius: 22.5, scale: 1 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  world.field.tutorial = 0;
  world.hitTest = pack.hitTest;
  let edge = 0;
  for (let x = 0; x < 100; x += 0.5) if (pack.hitTest(world.player, x, 0)) edge = x;
  const pickup = {
    uid: world.nextId(),
    x: edge + 8,
    y: 0,
    value: 5,
    vx: 0,
    vy: 0,
    rotation: 35,
    scattering: false,
    collected: false,
    forced: true,
    dead: false,
  };
  world.pickups.push(pickup);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  await renderer.init(host, DEFAULT_SETTINGS);
  const snapshots = [];
  try {
    for (let index = 0; index < 3; index++) {
      if (index) world.step(emptyInput());
      renderer.draw(world, DEFAULT_SETTINGS);
      ctx.drawImage(renderer.app.canvas, 0, index * 150, 550 / 3, 150);
      // Magnified crop makes the contact progression easy to inspect alongside each scene.
      ctx.drawImage(
        renderer.app.canvas,
        210 * 2,
        187.5 * 2,
        175 * 2,
        75 * 2,
        200,
        index * 150,
        350,
        150,
      );
      snapshots.push({
        life: world.player.life,
        count: world.pickups.length,
        x: pickup.x,
        contact: pack.hitTest(world.player, pickup.x, pickup.y),
        nativeCount: renderer.nativePickups.children.length,
        nativeAngle: renderer.nativePickups.children[0]?.angle ?? null,
      });
    }
    return { edge, snapshots };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
