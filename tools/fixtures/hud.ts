import { Application } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { HUD, secondaryRate, weaponRows } from '../../src/game/core/hud';
import { STARTER } from '../../src/game/data/catalog';
import { WEAPONS } from '../../src/game/data/weapons';
import { World } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { HudView } from '../../src/game/render/hud-view';
import { SwfTextures } from '../../src/game/render/swf-textures';

export async function showHudProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 50);
  const primary = Array.from({ length: 9 }, (_, i) => 2001 + i);
  const design = {
    ...STARTER,
    name: 'HUD comparison',
    parts: [2001, ...primary, 3010].map((type, i) => ({
      ...STARTER.parts[1],
      type,
      key: String(i),
    })),
  };
  const app = new Application(),
    textures = new SwfTextures();
  await app.init({
    width: 550,
    height: 450,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  const view = new HudView(pack, textures);
  app.stage.addChild(view.root);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  function draw() {
    view.update(world);
    app.render();
    ctx.clearRect(0, 0, 550, 450);
    ctx.drawImage(app.canvas, 0, 0, 550, 450);
  }
  const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
  try {
    world.hud.lifeY = HUD.life.y + 0.2;
    world.hud.fireY = HUD.fire.y;
    world.player = createTank(500, { ...design, parts: [] }, 'player', 0, 0, 100, 50);
    draw();
    const empty = alpha(470, 25);
    world.player = createTank(
      501,
      { ...design, parts: design.parts.slice(-1) },
      'player',
      0,
      0,
      100,
      50,
    );
    world.secondaryCounter = secondaryRate(world.player) / 2;
    draw();
    const secondaryOnly = { filled: alpha(470, 25), empty: alpha(520, 25) };
    world.player = createTank(502, design, 'player', 0, 0, 100, 50);
    world.player.guns[0].counter = WEAPONS[2001].rate / 2;
    world.secondaryCounter = secondaryRate(world.player) * 0.75;
    draw();
    return {
      empty,
      secondaryOnly,
      primary: { filled: alpha(470, 25), empty: alpha(520, 25) },
      secondary: { filled: alpha(470, 178), empty: alpha(520, 178) },
      life: { filled: alpha(100, 424), empty: alpha(400, 424) },
      labels: weaponRows(world.player).map((r) => r.label),
    };
  } finally {
    view.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
  }
}
