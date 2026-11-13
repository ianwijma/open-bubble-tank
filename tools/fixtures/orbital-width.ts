import { importActorFixtures } from './actor-attachments';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { WEAPONS } from '../../src/game/data/weapons';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createTank } from '../../src/game/simulation/tank';
import { World } from '../../src/game/simulation/world';

/** Production Script width, retained status pose and orbital spawn callback. */
export async function showOrbitalWidth(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 31);
  world.rng.next = () => 0.5;
  world.displayWidth = pack.tankDisplayWidth;
  world.protectionRadius = pack.protectionRadius;
  world.field.tutorial = 0;
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      id: 'E-orbital-width',
      avatar: false,
      speed: 0,
      life: 100,
      parts: [
        { ...STARTER.parts[0], type: 1003, x: 60, y: 0 },
        { ...STARTER.parts[1], type: 4010, x: 0, y: 0, rotation: 0 },
      ],
    },
    'enemy',
    0,
    0,
    100,
    100,
    world,
  );
  world.field.enemies = [tank];
  importActorFixtures(world);
  const renderer = new GameRenderer(pack),
    gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const ctx = gallery.getContext('2d')!;
  await renderer.init(host, DEFAULT_SETTINGS);
  const draw = (cell: number, label: string) => {
    renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
    const x = (cell % 2) * 275,
      y = Math.floor(cell / 2) * 225;
    ctx.drawImage(renderer.app.canvas, x, y, 275, 225);
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.fillText(label, x + 6, y + 17);
  };
  const launch = () => {
    const width = pack.tankDisplayWidth(tank);
    world.spawnVolley(tank, tank.guns[0], WEAPONS[4010]);
    const shot = world.bullets.at(-1)!;
    return { width, distance: Math.sqrt((shot.x - tank.x) ** 2 + (shot.y - tank.y) ** 2) };
  };
  try {
    const initial = launch();
    draw(0, 'Live mount width');
    tank.status.sticky = 80;
    tank.statusDecoration = {
      kind: 'sticky',
      age: 0,
      artAge: 0,
      duration: 80,
      marks: [{ x: 60, y: 0, angle: 0, frame: 3 }],
    };
    tank.displayChildren.push('status');
    const read = () => {
      const pose = pack.statusClip(tank, 0),
        child = [...pose.children.values()][0]?.clip;
      return {
        width: pack.tankDisplayWidth(tank),
        rootFrame: pose.frame,
        childAge: child?.age,
        childFrame: child?.frame,
      };
    };
    const first = read();
    draw(1, 'Stopped status root · age0');
    tank.statusDecoration.artAge = 10;
    const later = read();
    draw(2, 'Same root · live child age10');
    tank.shield = 100;
    const shield = launch();
    draw(3, 'Attached shield changes launch radius');
    return { initial, first, later, shield, radius: tank.radius };
  } finally {
    renderer.destroy();
    host.replaceChildren(gallery);
  }
}
