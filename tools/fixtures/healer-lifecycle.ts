import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { Projectile } from '../../src/game/core/types';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { tickHealer } from '../../src/game/simulation/healing';
import { World, emptyInput } from '../../src/game/simulation/world';
import { StageRuntime } from '../../src/game/services/stage-runtime';

/** Actual shell/part dispatch and supplied-asset contact; no injected collision result or error. */
export async function showHealerLifecycle(pack: AssetPack, host: HTMLElement) {
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 675;
  gallery.style.width = '550px';
  gallery.style.height = host.style.height = '675px';
  const context = gallery.getContext('2d')!;
  const design = {
    ...STARTER,
    avatar: false,
    speed: 0,
    life: 100,
    reward: 0,
    parts: [{ ...STARTER.parts[0], type: 1003, x: 0, y: 0, scale: 1, radius: 22.5 }],
  };
  const healer = {
    ...design,
    parts: [...design.parts, { ...STARTER.parts[1], type: 6002, x: 0, y: 0 }],
  };
  function makeWorld() {
    const world = new World([], [], 19);
    world.rng.next = () => 0.5;
    world.progression.level = 6;
    world.field.cleared = false;
    world.field.tutorial = 0;
    world.hitTest = pack.hitTest;
    return world;
  }
  function shell(world: World, values: Partial<Projectile> = {}): Projectile {
    return {
      uid: world.nextId(),
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      x: 100,
      y: 0,
      angle: 0,
      heading: 0,
      speed: 0,
      damage: 2,
      radius: 2,
      age: 0,
      life: Infinity,
      explode: 0,
      targetId: null,
      hit: new Set(),
      dead: false,
      symbol: 1721,
      orbit: 0,
      ...values,
    };
  }
  const draw = async (world: World, cell: number, label: string) => {
    const renderer = new GameRenderer(pack);
    await renderer.init(host, DEFAULT_SETTINGS);
    const sample = document.createElement('canvas');
    sample.width = 550;
    sample.height = 450;
    const pixels = sample.getContext('2d', { willReadFrequently: true })!;
    const read = () => {
      renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
      pixels.clearRect(0, 0, 550, 450);
      pixels.drawImage(renderer.app.canvas, 0, 0, 550, 450);
      return pixels.getImageData(0, 0, 550, 450).data;
    };
    const bullets = world.bullets;
    try {
      const before = read();
      let beamPixels = 0;
      if (bullets.some((bullet) => bullet.kind === 'healBeam' && !bullet.dead)) {
        // A same-pose paint control isolates the beam from tank/HUD/background pixels.
        world.bullets = bullets.filter((bullet) => bullet.kind !== 'healBeam');
        const without = read();
        for (let i = 0; i < before.length; i += 4)
          if (
            before[i] !== without[i] ||
            before[i + 1] !== without[i + 1] ||
            before[i + 2] !== without[i + 2]
          )
            beamPixels++;
        world.bullets = bullets;
        read();
      }
      const x = (cell % 2) * 275,
        y = Math.floor(cell / 2) * 225;
      context.drawImage(renderer.app.canvas, x, y, 275, 225);
      context.fillStyle = '#fff';
      context.font = '11px Arial';
      context.fillText(label, x + 6, y + 17);
      return beamPixels;
    } finally {
      world.bullets = bullets;
      renderer.destroy();
    }
  };
  const owners = [];
  for (const [cell, mode] of (['healthy', 'killed', 'jammed'] as const).entries()) {
    const world = makeWorld();
    const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 50);
    world.field.enemies = [patient];
    const owner = createTank(
      world.nextId(),
      healer,
      'enemy',
      -100,
      0,
      100,
      mode === 'killed' ? 1 : 100,
      world,
    );
    world.field.enemies = [owner, patient];
    world.actorParents.sync(world);
    if (mode === 'killed') world.addBullet(shell(world, { x: -100 }));
    const gun = owner.guns.find((gun) => gun.part.type === 6002)!;
    gun.counter = 2;
    tickHealer(world, owner, gun);
    const beam = world.bullets.find((bullet) => bullet.kind === 'healBeam')!;
    beam.contactFrames = 10;
    if (mode === 'jammed') owner.status.jam = 3;
    world.step(emptyInput());
    const proof = {
      mode,
      patientLife: patient.life,
      ownerDead: owner.dead,
      ownerParented: world.actorParents.hasParent(owner),
      beamRetained: world.bullets.includes(beam),
      directHome: beam.healingHome === owner,
      beamCounter: beam.contactFrames,
      beamPixels: await draw(world, cell, `${mode}: existing beam contact`),
    };
    if (mode === 'killed') {
      world.step(emptyInput());
      Object.assign(proof, {
        detachedNext: !world.actorParents.hasParent(owner),
        beamRemovedNext: !world.bullets.includes(beam),
      });
    }
    owners.push(proof);
  }
  const world = makeWorld();
  const owner = createTank(world.nextId(), design, 'enemy');
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 1);
  world.field.enemies = [owner, patient];
  world.addBullet(shell(world));
  const beam = shell(world, {
    owner: owner.uid,
    enemy: true,
    kind: 'healBeam',
    damage: 1,
    radius: 0,
    symbol: 2015,
    healingTarget: patient,
    targetId: patient.uid,
    contactFrames: 10,
  });
  const sentinel = shell(world, { enemy: true, x: -300, y: 100, damage: 0 });
  world.addBullet(beam);
  world.addBullet(sentinel);
  const stage = new StageRuntime(world.mainEffects);
  stage.random = () => 0.5;
  let callbacks = 0;
  stage.subscribe({ step: () => world.step(emptyInput(), 0, false) });
  stage.subscribe({ step: () => callbacks++ });
  stage.advance(20, 50);
  const patientDeath = {
    dead: patient.dead,
    life: patient.life,
    dataActive: patient.dataActive,
    parented: world.actorParents.hasParent(patient),
    children: patient.displayChildren.length,
    painted: pack.hitTest(patient, patient.x, patient.y),
    counter: beam.contactFrames,
    laterBulletAge: sentinel.age,
    avatarAge: world.player.age,
    callbacks,
    beamPixels: await draw(world, 3, 'Patient killed: empty display, no AddLife'),
  };
  stage.advance(20, 50);
  const removal = {
    parented: world.actorParents.hasParent(patient),
    beamRetained: world.bullets.includes(beam),
    laterBulletAge: sentinel.age,
    avatarAge: world.player.age,
    callbacks,
  };
  await draw(world, 4, 'Next frame: detach and live-array removal');
  stage.advance(20, 50);
  const recovered = { laterBulletAge: sentinel.age, avatarAge: world.player.age, callbacks };
  await draw(world, 5, 'Later frame: ordinary Run continues');
  host.replaceChildren(gallery);
  return { owners, patientDeath, removal, recovered };
}
