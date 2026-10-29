import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { tickGuns } from '../../src/game/simulation/weapons';
import { GameRenderer } from '../../src/game/render/pixi-renderer';

export async function showAimContracts(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 3),
    renderer = new GameRenderer(pack);
  world.field.tutorial = 0;
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      classId: 4,
      parts: [
        { ...STARTER.parts[0], type: 1003, radius: 22.5 },
        { ...STARTER.parts[1], key: 'manual', type: 2001, x: 0, y: -45, rotation: 0 },
        { ...STARTER.parts[1], key: 'shield', type: 3010, x: 0, y: 45, rotation: 25 },
        { ...STARTER.parts[1], key: 'seeker', type: 3009, x: 35, y: 0, rotation: 0 },
        { ...STARTER.parts[1], key: 'apocalypse', type: 3017, x: -35, y: 0, rotation: 25 },
      ],
    },
    'player',
    0,
    0,
    100,
    80,
    world,
  );
  world.step({ ...emptyInput(), aim: { x: 275, y: 100 } });
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  try {
    renderer.draw(world, DEFAULT_SETTINGS);
    canvas.getContext('2d')!.drawImage(renderer.app.canvas, 0, 0, 550, 450);
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }

  const contact = new World([], [], 3);
  contact.player = createTank(
    contact.nextId(),
    { ...STARTER, parts: [{ ...STARTER.parts[0], scale: 0.15 }] },
    'player',
    0,
    0,
    100,
    80,
    contact,
  );
  const owner = createTank(
      contact.nextId(),
      {
        ...STARTER,
        avatar: false,
        speed: 0,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4026, rotation: 0 }],
      },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      contact,
    ),
    gun = owner.guns[0];
  contact.field.enemies = [owner];
  const point = contact.muzzle(owner, gun, 13, 6);
  Object.assign(contact.player, point);
  const successful: number[] = [];
  contact.hitTest = (tank, x, y) => {
    const hit = pack.hitTest(tank, x, y);
    if (hit)
      for (let i = 0; i < 7; i++) {
        const p = contact.muzzle(owner, gun, 13, i);
        if (Math.hypot(p.x - x, p.y - y) < 0.001) successful.push(i);
      }
    return hit;
  };
  tickGuns(contact, owner, emptyInput());
  const first = contact.player.life;
  for (let i = 0; i < 14; i++) tickGuns(contact, owner, emptyInput());
  const held = contact.player.life;
  tickGuns(contact, owner, emptyInput());
  return {
    angles: world.player.guns.map((g) => ({ id: g.part.type, angle: g.angle })),
    spike: {
      first,
      held,
      final: contact.player.life,
      successful,
      counter: gun.counter,
      target: gun.targeting!.targetId,
    },
  };
}
