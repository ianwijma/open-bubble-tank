import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { applyProjectileStatus } from '../../src/game/simulation/status';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Actual production painting before/after source direct-child mutations. */
export async function showForcefieldOrder(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 83);
  await app.init({
    width: 250,
    height: 120,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  host.style.height = '600px';
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [1003, 3010, 5005].map((type, i) => ({
        ...STARTER.parts[0],
        key: `mount-${i}`,
        type,
        x: i ? 12 : -12,
        y: 0,
        scale: 1,
      })),
    },
    'player',
    0,
    0,
    50,
    20,
  );
  world.field.enemies = [];
  world.hitTest = () => false;
  const tank = world.player,
    view = new TankView(tank.design, pack, textures);
  view.container.position.set(125, 60);
  app.stage.addChild(view.container);
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 600;
  sheet.style.height = '600px';
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 600);
  const panels: {
    label: string;
    order: string[];
    painted: string[];
    ready: boolean;
    debt: number;
    shield: number;
    filmAge: number;
    ink: number;
  }[] = [];
  const capture = (label: string) => {
    view.update(tank);
    app.render();
    const i = panels.length,
      x = (i % 2) * 275,
      y = Math.floor(i / 2) * 150;
    ctx.drawImage(app.canvas, x, y, 275, 132);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    const pixels = app.renderer.extract.pixels({ target: view.container }).pixels;
    let ink = 0;
    for (let n = 3; n < pixels.length; n += 4) if (pixels[n]) ink++;
    const painted = view.container.children.map((child) => child.label).filter(Boolean);
    panels.push({
      label,
      order: [...tank.displayChildren],
      painted: painted.filter((key, index) => key !== painted[index - 1]),
      ready: tank.forcefieldReady,
      debt: tank.forcefield,
      shield: tank.shield,
      filmAge: tank.shieldAge,
      ink,
    });
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) world.step(emptyInput());
  };
  try {
    world.damage(tank, 40);
    capture('Broken · wrapper still topmost');
    const splash = view.container.children.find((child) => child.label === 'forcefield');
    world.fireGun(
      tank,
      tank.guns.find((gun) => gun.part.type === 3010)!,
      emptyInput(),
    );
    capture('Shield · hit and film added above');
    world.pause();
    tick(8);
    capture('Paused · passive reorder pending');
    world.resume();
    tick(1);
    capture('Run · same wrapper moved to top');
    const retained = view.container.children.includes(splash!);
    world.jump({ x: 1, y: 0 });
    tank.x = world.transit!.target.x;
    tank.y = world.transit!.target.y;
    tick(1);
    world.field.enemies = [];
    capture('Arrival · film remains, immunity cleared');
    tick(30);
    capture('30 stages later · retained film keeps playing');
    applyProjectileStatus(world, tank, 'infect');
    capture('Infection · new child above wrapper');
    tick(1);
    capture('Run · wrapper above infection');
    return { panels, retained, generation: tank.forcefieldGeneration, mode: pack.mode };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(sheet);
  }
}
