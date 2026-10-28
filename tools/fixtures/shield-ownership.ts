import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { Tank } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createProjectile } from '../../src/game/simulation/create-projectile';

/** Production display/contact paths for independent AGunShield instances and callbacks. */
export async function showShieldOwnership(pack: AssetPack, host: HTMLElement) {
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
  const design = {
    ...STARTER,
    parts: [
      STARTER.parts[0],
      ...['a', 'b'].map((key, i) => ({
        ...STARTER.parts[1],
        key,
        type: 3010,
        x: i ? 10 : -10,
        y: 0,
      })),
    ],
  };
  const tank = (world.player = createTank(world.nextId(), design, 'player', 0, 0, 50, 20));
  world.field.enemies = [];
  world.hitTest = () => false;
  let measurements = 0;
  world.protectionRadius = () => (++measurements === 1 ? 45 : 75);
  const [a, b] = tank.guns,
    view = new TankView(design, pack, textures);
  view.container.position.set(125, 75);
  app.stage.addChild(view.container);
  const panels: {
    label: string;
    clips: unknown[];
    painted: string[];
    shield: number;
    life: number;
  }[] = [];
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
      life: tank.life,
      clips: tank.shieldClips.map((clip) => ({ ...clip })),
      painted: view.container.children
        .filter((child) => child.visible && child.label?.startsWith('shield-'))
        .map((child) => child.label),
    });
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) world.step(emptyInput());
  };
  const hit = (x: number, y: number) =>
    world.damage(
      tank,
      1,
      createProjectile(world.nextId(), {
        owner: -1,
        enemy: true,
        kind: 'shell',
        symbol: 1723,
        x,
        y,
        angle: 0,
        speed: 0,
        damage: 1,
      }),
    );
  try {
    world.fireGun(tank, a, emptyInput());
    hit(-50, 0);
    capture('Mount A · own hit and film');
    const olderHit = view.container.children.find((child) => child.label === 'shield-hit:a');
    tick(10);
    world.fireGun(tank, b, emptyInput());
    hit(0, 50);
    capture('Mount B · separate size, clock and hit');
    const filmB = view.container.children.find((child) => child.label === 'shield-film:b:1');
    // Find geometry contributed only by the larger attached film, outside all design parts.
    const isolated = (key: string): Tank => ({
      ...tank,
      design: { ...design, parts: [] },
      shieldClips: tank.shieldClips.filter((clip) => clip.key === key),
    });
    let contact: { x: number; y: number } | undefined;
    for (let y = -90; y <= 90 && !contact; y += 2)
      for (let x = -90; x <= 90; x += 2)
        if (
          pack.hitTest(isolated('shield-film:b:1'), x, y) &&
          !pack.hitTest(isolated('shield-film:a:1'), x, y) &&
          !design.parts.some((part) => pack.hitPart(tank, part, x, y))
        ) {
          contact = { x, y };
          break;
        }
    if (!contact) throw new Error('No independent larger-film contact point');
    tick(15);
    world.damage(tank, 1);
    capture('A expires · B remains without immunity');
    const retainedB = view.container.children.includes(filmB!);
    const removedA = !view.container.children.some((child) => child.label === 'shield-film:a:1');
    tick(10);
    capture('B expires · both hit instances stay');
    const retainedHit = pack.mode !== 'swf' || view.container.children.includes(olderHit!);
    world.fireGun(tank, a, emptyInput());
    hit(50, 0);
    capture('A retriggers · cached size, latest hit still B');
    world.jump({ x: 1, y: 0 });
    tank.x = world.transit!.target.x;
    tank.y = world.transit!.target.y;
    tick(1);
    capture('Arrival · current film retained, immunity cleared');
    return {
      mode: pack.mode,
      panels,
      contact,
      retainedB,
      removedA,
      retainedHit,
      measurements,
      latestHit: tank.shieldHitClip!.key,
      pending: world.runtimeFor(world.field).pending.length,
    };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(sheet);
  }
}
