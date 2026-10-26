import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { whipSamples } from '../../src/game/simulation/whip';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Retained stage-clock poses are consumed by the real renderer and collision adapter. */
export async function showProjectileClocksProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 27),
    renderer = new GameRenderer(pack);
  world.rng.next = () => 0.5;
  world.hitTest = () => false;
  world.hitProjectile = pack.hitProjectile;
  world.projectileBounds = (b) => pack.projectileBounds(b);
  world.field.enemies = [];
  world.field.tutorial = 0;
  const make = (kind: 'whip' | 'grow' | 'flak' | 'sapper') => {
    world.bullets = [];
    const b = createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind,
      symbol: { whip: 2036, grow: 1943, flak: 2031, sapper: 1831 }[kind],
      x: 60,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
      artScale: kind === 'whip' ? 1.25 : 1,
    });
    world.addBullet(b);
    return b;
  };
  const pause = (count: number) => {
    world.pause();
    for (let i = 0; i < count; i++) world.step(emptyInput());
  };
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; painted: number; hash: number }[] = [];
  const extract = (b: Projectile) => {
    renderer.draw(world, DEFAULT_SETTINGS);
    const points = b.kind === 'whip' ? whipSamples(b) : [b];
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const center = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
    const frame = renderer.app.renderer.extract.canvas({
      target: pack.mode === 'swf' ? renderer.nativeShots : renderer.projectiles,
      frame: new Rectangle(center.x - 100, center.y - 54.5, 200, 109),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let ink = 0,
      hash = 2166136261;
    for (let i = 0; i < pixels.length; i++) {
      if (i % 4 === 3 && pixels[i]) ink++;
      hash = Math.imul(hash ^ pixels[i], 16777619);
    }
    return { frame, ink, hash: hash >>> 0 };
  };
  const capture = (label: string, b: Projectile) => {
    const { frame, ink, hash } = extract(b);
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 150);
    const pixels = ctx.getImageData(x, y, 275, 150).data;
    let painted = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i] !== 11 || pixels[i + 1] !== 60 || pixels[i + 2] !== 90) painted++;
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 8, y + 17);
    panels.push({ label, ink, painted, hash });
  };
  try {
    const whip = make('whip');
    const root = whip.artPose!,
      child = root.children.get(15)!.clip;
    capture('Whip · root5 / child1', whip);
    const initialSamples = whipSamples(whip);
    pause(6);
    capture('Whip · six paused stage ticks', whip);
    const whipProof = {
      frame: root.frame,
      childFrame: child.frame,
      age: whip.age,
      retained: root.children.get(15)!.clip === child,
      samplesChanged: JSON.stringify(whipSamples(whip)) !== JSON.stringify(initialSamples),
    };
    const grow = make('grow');
    for (let i = 0; i < 8; i++) tickBullet(world, grow, emptyInput());
    capture('Grow · eight active updates', grow);
    const growBefore = {
      scale: grow.artScale,
      alpha: grow.artAlpha,
      frame: grow.artFrame,
      age: grow.age,
    };
    pause(6);
    capture('Grow · paused scale and alpha', grow);
    const growProof = {
      before: growBefore,
      after: { scale: grow.artScale, alpha: grow.artAlpha, frame: grow.artFrame, age: grow.age },
    };
    const flak = make('flak');
    let blasts = 0;
    world.explode = () => {
      blasts++;
    };
    while (flak.artFrame !== 15) pause(1);
    capture('Flak · authored frame15', flak);
    for (let i = 0; i < 20; i++) pause(1);
    const empty = extract(flak);
    const flakProof = {
      frame: flak.artFrame,
      age: flak.age,
      blasts,
      ink: empty.ink,
      bounds: pack.projectileBounds(flak),
      hit: pack.hitProjectile(flak, flak.x, flak.y),
      removed: false,
    };
    world.resume();
    world.step(emptyInput());
    flakProof.removed = !world.bullets.includes(flak);
    const sapper = make('sapper');
    const sapperChild = sapper.artPose!.children.get(1)!.clip;
    pause(6);
    capture('Sapper · stopped root / live child', sapper);
    const sapperProof = { frame: sapper.artFrame, childFrame: sapperChild.frame, age: sapper.age };
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      mode: pack.mode,
      whip: whipProof,
      grow: growProof,
      flak: flakProof,
      sapper: sapperProof,
      panels,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
