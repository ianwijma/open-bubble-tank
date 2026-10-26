import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank, healTank } from '../../src/game/simulation/tank';
import { World } from '../../src/game/simulation/world';

/** Same mounted body/gun geometry at full health, after damage, after healing, and as avatar. */
export async function showDegradationProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 1);
  await app.init({
    width: 550,
    height: 450,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const design = {
    ...STARTER,
    avatar: false,
    life: 100,
    parts: [
      ...[3, 2, 1].map((scale, i) => ({
        ...STARTER.parts[0],
        key: `body${i}`,
        type: 1001,
        x: -110 + i * 110,
        y: 0,
        scale,
        radius: 6.3 * scale,
      })),
      ...[0, 1, 2].map((i) => ({
        ...STARTER.parts[1],
        key: `gun${i}`,
        type: 4001,
        x: -110 + i * 110,
        y: 0,
      })),
    ],
  };
  const enemy = createTank(500, design, 'enemy'),
    player = createTank(501, { ...design, avatar: true }, 'player');
  const view = new TankView(design, pack, textures);
  view.container.position.set(275, 225);
  app.stage.addChild(view.container);
  const hashSmall = () => {
    const bytes = ctx.getImageData(369, 209, 32, 32).data;
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    return hash >>> 0;
  };
  const hashes: number[] = [],
    hits: boolean[] = [],
    hidden: string[][] = [];
  const snapshot = (tank: typeof enemy, y: number) => {
    view.update(tank);
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
    hashes.push(hashSmall());
    const p = tank.design.parts[2];
    hits.push(pack.hitPart(tank, p, p.x, p.y));
    hidden.push([...tank.hiddenParts]);
    // One row per snapshot, with an identical native pose and scale.
    sheetContext.drawImage(canvas, 100, 195, 350, 60, 100, y, 350, 60);
  };
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 450;
  const sheetContext = sheet.getContext('2d')!;
  try {
    snapshot(enemy, 35);
    world.damage(enemy, 60);
    snapshot(enemy, 135);
    healTank(enemy, 10);
    snapshot(enemy, 235);
    world.damage(player, 60);
    snapshot(player, 335);
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(sheet, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.font = '13px Arial';
    for (const [i, label] of [
      'Enemy · 100 life',
      'Enemy · 40 life',
      'Enemy healed · 50 life',
      'Player · 40 life',
    ].entries())
      ctx.fillText(label, 100, 30 + i * 100);
    return { hashes, hits, hidden, playerLife: player.life, enemyLife: enemy.life };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
}
