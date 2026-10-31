import { captureCanvas } from './pixi-capture';
import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Uses production width queries, clocks and native/mock rendering on both sides of state2. */
export async function showBubbleBusterProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 28),
    renderer = new GameRenderer(pack);
  world.rng.next = () => 0.5;
  world.hitTest = () => false;
  world.hitProjectile = pack.hitProjectile;
  world.projectileBounds = (b) => pack.projectileBounds(b);
  world.field.enemies = [];
  world.field.tutorial = 0;
  const make = (options: Partial<Projectile>) => {
    const b = createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: true,
      kind: 'shell',
      symbol: 1717,
      x: 0,
      y: 0,
      angle: 90,
      speed: 3,
      damage: 1,
      ...options,
    });
    world.addBullet(b);
    return b;
  };
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; painted: number }[] = [];
  const capture = (label: string, bullet: Projectile) => {
    world.bullets = [bullet];
    renderer.draw(world, DEFAULT_SETTINGS);
    const frame = captureCanvas(renderer.app.renderer, {
      target: pack.mode === 'swf' ? renderer.nativeShots : renderer.projectiles,
      frame: new Rectangle(bullet.x - 100, bullet.y - 50, 200, 100),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) ink++;
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 150);
    const displayed = ctx.getImageData(x, y, 275, 150).data;
    let painted = 0;
    for (let i = 0; i < displayed.length; i += 4)
      if (displayed[i] !== 11 || displayed[i + 1] !== 60 || displayed[i + 2] !== 90) painted++;
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 8, y + 17);
    panels.push({ label, ink, painted });
  };
  try {
    const buster = make({ kind: 'buster', symbol: 1800, enemy: false, angle: 0, speed: 10 });
    const seeker = make({ kind: 'seeker', symbol: 1809, x: 20 });
    const width = world.projectileWidth(seeker);
    capture('Enemy seeker · original heading', seeker);
    world.bullets = [buster, seeker];
    tickBullet(world, buster, emptyInput());
    const copied = seeker.deflected ? { ...seeker.deflected } : null;
    const paused = { x: seeker.x, y: seeker.y, age: seeker.age };
    world.pause();
    for (let i = 0; i < 6; i++) world.step(emptyInput());
    const pauseRetained =
      seeker.x === paused.x && seeker.y === paused.y && seeker.age === paused.age;
    world.pause();
    for (let i = 0; i < 4; i++) tickBullet(world, seeker, emptyInput());
    capture('Deflected · heading retained', seeker);
    const seekerProof = {
      width,
      copied,
      pauseRetained,
      x: seeker.x,
      y: seeker.y,
      angle: seeker.angle,
      speed: seeker.speed,
      enemy: seeker.enemy,
      dead: seeker.dead,
    };

    world.bullets = [];
    const beam = make({ kind: 'beam', symbol: 1992, x: 410, angle: 0, speed: 0, beamLength: 80 });
    capture('Beam · before deflection', beam);
    beam.owner = -1;
    beam.deflected = { x: 10, y: 0 };
    for (let i = 0; i < 4; i++) tickBullet(world, beam, emptyInput());
    capture('Deflected beam · past wall', beam);
    const beamProof = { x: beam.x, dead: beam.dead };

    world.bullets = [];
    const turret = make({
      kind: 'turret',
      symbol: 2444,
      x: 410,
      angle: 0,
      speed: 10,
      build: 1,
      stopped: true,
      health: 10,
    });
    capture('Stopped shield turret', turret);
    turret.owner = -1;
    turret.deflected = { x: 10, y: 0 };
    for (let i = 0; i < 4; i++) tickBullet(world, turret, emptyInput());
    capture('Deflected turret · past wall', turret);
    const turretProof = { x: turret.x, dead: turret.dead, stopped: turret.stopped };

    const ricochet = make({
      kind: 'ricochet',
      symbol: 1946,
      x: 410,
      bounces: 2,
      deflected: { x: 10, y: 0 },
    });
    tickBullet(world, ricochet, emptyInput());
    const ricochetProof = { x: ricochet.x, dead: ricochet.dead, bounces: ricochet.bounces };
    const shell = make({ x: 410, deflected: { x: 10, y: 0 } });
    tickBullet(world, shell, emptyInput());
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      mode: pack.mode,
      seeker: seekerProof,
      beam: beamProof,
      turret: turretProof,
      ricochet: ricochetProof,
      misses: [world.stats.friendlyMissed, world.stats.enemyMissed],
      panels,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
