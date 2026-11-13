import { Container } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Pickup } from '../../src/game/core/types';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { spawnPickups } from '../../src/game/simulation/pickups';
import { World } from '../../src/game/simulation/world';

/** Artificial physical-child controls; neither ordinary gameplay nor qualified native timing. */
export async function showPickupOwnership(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 151),
    renderer = new GameRenderer(pack);
  spawnPickups(world, { x: -90, y: 30 }, 55);
  const [a, b, c] = world.pickups;
  b.x = -30;
  c.x = 30;
  const old = world.field,
    names = new Map<Pickup, string>([
      [a, 'A50'],
      [b, 'B5'],
      [c, 'C1'],
    ]);
  const clips = [a, b, c].map((p) => world.pickupDisplays.read(p)!.clip);
  world.pause();
  await renderer.init(host, DEFAULT_SETTINGS);
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 600;
  sheet.style.height = host.style.height = '600px';
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 600);
  const nodes = () =>
    renderer as unknown as {
      pickupNodes: Map<Pickup, { root: Container }>;
      mockPickups: Map<Pickup, Container>;
    };
  const view = (p: Pickup) =>
    pack.mode === 'swf' ? nodes().pickupNodes.get(p)?.root : nodes().mockPickups.get(p);
  const snapshots: { label: string; order: string[]; count: number }[] = [];
  const draw = () => renderer.draw(world, DEFAULT_SETTINGS);
  const panel = (label: string) => {
    draw();
    const index = snapshots.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(renderer.app.canvas, x, y, 275, 130);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    const layer = pack.mode === 'swf' ? renderer.nativePickups : renderer.pickupArt;
    snapshots.push({
      label,
      count: layer.children.length,
      order: layer.children.map(
        (child) => [...names].find(([p]) => view(p) === child)?.[1] ?? 'unknown',
      ),
    });
  };
  try {
    panel('Original object children');
    const originals = [a, b, c].map(view);
    const rng = world.rng.state;
    world.pickups = [];
    a.uid = b.uid; // A UID write cannot rename/rebuild the existing physical display.
    a.dead = true;
    a.value = 1;
    panel('Run empty / UID alias / dead retained');
    const arrayRetention = [a, b, c].every((p, i) => view(p) === originals[i]);
    world.pickupDisplays.attach(a, old);
    panel('Actual addChild moves A to the end');
    const twin = { ...b, x: 90 };
    names.set(twin, 'D5');
    world.pickupDisplays.construct(twin);
    world.pickupDisplays.attach(twin, old);
    world.pickupDisplays.setup(twin, 5, old, world.player);
    world.pickups = [twin, { ...c, x: 150 }]; // An unconstructed raw entry is not displayed.
    panel('Distinct physical object / same UID');
    const uidIndependent = view(twin) !== view(b) && !!view(twin) && !!view(b);
    world.pickupDisplays.remove(b, old);
    const removed = originals[1]!;
    panel('Explicit physical removal');
    const explicitRemoval = !view(b) && removed.destroyed;
    world.pickupDisplays.attach(b, old);
    panel('Reattach original retained clip lifetime');
    const lifetimeRetention = [a, b, c].every(
      (p, i) => world.pickupDisplays.read(p)!.clip === clips[i],
    );
    const reattachedView = !!view(b) && view(b) !== removed;
    const state = JSON.stringify(clips);
    for (let i = 0; i < 5; i++) {
      world.advanceArtwork();
      draw();
    }
    const pureReads =
      state === JSON.stringify([a, b, c].map((p) => world.pickupDisplays.read(p)!.clip)) &&
      rng === world.rng.state;
    const playback = clips.map((clip) => ({
      symbol: clip.symbol,
      totalFrames: clip.totalFrames,
      ...clip.playback,
      presentation: clip.presentation,
    }));
    return {
      snapshots,
      arrayRetention,
      uidIndependent,
      explicitRemoval,
      lifetimeRetention,
      reattachedView,
      pureReads,
      playback,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(sheet);
  }
}
