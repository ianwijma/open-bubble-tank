import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { projectileFlags } from '../../src/game/simulation/projectile-flags';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** The actual renderer paints each source-specific state, without a fixture route in the game. */
export async function showSpecialProjectilesProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 23),
    renderer = new GameRenderer(pack);
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.projectileBounds = (b) => pack.projectileBounds(b);
  world.field.tutorial = 0;
  world.player.life = 40;
  const master = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      speed: 0,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4012 }],
    },
    'enemy',
    -180,
    -180,
  );
  world.field.enemies = [master];
  const make = (options: Partial<Projectile>) =>
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1721,
      x: 60,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
      ...options,
    });
  const tick = (b: Projectile) => tickBullet(world, b, emptyInput());
  const clear = () => {
    world.bullets = [];
    world.effects = [];
    world.runtimeFor(world.field).effectQueue = [];
  };
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; painted: number; nativeCount: number }[] = [];
  const capture = (label: string, center: { x: number; y: number }) => {
    renderer.draw(world, DEFAULT_SETTINGS);
    const frame = renderer.app.renderer.extract.canvas({
      target: pack.mode === 'swf' ? renderer.nativeShots : renderer.projectiles,
      frame: new Rectangle(center.x - 60, center.y - 32.7, 120, 65.4),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let ink = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) ink++;
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 150);
    // Check the destination as well as the isolated source before GPU cleanup.
    const paintedPixels = ctx.getImageData(x, y, 275, 150).data;
    let painted = 0;
    for (let index = 0; index < paintedPixels.length; index += 4)
      if (
        paintedPixels[index] !== 11 ||
        paintedPixels[index + 1] !== 60 ||
        paintedPixels[index + 2] !== 90
      )
        painted++;
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 8, y + 17);
    panels.push({ label, ink, painted, nativeCount: renderer.nativeShots.children.length });
  };
  try {
    const star = make({ kind: 'star', symbol: 1811, artScale: 1.7, x: -300, speed: 8, damage: 35 });
    world.addBullet(star);
    for (let i = 0; i < 45; i++) tick(star);
    capture('Starburst · fuse ready', star);
    tick(star);
    const fragments = world.bullets.filter((b) => b !== star);
    for (let i = 0; i < 3; i++) for (const fragment of fragments) tick(fragment);
    capture('Starburst · 36 fresh shots', star);
    const burst = {
      count: fragments.length,
      unlimited: fragments.every((b) => b.life === Infinity),
      fresh: fragments.every((b) => b.explode === 0 && !b.status && b.artScale === 1),
    };
    clear();
    const spinner = make({
      owner: master.uid,
      enemy: true,
      kind: 'spin',
      symbol: 2033,
      speed: 5,
      damage: 3,
      angle: 30,
    });
    world.addBullet(spinner);
    for (let i = 0; i < 5; i++) tick(spinner);
    const helpers = world.bullets.filter((b) => b !== spinner);
    for (const helper of helpers) tick(helper);
    capture('Spinner · velocity-added helpers', spinner);
    const spin = {
      count: helpers.length,
      speeds: helpers.map((b) => b.speed),
      unlimited: helpers.every((b) => b.life === Infinity),
    };
    clear();
    const repulsor = make({ kind: 'push', symbol: 2221, damage: 0 });
    world.addBullet(repulsor);
    for (let i = 0; i < 10; i++) tick(repulsor);
    capture('Repulsor · ten fade updates', repulsor);
    const fade = {
      alpha: repulsor.artAlpha,
      alive: !repulsor.dead,
      nativeAlpha: renderer.nativeShots.children[0]?.alpha,
    };
    clear();
    const sapper = make({
      owner: master.uid,
      enemy: true,
      kind: 'sapper',
      symbol: 1831,
      anchor: master.guns[0],
      x: 3,
      speed: 6,
      damage: 3,
    });
    world.addBullet(sapper);
    tick(sapper);
    capture('Sapper · immediate return artwork', sapper);
    const sap = {
      returning: sapper.returning,
      frame: sapper.artFrame,
      life: world.player.life,
      x: sapper.x,
    };
    const converter = {
      part: { ...STARTER.parts[1], type: 3006 },
      counter: -1,
      angle: 0,
      burst: 0,
      burstTimer: 0,
    };
    world.fireGun(world.player, converter, emptyInput());
    const converted = world.bullets[0];
    capture('Converter · new avatar seeker', converted);
    const conversion = {
      count: world.bullets.length,
      symbol: converted.symbol,
      flags: projectileFlags(converted),
      removedOriginal: sapper.dead,
      fresh: converted.returning === undefined && converted.anchor === undefined,
      unlimited: converted.life === Infinity,
    };
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      burst,
      spin,
      fade,
      sap,
      conversion,
      panels,
      mode: pack.mode,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
