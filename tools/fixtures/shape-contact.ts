import { Application, Graphics } from 'pixi.js';
import { AssetPack, type SpriteInfo } from '../../src/game/assets/asset-pack';
import { SwfClip } from '../../src/game/assets/swf-clip';
import { rasterMorphSVG } from '../../src/game/assets/morph-raster';
import { shapeToSVG } from '../../src/game/assets/swf-symbols.mjs';
import { STARTER } from '../../src/game/data/catalog';
import type { DecoratedStatus, Tank } from '../../src/game/core/types';
import { rotate } from '../../src/game/core/math';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { decorateStatus, applyProjectileStatus } from '../../src/game/simulation/status';
import { detachForcefield } from '../../src/game/simulation/forcefield';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { projectileTankContact } from '../../src/game/simulation/projectile-contact';

/** Same geometric cases as the project-authored AVM2 reference probe. */
function primitiveProof() {
  const pack = new AssetPack('swf');
  const shape = (id: number, transparent = false, stroke = false) => ({
    id,
    bounds: {
      xMin: stroke ? 300 : 400,
      yMin: stroke ? 300 : 400,
      xMax: stroke ? 1300 : 1200,
      yMax: stroke ? 1300 : 1200,
    },
    fills: [{ kind: 'solid', color: [0, 0, 0, transparent ? 0 : 255] }],
    lines: stroke ? [{ width: 200, color: [0, 0, 0, 0] }] : [],
    runs: [
      {
        start: [400, 400],
        ops: [
          ['L', 1200, 400],
          ['L', 1200, 1200],
          ['L', 400, 1200],
          ['L', 400, 400],
        ],
        f0: 0,
        f1: stroke ? 0 : 1,
        line: stroke ? 1 : 0,
      },
    ],
  });
  const shapes = new Map(
    [
      shape(90000),
      shape(90001, true),
      shape(90002, true, true),
      {
        ...shape(90003),
        bounds: { xMin: 400, yMin: 400, xMax: 600, yMax: 1200 },
        runs: [
          {
            start: [400, 400],
            ops: [
              ['L', 600, 400],
              ['L', 600, 1200],
              ['L', 400, 1200],
              ['L', 400, 400],
            ],
            f0: 0,
            f1: 1,
            line: 0,
          },
        ],
      },
    ].map((s) => [s.id, s]),
  );
  const matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const sprites: SpriteInfo[] = [
    { id: 680, frameCount: 1, placements: [{ charId: 90000, depth: 1, frame: 1, matrix }] },
    {
      id: 91000,
      frameCount: 1,
      placements: [
        {
          charId: 90000,
          depth: 1,
          frame: 1,
          matrix,
          color: { mult: [1, 1, 1, 0], add: [0, 0, 0, 0] },
        },
      ],
    },
    {
      id: 91001,
      frameCount: 1,
      placements: [
        { charId: 90003, depth: 1, frame: 1, matrix, clipDepth: 2 },
        { charId: 90000, depth: 2, frame: 1, matrix },
      ],
    },
    {
      id: 91002,
      frameCount: 1,
      placements: [{ charId: 90003, depth: 1, frame: 1, matrix, clipDepth: 2 }],
    },
  ];
  Object.assign(pack, { shapes, sprites: new Map(sprites.map((s) => [s.id, s])) });
  const clip = (id: number) => {
    const c = new SwfClip(id, pack);
    c.advance(1);
    return c;
  };
  const body = { ...STARTER.parts[0], type: 1001, x: 0, y: 0, scale: 1 },
    tank = createTank(1, { ...STARTER, parts: [body] }, 'enemy');
  const results: Record<string, boolean> = { opaque: pack.hitTest(tank, 40, 40) };
  tank.hiddenParts.add(body.key);
  results.hidden = pack.hitTest(tank, 40, 40);
  tank.alpha = 0;
  results.alphaZero = pack.hitTest(tank, 40, 40);
  results.placementAlphaZero = pack.hitClip(clip(91000), 40, 40);
  results.transparentFill = pack.hitClip(clip(90001), 40, 40);
  results.transparentStroke = pack.hitClip(clip(90002), 16, 40);
  results.maskInside = pack.hitClip(clip(91001), 25, 40);
  results.maskOutside = pack.hitClip(clip(91001), 45, 40);
  results.maskOnly = pack.hitClip(clip(91002), 25, 40);
  tank.removedParts.add(body.key);
  results.removed = pack.hitTest(tank, 40, 40);
  const emptyPaint = rasterMorphSVG(shapeToSVG(shapes.get(90001), undefined), {
    x: 20,
    y: 20,
    width: 40,
    height: 40,
  });
  const transparentInk = emptyPaint.pixels.reduce(
    (sum, value, index) => sum + (index % 4 === 3 ? value : 0),
    0,
  );
  for (let i = 0; i < 270; i++) {
    const id = 92000 + i;
    shapes.set(id, shape(id));
    pack.hitClip(clip(id), 40, 40);
  }
  const cacheSize = pack.shapeContactCount;
  pack.dispose();
  return { results, transparentInk, cacheSize, releasedCache: pack.shapeContactCount };
}

export async function showShapeContact(pack: AssetPack, host: HTMLElement) {
  const primitives = primitiveProof(),
    app = new Application(),
    textures = new SwfTextures();
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
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 600;
  sheet.style.height = '600px';
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 600);
  const panels: {
    label: string;
    point: { x: number; y: number };
    damage?: number;
    detached?: boolean;
  }[] = [];
  const pointOutsideParts = (tank: Tank, label = 'protection') => {
    for (let y = -50; y <= 50; y += 2)
      for (let x = -100; x <= 100; x += 2) {
        const q = rotate({ x, y }, tank.rotation),
          global = { x: q.x + tank.x, y: q.y + tank.y };
        if (
          !tank.design.parts.some((p) => pack.hitPart(tank, p, global.x, global.y)) &&
          pack.hitTest(tank, global.x, global.y)
        )
          return { local: { x, y }, global };
      }
    throw new Error(`No attached geometry beyond mounted parts: ${label}`);
  };
  const capture = (
    label: string,
    tank: Tank,
    p: ReturnType<typeof pointOutsideParts>,
    extra = {},
  ) => {
    const view = new TankView(tank.design, pack, textures),
      marker = new Graphics().circle(p.local.x, p.local.y, 2).fill(0xff7040);
    app.stage.addChild(view.container, marker);
    view.container.position.set(125, 60);
    marker.position.set(125, 60);
    marker.angle = tank.rotation;
    view.update(tank);
    app.render();
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(app.canvas, x, y, 275, 132);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    panels.push({ label, point: p.global, ...extra });
    view.destroy();
    marker.destroy();
  };
  const design = {
    ...STARTER,
    avatar: false,
    parts: [{ ...STARTER.parts[0], type: 1001, x: 30, y: 0, scale: 1 }],
  };
  try {
    if (pack.mode === 'swf') {
      const world = new World([], [], 44);
      for (const kind of ['sticky', 'stun', 'jam', 'weaken'] as DecoratedStatus[]) {
        // Source effect marks outlive removal of their selected carrier mount.
        const t = createTank(
          world.nextId(),
          {
            ...design,
            parts: [
              { ...design.parts[0], x: -30 },
              { ...STARTER.parts[1], key: 'carrier', type: 4013, x: 30, y: 0 },
            ],
          },
          'enemy',
        );
        decorateStatus(world, t, kind);
        world.releaseCarrier(t, t.guns[0]);
        capture(kind + ' · retained mark contact', t, pointOutsideParts(t, kind));
      }
      const infected = createTank(world.nextId(), design, 'enemy');
      applyProjectileStatus(world, infected, 'infect');
      // Each child has an authored blank delay before its pop on frames10–17.
      infected.artAge = 12;
      capture('Infection · overlay contact', infected, pointOutsideParts(infected, 'infection'));
    }
    const world = new World([], [], 44);
    world.player = createTank(
      world.nextId(),
      {
        ...STARTER,
        parts: [...design.parts, { ...STARTER.parts[1], type: 3010, key: 'shield', x: -15, y: 0 }],
      },
      'player',
      0,
      0,
      50,
      20,
    );
    world.hitTest = pack.hitTest;
    world.protectionRadius = pack.protectionRadius;
    const t = world.player;
    world.fireGun(t, t.guns[0], emptyInput());
    const hit = (p: { x: number; y: number }) => {
      world.field.enemies = [createTank(world.nextId(), design, 'enemy', 2000, 2000)];
      const shot = createProjectile(world.nextId(), {
        owner: -1,
        enemy: true,
        kind: 'shell',
        symbol: 1723,
        x: p.x,
        y: p.y,
        angle: 0,
        speed: 0,
        damage: 1,
      });
      const before = t.life;
      if (!projectileTankContact(world, shot))
        throw new Error('Expected actual projectile contact');
      return before - t.life;
    };
    const shieldPoint = pointOutsideParts(t);
    capture('Shield · film intercepts shot', t, shieldPoint, { damage: hit(shieldPoint.global) });
    world.jump({ x: 1, y: 0 });
    t.x = world.transit!.target.x;
    t.y = world.transit!.target.y;
    world.step(emptyInput());
    const retained = pointOutsideParts(t);
    capture('Arrival film · contact without immunity', t, retained, {
      damage: hit(retained.global),
    });
    const field = createTank(
      999,
      {
        ...STARTER,
        classId: 4,
        parts: [
          ...design.parts,
          { ...STARTER.parts[1], type: 2001, key: 'aimed', x: -30, y: 0, scale: 1 },
          { ...STARTER.parts[1], type: 5005, key: 'field', x: 0, y: 0, scale: 1 },
        ],
      },
      'player',
    );
    field.guns.find((g) => g.part.type === 2001)!.angle = 90;
    const fieldPoint = pointOutsideParts(field);
    capture('Forcefield · fresh clone mask contact', field, fieldPoint);
    detachForcefield(field);
    panels.at(-1)!.detached = pack.hitTest(field, fieldPoint.global.x, fieldPoint.global.y);
    return { mode: pack.mode, primitives, panels };
  } finally {
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(sheet);
  }
}
