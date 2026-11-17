import { setFieldFixtureLayout } from './field-layout';
import { importAvatarFixture } from './avatar-attachments';
import { importActorFixtures } from './actor-attachments';
import { captureCanvas } from './pixi-capture';
import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Authored dimensions, the actual procedural paint and the shoot-down adapter. */
export async function showMockAssetsProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 43);
  const renderer = new GameRenderer(pack);
  const mount = document.createElement('div');
  host.append(mount);
  await renderer.init(mount, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { row: number; ink: number; painted: number }[] = [];
  let livePalette: { player: { g: number }; enemy: { g: number } } | undefined;
  const capture = (row: number, label: string, entities = false) => {
    renderer.draw(world, DEFAULT_SETTINGS);
    const frame = captureCanvas(renderer.app.renderer, {
      target: entities ? renderer.entities : renderer.projectiles,
      // The retained avatar stays at World-local0. Place the isolated
      // live-mount comparison in separate crop halves without moving that avatar.
      frame: new Rectangle(entities ? -60 : -120, -40, 240, 80),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    if (row === 0) {
      const mean = (right: boolean) => {
        let green = 0,
          count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (
            (i / 4) % frame.width >= frame.width / 2 === right &&
            pixels[i + 3] > 128 &&
            pixels[i] - pixels[i + 2] > 100
          ) {
            green += pixels[i + 1];
            count++;
          }
        return { g: green / count };
      };
      livePalette = { player: mean(false), enemy: mean(true) };
    }
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) ink++;
    const x = 0,
      y = row * 112.5;
    ctx.drawImage(frame, x, y, 275, 112.5);
    const paintedPixels = ctx.getImageData(x, y, 275, 112).data;
    let painted = 0;
    for (let i = 0; i < paintedPixels.length; i += 4)
      if (paintedPixels[i] !== 11 || paintedPixels[i + 1] !== 60 || paintedPixels[i + 2] !== 90)
        painted++;
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '11px Arial';
    ctx.fillText(label, x + 7, y + 13);
    panels.push({ row, ink, painted });
  };
  const make = (world: World, options: Partial<Projectile>) =>
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1721,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
      ...options,
    });
  const sizes: { symbol: number; width: number; height: number }[] = [];
  try {
    world.field.tutorial = 0;
    world.fieldDisplays.selectTutorial(world.field, 0);
    const body = { ...STARTER.parts[0], type: 1003, radius: 22.5, x: 0, y: 0 };
    world.player = createTank(
      world.nextId(),
      { ...STARTER, parts: [body, { ...STARTER.parts[1], type: 2001, x: 24, y: 0 }] },
      'player',
      0,
      0,
    );
    importAvatarFixture(world);
    world.field.enemies = [
      createTank(
        world.nextId(),
        {
          ...STARTER,
          id: 'mock-palette-enemy',
          avatar: false,
          parts: [body, { ...STARTER.parts[1], type: 4001, x: 24, y: 0 }],
        },
        'enemy',
        60,
        0,
      ),
    ];
    importActorFixtures(world);
    capture(0, 'Mock · yellow / orange', true);
    world.field.enemies = [];
    const rows = [
      [
        { symbol: 1721, x: -75 },
        { symbol: 1721, x: -15, artScale: 2.5 },
        { symbol: 1794, x: 65, kind: 'pierce' },
      ],
      [
        { symbol: 1809, x: -65, kind: 'seeker', enemy: true },
        { symbol: 1827, x: 0, kind: 'seeker' },
        { symbol: 2016, x: 70, kind: 'orbital' },
      ],
      [
        { symbol: 2177, x: -65, kind: 'rocket', enemy: true },
        { symbol: 2031, x: 0, kind: 'flak' },
        { symbol: 1831, x: 70, kind: 'sapper', enemy: true },
      ],
    ] as Partial<Projectile>[][];
    for (let row = 0; row < rows.length; row++) {
      world.bullets = rows[row].map((options) => make(world, options));
      for (const b of world.bullets) {
        world.projectileTimelines.initialize(b);
        if (b.kind === 'flak') world.projectileTimelines.hold(b, 15);
        const bounds = pack.projectileBounds(b);
        sizes.push({ symbol: b.symbol, width: bounds.width, height: bounds.height });
      }
      capture(
        row + 1,
        [
          'Basic12 / heavy30 / Massive74',
          'Enemy homing / seeker / orbital',
          'Rocket / Flak15 / Sapper3',
        ][row],
      );
    }
    const intercept = (() => {
      const world = new World([], [], 43);
      world.player.x = -200;
      setFieldFixtureLayout(world);
      world.hitTest = () => false;
      world.hitProjectile = pack.hitProjectile;
      const shell = make(world, { artScale: 2.5 });
      const seeker = make(world, {
        kind: 'seeker',
        symbol: 1809,
        enemy: true,
        x: 10,
        owner: 999,
        targetId: world.player.uid,
      });
      world.addBullet(shell);
      world.addBullet(seeker);
      const hit = pack.hitProjectile(shell, seeker.x, seeker.y);
      tickBullet(world, seeker, emptyInput());
      return {
        hit,
        seekerRemoved: seeker.dead,
        shellAlive: !shell.dead,
        outsideOldRadius: Math.hypot(seeker.x - shell.x, seeker.y - shell.y) > shell.radius,
      };
    })();
    const palette = (id: number) => {
      const r = pack.part(id),
        values = [0, 0, 0];
      let count = 0;
      for (let i = 0; i < r.pixels.length; i += 4)
        // Compare saturated paint; differently sized rims/glints skew a whole-image average.
        if (r.pixels[i + 3] > 128 && r.pixels[i] - r.pixels[i + 2] > 100) {
          count++;
          for (let c = 0; c < 3; c++) values[c] += r.pixels[i + c];
        }
      return { r: values[0] / count, g: values[1] / count, b: values[2] / count, count };
    };
    const bodyRaster = pack.part(1003),
      cx = Math.floor(bodyRaster.canvas.width / 2),
      cy = Math.floor(bodyRaster.canvas.height / 2),
      offset = (cy * bodyRaster.canvas.width + cx) * 4;
    const bodyPixel = [...bodyRaster.pixels.slice(offset, offset + 4)];
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      sizes,
      intercept,
      panels,
      palette: {
        player: palette(2001),
        enemy: palette(4001),
        bodyAlpha: bodyPixel[3],
        bodyPixel,
      },
      livePalette,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
