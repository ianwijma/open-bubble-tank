import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { captureCanvas } from './pixi-capture';

/** Real collision providers and production painting around the recovered homing clock. */
export async function showHomingProjectiles(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 31),
    renderer = new GameRenderer(pack);
  world.hitTest = pack.hitTest;
  world.hitProjectile = pack.hitProjectile;
  world.field.tutorial = 0;
  const b = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'orbital',
    symbol: 2016,
    x: world.player.radius + 10,
    y: 0,
    angle: 90,
    speed: 3,
    damage: 7,
  });
  world.addBullet(b);
  const initialMotion = { ...b.motion! },
    frames = [],
    panels: { ink: number; hash: number }[] = [],
    canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  await renderer.init(host, DEFAULT_SETTINGS);
  const tick = () => tickBullet(world, b, emptyInput());
  try {
    for (let step = 0; step <= 10; step++) {
      if (step) tick();
      if (![0, 1, 10].includes(step)) continue;
      frames.push({ step, angle: b.angle, x: b.x, y: b.y, motion: { ...b.motion! } });
      renderer.draw(world, DEFAULT_SETTINGS);
      const painted = captureCanvas(renderer.app.renderer, {
        target: pack.mode === 'swf' ? renderer.nativeShots : renderer.projectiles,
        frame: new Rectangle(-60, -60, 120, 120),
        resolution: 2,
      });
      const data = painted.getContext('2d')!.getImageData(0, 0, painted.width, painted.height).data;
      let ink = 0,
        hash = 2166136261;
      for (let i = 0; i < data.length; i++) {
        hash = Math.imul(hash ^ data[i], 16777619);
        if (i % 4 === 3 && data[i]) ink++;
      }
      const column = panels.length;
      panels.push({ ink, hash: hash >>> 0 });
      ctx.drawImage(painted, 10 + column * 180, 50, 170, 170);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Orbital frame ${step}`, 10 + column * 180, 35);
    }
    const patient = createTank(
      world.nextId(),
      { ...STARTER, avatar: false, speed: 0, parts: [{ ...STARTER.parts[0], x: 20 }] },
      'enemy',
      100,
      -80,
    );
    patient.rotation = 90;
    world.field.enemies = [patient];
    tick();
    const acquired = { uid: b.targetId, angle: b.angle, x: b.x, y: b.y };
    tick();
    const pursuit = { angle: b.angle, x: b.x, y: b.y };

    // At <5px the authored latch hits even when the tiny tank has no painted point here.
    const close = new World([], [], 31);
    close.hitTest = pack.hitTest;
    close.hitProjectile = pack.hitProjectile;
    close.player = createTank(
      close.nextId(),
      { ...STARTER, parts: [{ ...STARTER.parts[0], scale: 0.01 }] },
      'player',
      4.99,
      0,
      100,
      100,
    );
    const seeker = createProjectile(close.nextId(), {
      owner: -1,
      enemy: true,
      kind: 'seeker',
      symbol: 1809,
      x: 0,
      y: 0,
      angle: 90,
      speed: 5,
      damage: 7,
      targetId: close.player.uid,
    });
    close.addBullet(seeker);
    const paintedContact = pack.hitTest(close.player, 0, 0);
    tickBullet(close, seeker, emptyInput());
    return {
      radius: world.player.radius,
      initialMotion,
      frames,
      panels,
      patient: patient.uid,
      acquired,
      pursuit,
      close: { paintedContact, dead: seeker.dead, life: close.player.life },
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
