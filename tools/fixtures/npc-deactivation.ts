import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile, TankDesign } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import allies from '../../src/game/data/allies.json';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { applyProjectileStatus } from '../../src/game/simulation/status';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Explicit poses; damage cases use actual shell dispatch and each asset pack's alpha contact. */
export async function showNpcDeactivation(pack: AssetPack, host: HTMLElement) {
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 675;
  gallery.style.width = '550px';
  gallery.style.height = host.style.height = '675px';
  const context = gallery.getContext('2d')!;
  const body: TankDesign = {
    ...STARTER,
    avatar: false,
    speed: 0,
    life: 100,
    reward: 0,
    parts: [{ ...STARTER.parts[0], type: 1003, x: 0, y: 0, scale: 1, radius: 22.5 }],
  };
  const pod = { ...body, parts: [...body.parts, { ...STARTER.parts[1], type: 4022, x: 0, y: 0 }] };
  const cases = [
    { name: 'enemy damage', side: 'enemy', outside: false, design: pod },
    { name: 'ally damage', side: 'ally', outside: false, design: pod },
    { name: 'enemy boundary', side: 'enemy', outside: true, design: pod },
    { name: 'ally boundary', side: 'ally', outside: true, design: pod },
    { name: 'swarm boundary', side: 'ally', outside: true, design: allies.swarm },
    { name: 'mine ally boundary', side: 'ally', outside: true, design: allies.mine },
  ] as const;
  const results = [];
  for (const [index, scenario] of cases.entries()) {
    const world = new World([], [], 7);
    world.rng.next = () => 0.5;
    world.progression.level = 6;
    world.field.tutorial = 0;
    world.player.x = 200;
    world.hitTest = pack.hitTest;
    const victim = createTank(
      world.nextId(),
      scenario.design,
      scenario.side,
      scenario.outside ? 440 : 100,
      0,
    );
    const survivor = createTank(world.nextId(), body, 'enemy', -150, 100);
    world.field.enemies = scenario.side === 'enemy' ? [victim, survivor] : [survivor];
    importActorFixtures(world);
    world.allies = scenario.side === 'ally' ? [victim] : [];
    importActorFixtures(world);
    importActorFixtures(world);
    // This source branch precondition does not claim ordinary infection reachability.
    applyProjectileStatus(world, victim, 'infect');
    const births: {
      kind: string;
      enemy: boolean;
      active: boolean;
      dead: boolean;
      queued: boolean;
    }[] = [];
    const born: Projectile[] = [];
    const add = world.addBullet.bind(world);
    world.addBullet = (bullet, home, target) => {
      born.push(bullet);
      births.push({
        kind: bullet.kind,
        enemy: bullet.enemy,
        active: victim.dataActive,
        dead: victim.dead,
        queued: world.runtimeFor(world.field).enemyRemovals.includes(victim),
      });
      return add(bullet, home, target);
    };
    let contact = false;
    if (!scenario.outside) {
      contact = pack.hitTest(victim, victim.x, victim.y);
      add(
        createProjectile(world.nextId(), {
          owner: world.player.uid,
          enemy: scenario.side === 'ally',
          kind: 'shell',
          symbol: 1721,
          x: victim.x,
          y: victim.y,
          angle: 0,
          speed: 0,
          damage: 100,
        }),
      );
    }
    world.step(emptyInput());
    const renderer = new GameRenderer(pack);
    await renderer.init(host, DEFAULT_SETTINGS);
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
    const bullets = world.bullets;
    let minePixels = 0;
    try {
      const shown = read();
      world.bullets = bullets.filter((bullet) => bullet.kind !== 'seekerMine');
      const hidden = read();
      for (let i = 0; i < shown.length; i += 4)
        if (
          shown[i] !== hidden[i] ||
          shown[i + 1] !== hidden[i + 1] ||
          shown[i + 2] !== hidden[i + 2]
        )
          minePixels++;
      world.bullets = bullets;
      read();
      const x = (index % 2) * 275,
        y = Math.floor(index / 2) * 225;
      context.drawImage(renderer.app.canvas, x, y, 275, 225);
      context.fillStyle = '#fff';
      context.font = '11px Arial';
      context.fillText(scenario.name, x + 6, y + 17);
      results.push({
        name: scenario.name,
        contact,
        dead: victim.dead,
        dataActive: victim.dataActive,
        parented: world.actorParents.hasParent(victim),
        life: victim.life,
        births,
        minePixels,
        expiredMines: born.filter((bullet) => bullet.kind === 'seekerMine' && bullet.dead).length,
        events: world.events.map((event) => event.type),
        kills: world.stats.kills,
        sumo: world.stats.sumo,
      });
    } finally {
      world.bullets = bullets;
      renderer.destroy();
    }
  }
  host.replaceChildren(gallery);
  return results;
}
