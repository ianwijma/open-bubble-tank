import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { Effect } from '../../src/game/core/types';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { applyProjectileStatus } from '../../src/game/simulation/status';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Real queued screen effects and production centered screen layer, independent of camera. */
export async function showScreenEffectsProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 32),
    renderer = new GameRenderer(pack);
  world.field.enemies = [];
  world.field.tutorial = 0;
  world.hitTest = () => false;
  world.rng.next = () => 0;
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#e7f7ff';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; hash: number }[] = [];
  const draw = (zoom = 1) => renderer.draw(world, { ...DEFAULT_SETTINGS, zoom });
  const sample = () => {
    const frame = renderer.app.renderer.extract.canvas({
      target: renderer.screenEffects,
      frame: new Rectangle(0, 0, 550, 450),
      resolution: 1,
    }) as HTMLCanvasElement;
    const bytes = frame.getContext('2d')!.getImageData(0, 0, 550, 450).data;
    let ink = 0,
      hash = 2166136261;
    for (let i = 0; i < bytes.length; i++) {
      if (i % 4 === 3 && bytes[i]) ink++;
      hash = Math.imul(hash ^ bytes[i], 16777619);
    }
    return { frame, ink, hash: hash >>> 0 };
  };
  const capture = (label: string, zoom = 1) => {
    draw(zoom);
    const { frame, ink, hash } = sample(),
      index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 150);
    ctx.fillStyle = '#123e51';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 8, y + 17);
    panels.push({ label, ink, hash });
    return hash;
  };
  const setEffects = (effects: Effect[]) => {
    world.runtimeFor(world.field).effects = effects;
  };
  const inFront = () =>
    renderer.app.stage.getChildIndex(renderer.screenEffects) >
    renderer.app.stage.getChildIndex(renderer.mapArt);
  try {
    applyProjectileStatus(world, world.player, 'ink');
    const queued = world.runtimeFor(world.field).effectQueue[0];
    world.step(emptyInput());
    const ink = world.effects[0];
    ink.age = 19;
    const firstHash = capture('Ink20 · centered, queued instance');
    const beforeFront = inFront();
    world.pause();
    const timer = world.player.status.ink;
    for (let i = 0; i < 200; i++) world.step(emptyInput());
    const loopHash = capture('Ink20 · after 200 paused ticks');
    const loop = {
      age: ink.age,
      timer,
      pausedTimer: world.player.status.ink,
      retained: world.effects[0] === ink,
      samePixels: firstHash === loopHash,
    };
    world.player.x = 150;
    world.player.y = -70;
    world.field.scale = 2;
    const zoomHash = capture('Ink20 · changed camera and zoom', 1.5);
    // Replacement preserves the registered global clip even though the new avatar timer resets.
    world.editPlayer({ ...STARTER, id: 'screen-proof-replacement' });
    draw();
    const replacement = {
      timer: world.player.status.ink,
      retained: world.effects[0] === ink,
      hash: sample().hash,
      samePixels: sample().hash === firstHash,
    };
    world.resume();
    world.jump({ x: 1, y: 0 });
    draw(1.5);
    const crossing = { inFront: inFront(), samePixels: sample().hash === firstHash };
    // Record arrival cleanup while keeping the six-panel final gallery focused on original clips.
    world.player.x = world.transit!.target.x;
    world.player.y = world.transit!.target.y;
    world.step(emptyInput());
    draw();
    const arrival = { count: world.effects.length, ink: sample().ink };
    world.pause();
    const ally = createTank(world.nextId(), { ...STARTER, avatar: false }, 'ally');
    applyProjectileStatus(world, ally, 'ink');
    applyProjectileStatus(world, ally, 'ink');
    world.resume();
    world.step(emptyInput());
    world.pause();
    const overlapping = world.effects.filter((e) => e.layer === 'screen');
    for (const [i, effect] of overlapping.entries()) {
      effect.age = 19;
      effect.rotation = i ? 80 : 0;
    }
    capture('Two ally hits · overlapping ink');
    setEffects([ink]);
    ink.age = 99;
    capture('Ink100 · transparent, still attached');
    const final = { retained: world.effects[0] === ink, ink: sample().ink };
    world.resume();
    world.step(emptyInput());
    draw();
    const removed = { count: world.effects.length, ink: sample().ink };
    const flash = world.addCombatEffect(
      { x: 0, y: 0 },
      'collapseFlash',
      { randomRotation: false },
      true,
    );
    flash.age = 11;
    capture('Collapse completion · native flash12');
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      mode: pack.mode,
      queued: queued === ink,
      origin: { x: renderer.screenEffects.children[0].x, y: renderer.screenEffects.children[0].y },
      loop,
      camera: { samePixels: zoomHash === firstHash },
      beforeFront,
      replacement,
      crossing,
      arrival,
      overlap: { count: overlapping.length, allyTimer: ally.status.ink },
      final,
      removed,
      panels,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
