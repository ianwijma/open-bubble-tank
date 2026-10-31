import { captureCanvas } from './pixi-capture';
import { Rectangle } from 'pixi.js';
import { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Projectile } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { tickBullet } from '../../src/game/simulation/projectiles';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Compare authored dimensions with the actual procedural paint and shoot-down adapter. */
export async function showMockAssetsProof(native: AssetPack, host: HTMLElement) {
  const mock = await AssetPack.mock(),
    packs = [native, mock];
  const worlds = packs.map(() => new World([], [], 43));
  const renderers = packs.map((pack) => new GameRenderer(pack));
  const mounts = packs.map(() => document.createElement('div'));
  for (let i = 0; i < 2; i++) {
    host.append(mounts[i]);
    await renderers[i].init(mounts[i], DEFAULT_SETTINGS);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { row: number; column: number; ink: number; painted: number }[] = [];
  let livePalette: { player: { g: number }; enemy: { g: number } } | undefined;
  const capture = (column: number, row: number, label: string, entities = false) => {
    const renderer = renderers[column],
      world = worlds[column];
    renderer.draw(world, DEFAULT_SETTINGS);
    const frame = captureCanvas(renderer.app.renderer, {
      target: entities
        ? renderer.entities
        : packs[column].mode === 'swf'
          ? renderer.nativeShots
          : renderer.projectiles,
      frame: new Rectangle(-120, -40, 240, 80),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    if (row === 0 && column === 1) {
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
    const x = column * 275,
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
    panels.push({ row, column, ink, painted });
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
  const comparisons: {
    symbol: number;
    native: { width: number; height: number };
    mock: { width: number; height: number };
  }[] = [];
  try {
    for (let column = 0; column < 2; column++) {
      const world = worlds[column];
      world.field.tutorial = 0;
      const body = { ...STARTER.parts[0], type: 1003, radius: 22.5, x: 0, y: 0 };
      world.player = createTank(
        world.nextId(),
        { ...STARTER, parts: [body, { ...STARTER.parts[1], type: 2001, x: 24, y: 0 }] },
        'player',
        -60,
        0,
      );
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
      capture(
        column,
        0,
        column === 0 && native.mode === 'swf'
          ? 'Original · player / enemy'
          : 'Mock · yellow / orange',
        true,
      );
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
          if (column === 0) {
            const a = native.projectileBounds(b),
              m = mock.projectileBounds(b);
            comparisons.push({
              symbol: b.symbol,
              native: { width: a.width, height: a.height },
              mock: { width: m.width, height: m.height },
            });
          }
        }
        capture(
          column,
          row + 1,
          [
            'Basic12 / heavy30 / Massive74',
            'Enemy homing / seeker / orbital',
            'Rocket / Flak15 / Sapper3',
          ][row],
        );
      }
    }
    const intercept = packs.map((pack) => {
      const world = new World([], [], 43);
      world.player.x = -200;
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
    });
    const palette = (id: number) => {
      const r = mock.part(id),
        values = [0, 0, 0];
      let count = 0;
      for (let i = 0; i < r.pixels.length; i += 4)
        // Compare saturated paint; differently sized source rims/glints skew a whole-image average.
        if (r.pixels[i + 3] > 128 && r.pixels[i] - r.pixels[i + 2] > 100) {
          count++;
          for (let c = 0; c < 3; c++) values[c] += r.pixels[i + c];
        }
      return { r: values[0] / count, g: values[1] / count, b: values[2] / count, count };
    };
    const bodyPixel = (pack: AssetPack) => {
      const body = pack.part(1003),
        cx = Math.floor(body.canvas.width / 2),
        cy = Math.floor(body.canvas.height / 2),
        offset = (cy * body.canvas.width + cx) * 4;
      return [...body.pixels.slice(offset, offset + 4)];
    };
    const body = bodyPixel(mock),
      referenceBody = bodyPixel(native);
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      mode: native.mode,
      comparisons,
      intercept,
      panels,
      palette: {
        player: palette(2001),
        enemy: palette(4001),
        bodyAlpha: body[3],
        bodyReferenceAlpha: referenceBody[3],
        bodyPixel: body,
        referenceBodyPixel: referenceBody,
      },
      livePalette,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    for (const renderer of renderers) renderer.destroy();
    host.replaceChildren(canvas);
  }
}
