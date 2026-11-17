import type { AssetPack } from '../../src/game/assets/asset-pack';
import { importAvatarFixture } from './avatar-attachments';
import { setFieldFixtureLayout } from './field-layout';
import { importActorFixtures } from './actor-attachments';
import { Application, Graphics } from 'pixi.js';
import { STARTER } from '../../src/game/data/catalog';
import type { Tank, TankChild } from '../../src/game/core/types';
import { rotate } from '../../src/game/core/math';
import { TankView } from '../../src/game/render/tank-view';
import { ArtTextures } from '../../src/game/render/art-textures';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { detachForcefield } from '../../src/game/simulation/forcefield';
import { createProjectile } from '../../src/game/simulation/create-projectile';
import { projectileTankContact } from '../../src/game/simulation/projectile-contact';
import { addTankChild, removeTankChild } from '../../src/game/simulation/tank-display';

export async function showShapeContact(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new ArtTextures();
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
  const membership: {
    kind: TankChild;
    before: boolean;
    after: boolean;
    restored: boolean;
    beforeViews: number;
    afterViews: number;
    logicalStateRetained: boolean;
  }[] = [];
  const checkMembership = (tank: Tank, kind: TankChild, point: { x: number; y: number }) => {
    const view = new TankView(tank.design, pack, textures),
      logical = () =>
        JSON.stringify({
          status: tank.status,
          decoration: tank.statusDecoration,
          shield: tank.shield,
          forcefieldAttached: tank.forcefieldAttached,
          forcefieldReady: tank.forcefieldReady,
        });
    try {
      view.update(tank);
      const beforeViews = view.container.children.filter((child) => child.label === kind).length,
        before = pack.hitTest(tank, point.x, point.y),
        state = logical();
      removeTankChild(tank, kind);
      view.update(tank);
      const afterViews = view.container.children.filter((child) => child.label === kind).length,
        after = pack.hitTest(tank, point.x, point.y),
        logicalStateRetained = state === logical();
      addTankChild(tank, kind);
      view.update(tank);
      membership.push({
        kind,
        before,
        after,
        restored: pack.hitTest(tank, point.x, point.y),
        beforeViews,
        afterViews,
        logicalStateRetained,
      });
    } finally {
      view.destroy();
    }
  };
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
    importAvatarFixture(world);
    world.hitTest = pack.hitTest;
    world.protectionRadius = pack.protectionRadius;
    const t = world.player;
    world.fireGun(t, t.guns[0], emptyInput());
    const hit = (p: { x: number; y: number }) => {
      world.field.enemies = [createTank(world.nextId(), design, 'enemy', 2000, 2000)];
      importActorFixtures(world);
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
    setFieldFixtureLayout(world);
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
    checkMembership(field, 'forcefield', fieldPoint.global);
    detachForcefield(field);
    panels.at(-1)!.detached = pack.hitTest(field, fieldPoint.global.x, fieldPoint.global.y);
    return { panels, membership };
  } finally {
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(sheet);
  }
}
