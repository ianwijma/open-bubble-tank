import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { GameRenderer } from '../../src/game/render/pixi-renderer';

/** Production actor/behavior ordering and renderer, sampled without a fixture game loop. */
export async function showActorAi(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 31),
    renderer = new GameRenderer(pack);
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.field.tutorial = 0;
  world.field.cleared = false;
  const actors = [
    { id: 6001, x: -250, y: -100, angle: 90 },
    { id: 6003, x: 180, y: -100, angle: 180 },
    { id: 6005, x: 200, y: 90, angle: 90 },
    { id: 6004, x: -90, y: 120, angle: 0 },
  ].map(({ id, x, y, angle }) => {
    const tank = createTank(
      world.nextId(),
      {
        ...STARTER,
        id: `E-ai-${id}`,
        avatar: false,
        speed: 2,
        life: 100,
        parts: [
          { ...STARTER.parts[0], type: 1003, radius: 22.5 },
          { ...STARTER.parts[1], type: id },
        ],
      },
      'enemy',
      x,
      y,
      undefined,
      undefined,
      world,
    );
    tank.rotation = angle;
    return tank;
  });
  world.field.enemies = actors;
  const phase = actors[3],
    phaseGun = phase.guns[0];
  phaseGun.behavior!.cloak = 0;
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!,
    snapshots: ReturnType<typeof readSnapshot>[] = [];
  let frame = 0,
    cell = 0;
  function readSnapshot() {
    return {
      frame,
      actors: actors.map((t) => ({
        id: t.guns[0].part.type,
        x: t.x,
        y: t.y,
        rotation: t.rotation,
        frames: t.movement.frames,
        point: t.movement.swarmPoint && { ...t.movement.swarmPoint },
        alpha: t.alpha,
        dead: t.dead,
      })),
      cloak: phaseGun.behavior!.cloak,
    };
  }
  function sample() {
    renderer.draw(world, DEFAULT_SETTINGS);
    const x = ((cell % 3) * 550) / 3,
      y = Math.floor(cell / 3) * 225;
    ctx.drawImage(renderer.app.canvas, x, y, 550 / 3, 225);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    ctx.fillText(`Run ${frame} · cloak ${phaseGun.behavior!.cloak}`, x + 4, y + 14);
    cell++;
    snapshots.push(readSnapshot());
  }
  try {
    sample();
    for (const target of [1, 2, 3, 50, 160]) {
      while (frame < target) {
        world.step(emptyInput());
        frame++;
      }
      sample();
    }
    const beforePause = {
      cloak: phaseGun.behavior!.cloak,
      x: phase.x,
      y: phase.y,
      alpha: phase.alpha,
    };
    world.pause();
    for (let i = 0; i < 20; i++) world.step(emptyInput());
    const afterPause = {
      cloak: phaseGun.behavior!.cloak,
      x: phase.x,
      y: phase.y,
      alpha: phase.alpha,
    };
    return { snapshots, beforePause, afterPause, wall: actors[2].guns[0].behavior!.wall };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
