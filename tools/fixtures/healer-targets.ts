import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { StageRuntime } from '../../src/game/services/stage-runtime';

/** Production target ownership, error-frame boundary and stage continuation, with both paint paths. */
export async function showHealerTargets(pack: AssetPack, host: HTMLElement) {
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const ctx = gallery.getContext('2d')!;
  function makeWorld() {
    const world = new World([], [], 1);
    world.progression.level = 6;
    world.player.life = 40;
    world.rng.next = () => 0.5;
    world.hitTest = pack.hitTest;
    world.field.tutorial = 0;
    world.field.cleared = false;
    return world;
  }
  function tank(world: World, side: 'enemy' | 'ally', x: number, healer = false, life = 100) {
    return createTank(
      world.nextId(),
      {
        ...STARTER,
        avatar: false,
        speed: 0,
        life: 100,
        parts: [
          { ...STARTER.parts[0], type: 1003, x: 0, y: 0, scale: 1, radius: 22.5 },
          ...(healer ? [{ ...STARTER.parts[1], type: 6002, x: 0, y: 0 }] : []),
        ],
      },
      side,
      x,
      0,
      100,
      life,
      world,
    );
  }
  const normal = makeWorld(),
    healer = tank(normal, 'enemy', -100, true),
    patient = tank(normal, 'enemy', 100, false, 50);
  normal.field.enemies = [healer, patient];
  importActorFixtures(normal);
  const draw = async (world: World, cell: number, title: string, frames: number) => {
    const renderer = new GameRenderer(pack);
    await renderer.init(host, DEFAULT_SETTINGS);
    try {
      for (let i = 0; i < frames; i++) world.step(emptyInput());
      renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
      const x = (cell % 2) * 275,
        y = Math.floor(cell / 2) * 225;
      ctx.drawImage(renderer.app.canvas, x, y, 275, 225);
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.fillText(title, x + 6, y + 17);
    } finally {
      renderer.destroy();
    }
  };
  await draw(normal, 0, 'Normal: construction', 0);
  await draw(normal, 1, 'Normal: 20 active frames', 20);
  const normalProof = {
    life: patient.life,
    beams: normal.bullets.filter((b) => b.kind === 'healBeam').length,
    target: healer.guns[0].behaviorTarget!.target === patient,
    beamTarget: normal.bullets[0]?.healingTarget === patient,
  };

  const fault = makeWorld();
  fault.player.life = fault.player.maxLife;
  const owner = tank(fault, 'ally', -100, true),
    sentinel = tank(fault, 'ally', 120);
  fault.allies = [owner, sentinel];
  importActorFixtures(fault);
  fault.rng.next = () => 1; // Inclusive1..length reads missing index2 in both PartCallRun attempts.
  const stage = new StageRuntime(fault.mainEffects);
  stage.random = () => 0.5;
  let callbacks = 0;
  stage.subscribe({ mainStep: () => fault.step(emptyInput(), 0, false) });
  stage.subscribe({ step: () => callbacks++ });
  const read = () => ({
    frames: fault.stats.frames,
    owner: owner.age,
    sentinel: sentinel.age,
    ownerArt: owner.artAge,
    sentinelArt: sentinel.artAge,
    callbacks,
    beams: fault.bullets.filter((b) => b.kind === 'healBeam').length,
    target: owner.guns[0].behaviorTarget!.target === fault.player,
  });
  stage.advance(20, 50);
  const before = read();
  await draw(fault, 2, 'Source read: remaining Run aborted', 0);
  fault.player.life--;
  for (let i = 0; i < 3; i++) stage.advance(20, 50);
  const after = read();
  await draw(fault, 3, 'Later stage frames: resumed', 0);
  host.replaceChildren(gallery);
  return { normal: normalProof, before, after };
}
