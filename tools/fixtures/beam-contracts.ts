import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Real shell/primary/field dispatch with production asset contact and beam painting. */
export async function showBeamContracts(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 31),
    body = { ...STARTER.parts[0], type: 1003, x: 0, y: 0, radius: 22.5, scale: 1 },
    design = { ...STARTER, avatar: false, speed: 0, life: 100, reward: 0, parts: [body] };
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [body, { ...STARTER.parts[1], type: 2017, x: 0, y: 0 }],
    },
    'player',
    0,
    0,
    50,
    40,
  );
  world.field.cleared = false;
  world.field.tutorial = 0;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  // A fixed emitter isolates the shared grid from the separate mounted-matrix audit.
  world.muzzle = () => ({ x: 0, y: 0 });
  const victim = createTank(world.nextId(), design, 'enemy', 50, 0, 100, 1),
    healthy = createTank(world.nextId(), design, 'enemy', 100, 0);
  world.field.enemies = [victim, healthy];
  importActorFixtures(world);
  importActorFixtures(world);
  world.addBullet(
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1721,
      x: 50,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
    }),
  );
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  const beam = world.bullets.find((bullet) => bullet.kind === 'beam')!,
    samples: number[] = [];
  world.hitTest = (tank, x, y) => {
    if (tank === healthy && victim.dead) samples.push(x);
    return pack.hitTest(tank, x, y);
  };
  const renderer = new GameRenderer(pack);
  await renderer.init(host, DEFAULT_SETTINGS);
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const context = gallery.getContext('2d')!,
    snapshots = [];
  const sample = document.createElement('canvas');
  sample.width = 550;
  sample.height = 450;
  const pixels = sample.getContext('2d', { willReadFrequently: true })!;
  const read = () => {
    renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
    pixels.clearRect(0, 0, 550, 450);
    pixels.drawImage(renderer.app.canvas, 0, 0);
    return pixels.getImageData(0, 0, 550, 450).data;
  };
  try {
    for (let frame = 0; frame < 2; frame++) {
      samples.length = 0;
      world.step({ ...emptyInput(), fire: true });
      const first = samples[0],
        before = read(),
        bullets = world.bullets;
      world.bullets = [];
      const without = read();
      let beamPixels = 0;
      for (let i = 0; i < before.length; i += 4)
        if (
          before[i] !== without[i] ||
          before[i + 1] !== without[i + 1] ||
          before[i + 2] !== without[i + 2]
        )
          beamPixels++;
      world.bullets = bullets;
      read();
      context.drawImage(renderer.app.canvas, 0, frame * 225, 550, 225);
      context.fillStyle = '#fff';
      context.font = '12px Arial';
      context.fillText(
        frame
          ? 'Next Run: queued enemy detached'
          : 'Shell then beam: empty enemy still shifts grid',
        8,
        frame * 225 + 18,
      );
      snapshots.push({
        first,
        beamLength: beam.beamLength,
        contactFrames: beam.contactFrames,
        life: healthy.life,
        rawCount: world.field.enemies.length,
        victimDead: victim.dead,
        victimEmpty: victim.displayChildren.length === 0,
        victimParent: world.actorParents.hasParent(victim),
        beamPixels,
        speed: beam.speed,
      });
    }
  } finally {
    renderer.destroy();
  }
  // A carrier-only enemy is a supported source design. The excluded first raw
  // actor has no carrier refs, so filtered[0]'s real carrier pixels take damage.
  world.stopPrimaryFire();
  const excluded = createTank(world.nextId(), design, 'enemy', -100, 0),
    carrier = createTank(
      world.nextId(),
      {
        ...design,
        parts: [{ ...STARTER.parts[1], type: 4013, x: 0, y: 0, scale: 1 }],
      },
      'enemy',
      100,
      0,
    );
  world.field.enemies = [excluded, carrier];
  importActorFixtures(world);
  importActorFixtures(world);
  world.hitTest = pack.hitTest;
  for (let i = 0; i < 2; i++) world.step({ ...emptyInput(), fire: true });
  const carrierProof = {
    life: carrier.life,
    dead: carrier.dead,
    mounts: carrier.guns.length,
    excludedLife: excluded.life,
    seekers: world.bullets.filter((bullet) => bullet.kind === 'seeker').length,
  };
  host.replaceChildren(gallery);
  return { snapshots, carrier: carrierProof };
}
