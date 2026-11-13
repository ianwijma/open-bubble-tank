import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

// Actor layers are now real parents; sample their tank children and the avatar sibling.
const renderedTanks = (renderer: GameRenderer) => [
  ...renderer.entities.children.slice(0, -1).flatMap((layer) => layer.children),
  ...renderer.entities.children.slice(-1),
];

/** Four real renderer frames with two field-owned populations, without game debug APIs. */
export async function showCrossingProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 8),
    renderer = new GameRenderer(pack);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const context = canvas.getContext('2d')!;
  const design = {
    ...STARTER,
    avatar: false,
    speed: 0,
    life: 100,
    reward: 0,
    parts: [{ ...STARTER.parts[0], type: 1003, radius: 22.5, scale: 1 }],
  };
  world.player.x = 425;
  world.player.life = 40;
  world.field.tutorial = 0;
  world.field.enemies = [createTank(world.nextId(), design, 'enemy', 350, -80)];
  importActorFixtures(world);
  const old = world.field;
  const bullet = (x: number): Projectile => ({
    uid: world.nextId(),
    owner: -1,
    enemy: true,
    x,
    y: 80,
    angle: 90,
    heading: 90,
    speed: 1,
    damage: 1,
    radius: 2,
    kind: 'shell',
    age: 0,
    life: 500,
    explode: 0,
    hit: new Set(),
    targetId: null,
    dead: false,
    symbol: 1717,
    orbit: 0,
  });
  const outgoing = bullet(350);
  world.bullets.push(outgoing);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    runtime = world.runtimeFor(next),
    incoming = bullet(-300);
  next.tutorial = 0;
  next.enemies = [createTank(world.nextId(), design, 'enemy', -230, -80)];
  runtime.bullets.push(incoming);
  const ally = createTank(world.nextId(), design, 'ally', -200, 0);
  runtime.allies.push(ally);
  runtime.pickups.push({
    uid: world.nextId(),
    x: -200,
    y: -150,
    vx: 0.5,
    vy: 0,
    value: 5,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  });
  world.queueEffect(
    {
      uid: world.nextId(),
      x: -230,
      y: 50,
      kind: 'hit',
      age: 0,
      duration: 500,
      radius: 30,
      color: 0xffffff,
    },
    next,
  );
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  importActorFixtures(world);
  await renderer.init(host, DEFAULT_SETTINGS);
  const snapshots = [];
  try {
    for (const [index, frames] of [0, 10, 10, 100].entries()) {
      for (let frame = 0; frame < frames && world.transit; frame++) world.step(emptyInput());
      renderer.draw(world, { ...DEFAULT_SETTINGS, zoom: 0.65, shake: false });
      context.drawImage(
        renderer.app.canvas,
        (index % 2) * 275,
        Math.floor(index / 2) * 225,
        275,
        225,
      );
      const states = world.activeFields();
      snapshots.push({
        mode: world.mode,
        playerX: world.player.x,
        actors: states.flatMap(({ field, runtime, offset }) =>
          [...field.enemies, ...runtime.allies].map((tank) => ({
            uid: tank.uid,
            age: tank.age,
            x: tank.x + offset.x,
            y: tank.y + offset.y,
          })),
        ),
        bullets: states.flatMap(({ runtime, offset }) =>
          runtime.bullets.map((shot) => ({
            uid: shot.uid,
            age: shot.age,
            x: shot.x + offset.x,
            y: shot.y + offset.y,
          })),
        ),
        renderedTanks: renderedTanks(renderer).map((child) => ({ x: child.x, y: child.y })),
        renderedShots: renderer.nativeShots.children.map((child) => ({ x: child.x, y: child.y })),
      });
    }
    return {
      snapshots,
      retained:
        world.field === next && world.bullets.includes(incoming) && world.allies.includes(ally),
      abandoned:
        !world.bullets.includes(outgoing) &&
        world.attachedFields().every(({ field }) => field !== old),
      detachedRuntimeRetained: world.runtimeFor(old).bullets.includes(outgoing),
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}

/** Source-derived retained-wrapper proof; artificial setup is not an ordinary playthrough. */
export async function showNestedCrossingProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 1);
  const renderer = new GameRenderer(pack);
  const gallery = document.createElement('canvas');
  gallery.width = 1100;
  gallery.height = 450;
  gallery.style.width = '1100px';
  host.style.width = '1100px';
  const context = gallery.getContext('2d')!;
  const sample = document.createElement('canvas');
  sample.width = 550;
  sample.height = 450;
  const pixels = sample.getContext('2d', { willReadFrequently: true })!;
  world.field.tutorial = 0;
  world.jump({ x: 1, y: 0 });
  const abandoned = world.transit!.next;
  abandoned.tutorial = 0;
  const actor = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [{ ...STARTER.parts[0], type: 1003, radius: 22.5, scale: 1 }],
    },
    'enemy',
    -100,
    0,
    100,
    100,
  );
  // This fixture replaces the generated population; supply its omitted removeChild phase.
  for (const tank of world.actorParents.owned(abandoned)) world.actorParents.detach(tank);
  abandoned.enemies = [actor];
  world.player.x = world.transit!.offset.x - 200;
  importActorFixtures(world);
  world.damage(world.player, 2);
  const latest = world.transit!.next;
  for (const tank of world.actorParents.owned(latest)) world.actorParents.detach(tank);
  latest.enemies = [];
  latest.tutorial = 0;
  importActorFixtures(world);
  await renderer.init(host, DEFAULT_SETTINGS);
  const read = () => {
    renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
    pixels.clearRect(0, 0, 550, 450);
    pixels.drawImage(renderer.app.canvas, 0, 0, 550, 450);
    return pixels.getImageData(0, 0, 550, 450).data;
  };
  try {
    const snapshots = [];
    for (let index = 0; index < 2; index++) {
      if (index) for (let frame = 0; frame < 3; frame++) world.step(emptyInput());
      const before = read();
      context.drawImage(renderer.app.canvas, index * 550, 0, 550, 450);
      const states = world.attachedFields();
      const retained = states.find(({ field }) => field === abandoned)!;
      const expected = {
        x: 275 + retained.offset.x + actor.x - world.player.x,
        y: 225 + retained.offset.y + actor.y - world.player.y,
      };
      const rendered = renderedTanks(renderer).map((child) => child.getGlobalPosition());
      actor.alpha = 0;
      const without = read();
      let bodyPixels = 0;
      for (let i = 0; i < before.length; i += 4)
        if (
          before[i] !== without[i] ||
          before[i + 1] !== without[i + 1] ||
          before[i + 2] !== without[i + 2]
        )
          bodyPixels++;
      actor.alpha = 1;
      read();
      snapshots.push({
        expected,
        rendered: rendered.map(({ x, y }) => ({ x, y })),
        age: actor.age,
        artAge: actor.artAge,
        bodyPixels,
        onStage: world.actorParents.onStage(actor),
        attached: states.length,
        active: world.activeFields().length,
      });
    }
    return {
      logicalPosition: world.mapPosition,
      abandonedIsCurrent: world.currentWrapper === abandoned,
      abandonedIsNext: world.transit?.next === abandoned,
      snapshots,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(gallery);
  }
}
