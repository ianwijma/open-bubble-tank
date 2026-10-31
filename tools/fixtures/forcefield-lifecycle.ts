import { Application, Container, Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { SwfProtectionView } from '../../src/game/render/swf-protection-view';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { World, emptyInput } from '../../src/game/simulation/world';
import { captureCanvas } from './pixi-capture';

/** Production protection view across real cleanup, pause, arrival and passive Setup. */
export async function showForcefieldLifecycle(pack: AssetPack, host: HTMLElement) {
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
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [1003, 1501, 3008, 5005].map((type, i) => ({
        ...STARTER.parts[0],
        key: `field-part-${i}`,
        type,
        x: i ? 20 : -12,
        y: 0,
        scale: 1,
        rotation: 0,
      })),
    },
    'player',
    0,
    0,
    50,
    20,
  );
  const tank = world.player,
    body = tank.design.parts[1],
    gunPart = tank.design.parts[2];
  world.field.enemies = [];
  world.hitTest = () => false;
  const native = pack.mode === 'swf' ? new SwfProtectionView(pack, textures) : undefined;
  const mock = native ? undefined : new TankView(tank.design, pack, textures);
  const root = native?.root ?? mock!.container;
  app.stage.addChild(root);
  const protection = () =>
    native?.root ?? (mock!.container.children[tank.design.parts.length] as Container);
  const update = () => (native ? native.update(tank) : mock!.update(tank));
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; generation: number; attached: boolean }[] = [];
  const capture = (label: string) => {
    update();
    const frame = captureCanvas(app.renderer, {
      target: protection(),
      frame: new Rectangle(-125, -60, 250, 120),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) ink++;
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 132);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    panels.push({
      label,
      ink,
      generation: tank.forcefieldGeneration,
      attached: tank.forcefieldAttached,
    });
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) world.step(emptyInput());
  };
  try {
    update();
    const oldSplash = native?.root.children[0];
    const oldClone = native ? pack.forcefieldPartClip(tank, body) : undefined;
    const live = native ? pack.partClip(tank, gunPart) : undefined;
    world.pause();
    tank.forcefieldFrame = 2;
    tick(12);
    capture('Before exit · live mask and impact');
    const oldCloneAge = oldClone?.age ?? null;
    world.resume();
    tank.status.jam = 4;
    world.jump({ x: 1, y: 0 });
    capture('Exit cleanup · wrapper detached');
    world.pause();
    tick(5);
    capture('Paused crossing · remains detached');
    world.resume();
    tank.x = world.transit!.target.x;
    tank.y = world.transit!.target.y;
    tick(1);
    world.field.enemies = [];
    capture('Arrival · passive Run still pending');
    tick(4);
    capture('Jam expires · fresh wrapper and mask');
    const newClone = native ? pack.forcefieldPartClip(tank, body) : undefined;
    const fresh = {
      generation: tank.forcefieldGeneration,
      origin: tank.forcefieldStartedAt,
      artAge: tank.artAge,
      cloneAge: newClone?.age ?? null,
      replaced: oldClone ? newClone !== oldClone : true,
      oldDestroyed: oldSplash?.destroyed ?? true,
      children: native?.root.children.length ?? null,
      liveRetained: live ? pack.partClip(tank, gunPart) === live : true,
    };
    world.damage(
      tank,
      1,
      createProjectile(world.nextId(), {
        owner: -1,
        enemy: true,
        kind: 'shell',
        symbol: 1723,
        x: tank.x + 40,
        y: tank.y,
        angle: 0,
        speed: 0,
        damage: 1,
      }),
    );
    world.pause();
    tick(12);
    capture('New instance · paused impact advances');
    return {
      mode: pack.mode,
      panels,
      oldCloneAge,
      fresh,
      finalCloneAge: newClone?.age ?? null,
      ready: tank.forcefieldReady,
    };
  } finally {
    native?.destroy();
    mock?.destroy();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(canvas);
  }
}
