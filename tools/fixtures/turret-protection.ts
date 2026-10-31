import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { rotate } from '../../src/game/core/math';
import { shieldClipFrame } from '../../src/game/core/shield-art';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { World, emptyInput } from '../../src/game/simulation/world';

/** _-DO's owner-Run latch, retired hit children, and independently stopped protection clips. */
export async function showTurretProtection(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 76);
  await app.init({
    width: 250,
    height: 150,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 540;
  sheet.style.height = host.style.height = '540px';
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 540);
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      speed: 0,
      parts: [
        { ...STARTER.parts[0], type: 1003, x: -25, y: 0, scale: 1, radius: 22.5 },
        { ...STARTER.parts[1], type: 4032, key: 'launcher', x: 25, y: 0, scale: 1 },
      ],
    },
    'enemy',
    120,
    100,
  );
  world.field.enemies = [tank];
  world.hitTest = () => false;
  const gun = tank.guns[0],
    view = new TankView(tank.design, pack, textures);
  gun.counter = -1000;
  view.container.position.set(125, 75);
  app.stage.addChild(view.container);
  const panels: { label: string; clips: unknown[]; painted: string[]; shield: number }[] = [];
  const capture = (label: string) => {
    view.update(tank);
    app.render();
    const i = panels.length,
      x = (i % 2) * 275,
      y = Math.floor(i / 2) * 180;
    ctx.drawImage(app.canvas, x, y, 275, 160);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 175);
    panels.push({
      label,
      shield: tank.shield,
      clips: tank.shieldClips.map((clip) => ({ ...clip, frame: shieldClipFrame(clip) })),
      painted: view.container.children
        .filter((child) => child.visible && child.label?.startsWith('shield-'))
        .map((child) => child.label),
    });
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) world.step(emptyInput());
  };
  const spawn = () => {
    world.fireGun(tank, gun, emptyInput());
    const turret = world.bullets.at(-1)!;
    turret.build = 4;
    turret.stopped = true;
    turret.x = tank.x + 100;
    turret.y = tank.y;
    return turret;
  };
  const hit = (x: number, y: number) =>
    world.damage(
      tank,
      1,
      createProjectile(world.nextId(), {
        owner: -1,
        enemy: false,
        kind: 'shell',
        symbol: 1723,
        x: tank.x + x,
        y: tank.y + y,
        angle: 0,
        speed: 0,
        damage: 1,
      }),
    );
  try {
    const first = spawn();
    tick(1);
    hit(-50, 0);
    tick(3);
    capture('First turret · impact on current hit');
    const oldHit = tank.shieldHitClip!,
      firstFilm = gun.shieldFilm!;
    const oldView = view.container.children.find((child) => child.label === oldHit.key);
    world.removeBullet(first);
    tank.status.jam = 3;
    tick(2);
    capture('Turret removed · jam holds protection');
    tick(1);
    capture('Owner resumes · film removed, hit retained');
    let oldContact: { x: number; y: number } | undefined;
    if (pack.mode === 'swf') {
      for (let y = -90; y <= 90 && !oldContact; y += 2)
        for (let x = -90; x <= 90; x += 2) {
          const local = rotate({ x, y }, tank.rotation),
            global = { x: tank.x + local.x, y: tank.y + local.y };
          if (
            pack.hitTest(tank, global.x, global.y) &&
            !tank.design.parts.some((part) => pack.hitPart(tank, part, global.x, global.y))
          ) {
            oldContact = global;
            break;
          }
        }
      if (!oldContact) throw new Error('Retained turret impact did not contribute contact');
    }
    spawn();
    tick(1);
    hit(0, 50);
    capture('Rebuild · new pair beside old impact');
    const retainedHit = pack.mode !== 'swf' || view.container.children.includes(oldView!);
    const removedFilm = !view.container.children.some((child) => child.label === firstFilm.key);
    world.pause();
    tick(8);
    capture('Paused · both impacts advance independently');
    tick(100);
    capture('Still paused · film25 and hit16 stay stopped');
    return {
      panels,
      oldContact,
      retainedHit,
      removedFilm,
      oldKey: oldHit.key,
      currentKey: tank.shieldHitClip!.key,
      films: tank.shieldClips.filter((clip) => clip.kind === 'film').length,
    };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(sheet);
  }
}
