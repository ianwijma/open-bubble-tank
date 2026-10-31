import { captureCanvas } from './pixi-capture';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import type { Projectile } from '../../src/game/core/types';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { overlaps } from '../../src/game/simulation/mines';
import { Rectangle } from 'pixi.js';

/** Production geometry distinguishes AABB contact from painted pixels; mine clocks run while paused. */
export async function showSeekerMineProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 12),
    renderer = new GameRenderer(pack);
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.projectileBounds = (b) =>
    pack.projectileBounds(
      b,
      b.kind === 'turret' ? world.allTanks().find((t) => t.uid === b.owner) : undefined,
    );
  world.field.tutorial = 0;
  const owner = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, speed: 0, life: 100, parts: [STARTER.parts[0]] },
    'enemy',
    -220,
    -180,
  );
  world.field.enemies = [owner];
  const make = (changes: Partial<Projectile> = {}): Projectile => ({
    uid: world.nextId(),
    owner: owner.uid,
    enemy: true,
    kind: 'seekerMine',
    symbol: 2178,
    x: 140,
    y: 20,
    angle: 0,
    heading: 0,
    speed: 4,
    damage: 7,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: null,
    hit: new Set(),
    dead: false,
    orbit: 0,
    ...changes,
  });
  const mine = make({ detonating: 1 });
  world.addBullet(mine);
  const incoming = make({
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    speed: 0,
  });
  const mb = world.projectileBounds(mine),
    sb = world.projectileBounds(incoming);
  incoming.x = mb.x - sb.x - sb.width + 0.1;
  incoming.y = mb.y - sb.y - sb.height + 0.1;
  world.addBullet(incoming);
  const pixelContacts = [0, -2, 2].map((offset) =>
    pack.hitProjectile(incoming, mine.x + offset, mine.y),
  );
  const rectangleContact = overlaps(mb, world.projectileBounds(incoming));
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  const galleryInk: number[] = [];
  const capture = (row: number) => {
    renderer.draw(world, DEFAULT_SETTINGS);
    const frame = captureCanvas(renderer.app.renderer, {
      target: renderer.app.stage,
      frame: new Rectangle(0, 0, 550, 450),
      resolution: 2,
    }) as HTMLCanvasElement;
    ctx.drawImage(frame, 0, row * 150, 550 / 3, 150);
    ctx.drawImage(frame, 330 * 2, 190 * 2, 180 * 2, 100 * 2, 200, row * 150, 350, 150);
    const pixels = ctx.getImageData(200, row * 150, 350, 150).data;
    let ink = 0;
    for (let index = 0; index < pixels.length; index += 4)
      if (
        pixels[index] > 50 &&
        pixels[index] >= pixels[index + 1] * 0.8 &&
        pixels[index] >= pixels[index + 2] * 0.8
      )
        ink++;
    galleryInk.push(ink);
  };
  try {
    capture(0);
    world.step(emptyInput());
    capture(1);
    const contact = {
      rectangleContact,
      pixelContacts,
      mineAlive: world.bullets.includes(mine),
      incomingAlive: world.bullets.includes(incoming),
      effects: world.effects.map((e) => e.symbol),
    };
    world.bullets = [];
    world.effects = [];
    world.mode = 'paused';
    const idle = make();
    world.addBullet(idle);
    const firstFrame = idle.artFrame;
    for (let i = 0; i < 5; i++) world.step(emptyInput());
    const pausedFrame = idle.artFrame;
    world.mineTimelines.arm(idle);
    for (let i = 0; i < 14; i++) world.step(emptyInput());
    const endFrame = idle.artFrame;
    for (let i = 0; i < 40; i++) world.step(emptyInput());
    const animation = {
      firstFrame,
      pausedFrame,
      endFrame,
      heldFrame: idle.artFrame,
      age: idle.age,
      x: idle.x,
      y: idle.y,
    };
    const ordinary = make({ kind: 'mine', symbol: 1792, x: 100 }),
      ally = make({ kind: 'mine', symbol: 2182, enemy: false, x: 180 });
    world.addBullet(ordinary);
    world.addBullet(ally);
    const advanceAllyTo = (frame: number) => {
      for (let i = 0; i < 32 && ally.artFrame !== frame; i++) world.step(emptyInput());
      if (ally.artFrame !== frame) throw new Error(`Ally mine never reached frame ${frame}`);
    };
    // The ally mine deliberately disappears on frames 7–15, then loops to frame 2.
    advanceAllyTo(7);
    renderer.draw(world, DEFAULT_SETTINGS);
    const ink = (node: (typeof renderer.nativeShots.children)[number]) => {
      const pixels = renderer.app.renderer.extract.pixels({ target: node }).pixels;
      let count = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) count++;
      return count;
    };
    const blink = {
      frame: ally.artFrame,
      ink: renderer.nativeShots.children.length ? ink(renderer.nativeShots.children[2]) : 0,
      emptyBounds: !!world.projectileBounds(ally).empty,
    };
    advanceAllyTo(2);
    capture(2);
    const artwork = renderer.nativeShots.children.map(ink);
    return {
      contact,
      animation,
      artwork,
      galleryInk,
      blink,
      nativeCount: renderer.nativeShots.children.length,
      mode: pack.mode,
      mineBounds: mb,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
