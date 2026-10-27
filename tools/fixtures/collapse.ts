import { Container, Graphics, Point, Rectangle } from 'pixi.js';
import { AssetPack, type Raster, type SpriteInfo } from '../../src/game/assets/asset-pack';
import { buildDisplayList } from '../../src/game/assets/display-list';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { SwfSymbolView } from '../../src/game/render/swf-symbol-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Real collapse frames plus an independent geometric erase-composition control. */
export async function showCollapseProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 41),
    renderer = new GameRenderer(pack, true);
  const settings = { ...DEFAULT_SETTINGS, zoom: 0.75 };
  world.jump({ x: 1, y: 0 });
  for (let i = 0; world.transit && i < 300; i++) world.step(emptyInput());
  world.field.enemies = [];
  world.field.scale = 1.4;
  world.field.tutorial = 0;
  world.player.x = 140;
  world.player.y = -70;
  world.player.guns = [];
  world.viewZoom = settings.zoom;
  world.field.enemies.push(
    createTank(
      world.nextId(),
      { ...STARTER, avatar: false, parts: [STARTER.parts[0]], speed: 0 },
      'enemy',
      70,
      20,
    ),
  );
  world.addBullet(
    createProjectile(world.nextId(), {
      owner: -1,
      enemy: true,
      kind: 'shell',
      symbol: 1717,
      x: 60,
      y: 80,
      angle: 0,
      speed: 0,
      damage: 1,
    }),
  );
  world.pickups.push({
    uid: world.nextId(),
    x: -60,
    y: 60,
    value: 5,
    vx: 0,
    vy: 0,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  });
  const bottom = world.addCombatEffect(
    { x: 100, y: 40 },
    'impact',
    { layer: 'bottom', frame: 1, randomRotation: false },
    true,
  );
  const top = world.addCombatEffect(
    { x: 100, y: 40 },
    'impact',
    { layer: 'top', frame: 1, randomRotation: false },
    true,
  );
  world.beginCollapse(30);
  const effect = world.collapse!.effect;
  await renderer.init(host, settings);
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const ctx = gallery.getContext('2d')!;
  const snapshots: object[] = [];
  try {
    for (const [index, steps] of [0, 51, 68].entries()) {
      for (let i = 0; i < steps; i++) world.step(emptyInput());
      renderer.draw(world, settings);
      ctx.drawImage(renderer.app.canvas, (index % 2) * 275, Math.floor(index / 2) * 225, 275, 225);
      ctx.fillStyle = '#e7f7ff';
      ctx.font = '11px Arial';
      ctx.fillText(
        `Age ${world.collapse!.age} · clip ${effect.frame}`,
        (index % 2) * 275 + 8,
        Math.floor(index / 2) * 225 + 14,
      );
      const avatar = renderer.entities.children.at(-1)!;
      const bottomLayer = renderer.root.children[2] as Container;
      const topLayer = renderer.root.children[8] as Container;
      const b = bottomLayer.children.at(-1)!,
        t = topLayer.children.at(-1)!;
      snapshots.push({
        age: world.collapse!.age,
        frame: effect.frame,
        camera: renderer.root.scale.x,
        center: renderer.root.toGlobal(new Point(0, 0)),
        avatar: avatar.getGlobalPosition(),
        avatarScale: avatar.scale.x,
        shot: renderer.nativeShots.children[0]?.getGlobalPosition() ?? null,
        mockShotScale: renderer.projectiles.children[0]?.scale.x,
        fieldWidth: renderer.fields.children[0].width,
        bottom: pack.mode === 'swf' ? { x: b.x, y: b.y, scale: b.scale.x } : null,
        top: pack.mode === 'swf' ? { x: t.x, y: t.y, scale: t.scale.x } : null,
        retainedPosition: { x: effect.x, y: effect.y },
      });
    }
    world.step(emptyInput());
    renderer.draw(world, settings);
    const completed = {
      mode: world.mode,
      hasCollapse: world.effects.includes(effect),
      shake: world.mainEffects.remaining,
      flash: world.effects.some((e) => e.symbol === 114),
    };
    const synthetic = new AssetPack('mock'),
      textures = new SwfTextures();
    const leaf = (id: number, radius: number, color: string, square = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = radius * 2;
      const c = canvas.getContext('2d')!;
      c.fillStyle = color;
      c.beginPath();
      if (square) c.rect(0, 0, radius * 2, radius * 2);
      else c.arc(radius, radius, radius, 0, Math.PI * 2);
      c.fill();
      synthetic.leaves.set(id, {
        canvas,
        x: -radius,
        y: -radius,
        width: radius * 2,
        height: radius * 2,
        resolution: 1,
        url: '',
        pixels: c.getImageData(0, 0, canvas.width, canvas.height).data,
      } satisfies Raster);
    };
    leaf(30001, 35, '#0000ff');
    leaf(30002, 10, '#ffffff', true);
    const sprite: SpriteInfo = {
      id: 30000,
      frameCount: 1,
      placements: [
        { frame: 1, depth: 1, charId: 30001 },
        { frame: 1, depth: 2, charId: 30002, blendMode: 12 },
      ],
    };
    const nested: SpriteInfo = {
      id: 30003,
      frameCount: 1,
      placements: [
        {
          frame: 1,
          depth: 1,
          charId: 30002,
          filters: [
            {
              kind: 'glow',
              color: [255, 0, 0, 255],
              blurX: 10,
              blurY: 10,
              strength: 1,
              inner: false,
              knockout: true,
              compositeSource: true,
              passes: 1,
            },
          ],
        },
      ],
    };
    const sprites = new Map([
      [30000, sprite],
      [30003, nested],
    ]);
    synthetic.spriteInfo = (id) => sprites.get(id);
    synthetic.displayList = (id, age) => {
      const info = sprites.get(id);
      return info ? buildDisplayList(info, age) : [];
    };
    const scene = new Container(),
      view = new SwfSymbolView(30000, synthetic, textures);
    scene.addChild(new Graphics().rect(0, 0, 100, 100).fill(0xff0000), view.root);
    view.root.position.set(50, 50);
    view.setBlendMode(2);
    view.update(1);
    const image = renderer.app.renderer.extract.canvas({
      target: scene,
      frame: new Rectangle(0, 0, 100, 100),
      resolution: 1,
    }) as HTMLCanvasElement;
    const data = image.getContext('2d')!;
    const pixel = (x: number, y: number) => [...data.getImageData(x, y, 1, 1).data];
    const erase = { center: pixel(50, 50), ring: pixel(75, 50), outside: pixel(5, 5) };
    // Exercise inherited ERASE on a filtered child, as in2173→2069→2068.
    sprite.placements[1].charId = 30003;
    view.update(2);
    const glowImage = renderer.app.renderer.extract.canvas({
      target: scene,
      frame: new Rectangle(0, 0, 100, 100),
      resolution: 1,
    }) as HTMLCanvasElement;
    const glowPixels = glowImage.getContext('2d')!;
    const alpha = (x: number, y: number) => (x >= 40 && x < 60 && y >= 40 && y < 60 ? 1 : 0);
    const weight = (offset: number) => (Math.abs(offset) === 5 ? 127 / 255 : 1);
    const horizontal = (x: number, y: number) => {
      let sum = 0;
      for (let d = -5; d <= 5; d++) sum += alpha(x + d, y) * weight(d);
      return Math.floor((sum / 10) * 255) / 255;
    };
    const expected = (x: number, y: number) => {
      let sum = 0;
      for (let d = -5; d <= 5; d++) sum += horizontal(x, y + d) * weight(d);
      const knockout = (Math.floor((sum / 10) * 255) / 255) * (1 - alpha(x, y));
      return [Math.round(knockout * 255), 0, Math.round((1 - knockout) * 255), 255];
    };
    const glow = [50, 59, 60, 61, 64, 65].map((x) => ({
      x,
      actual: [...glowPixels.getImageData(x, 50, 1, 1).data],
      expected: expected(x, 50),
    }));
    ctx.fillStyle = '#143f56';
    ctx.fillRect(275, 225, 275, 225);
    ctx.drawImage(glowImage, 325, 250, 175, 175);
    ctx.fillStyle = '#e7f7ff';
    ctx.fillText('Knockout glow · isolated ERASE', 283, 239);
    view.destroy();
    scene.destroy({ children: true });
    textures.destroy();
    let hash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      hash = Math.imul(hash ^ byte, 16777619);
    return {
      mode: pack.mode,
      snapshots,
      completed,
      erase,
      glow,
      galleryHash: hash >>> 0,
      ids: { bottom: bottom.uid, top: top.uid },
      nativeErase:
        pack.spriteInfo(2173)?.placements.find((p) => p.charId === 2069)?.blendMode ?? null,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(gallery);
  }
}
