import { importAvatarFixture } from './avatar-attachments';
import { setFieldFixtureLayout } from './field-layout';
import type { SwfClip } from '../../src/game/assets/swf-clip';
import { Container, Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Tank } from '../../src/game/core/types';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank, deactivateTankData } from '../../src/game/simulation/tank';
import { applyProjectileStatus } from '../../src/game/simulation/status';
import { World, emptyInput } from '../../src/game/simulation/world';
import { importActorFixtures } from './actor-attachments';
import { captureFrame } from './pixi-capture';

/** Artificial display operations, not a claim of ordinary encounter reachability. */
export async function showActorRenderOwnership(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 151),
    renderer = new GameRenderer(pack);
  for (const tank of world.actorParents.owned(world.field)) world.actorParents.detach(tank);
  world.field.enemies = [];
  const make = (name: string, side: Tank['side'], x: number) =>
    createTank(
      world.nextId(),
      {
        ...STARTER,
        id: name,
        name,
        avatar: false,
        speed: 0,
        parts: [{ ...STARTER.parts[0], key: 'body', type: 1003, x: 0, y: 0, scale: 1 }],
      },
      side,
      x,
      0,
    );
  const a = make('enemy A', 'enemy', -90),
    b = make('ally B', 'ally', -30),
    c = make('enemy C', 'enemy', 30),
    d = make('display only', 'enemy', 90);
  const actors = [a, b, c, d];
  world.field.enemies = [a, c];
  world.allies.push(b);
  importActorFixtures(world);
  for (const tank of actors) {
    world.actorArtwork.construct(tank);
    world.attachActor(tank, world.field);
  }
  world.pause();
  await renderer.init(host, DEFAULT_SETTINGS);
  const sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 750;
  sheet.style.height = host.style.height = '750px';
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 750);
  // Read private retained views only in this tool. No production debug/fixture hook.
  const nodes = () =>
    (renderer as unknown as { tankNodes: Map<Tank | number, TankView> }).tankNodes;
  const view = (tank: Tank) => nodes().get(tank) ?? nodes().get(tank.uid);
  const displayed = () => {
    const names: string[] = [];
    const visit = (root: Container) => {
      const tank = [world.player, ...actors].find((tank) => view(tank)?.container === root);
      if (tank) names.push(tank === world.player ? 'avatar' : tank.design.name);
      else for (const child of root.children) visit(child);
    };
    visit(renderer.entities);
    return names;
  };
  const draw = () => renderer.draw(world, DEFAULT_SETTINGS);
  const panel = (label: string) => {
    draw();
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(renderer.app.canvas, x, y, 275, 130);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 6, y + 145);
    const result = { label, order: displayed() };
    panels.push(result);
    return result;
  };
  const panels: { label: string; order: string[] }[] = [];
  const textures = new SwfTextures();
  let childView: TankView | undefined, statusView: TankView | undefined;
  try {
    panel('Actual enemy / ally / display-only order');
    const originals = actors.map(view);
    const pose = pack.partClip(d, d.design.parts[0]);
    const poseState = (clip: SwfClip): unknown => ({
      age: clip.age,
      frame: clip.frame,
      children: [...clip.children].map(([depth, child]) => [depth, poseState(child.clip)]),
    });
    const before = JSON.stringify({
      pose: poseState(pose),
      rng: world.rng.state,
      age: d.artAge,
      children: d.displayChildren,
    });
    draw();
    draw();
    const pureReads =
      before ===
      JSON.stringify({
        pose: poseState(pack.partClip(d, d.design.parts[0])),
        rng: world.rng.state,
        age: d.artAge,
        children: d.displayChildren,
      });
    const stableViews = originals.every(
      (original, i) => original !== undefined && original === view(actors[i]),
    );
    world.attachActor(a, world.field);
    panel('Same-parent addChild raises enemy A');
    const raisedRetained = view(a) === originals[0];
    world.field.enemies = [];
    world.allies.length = 0;
    world.actorParents.sync(world);
    panel('Run arrays empty; attached clips remain');
    const beforeArt = d.artAge;
    world.step(emptyInput());
    const displayOnlyArtDelta = d.artAge - beforeArt;
    // Two actual wrappers are required to prove reparenting, not a changed flat position.
    const old = world.field;
    world.jump({ x: 1, y: 0 });
    const next = world.transit!.next;
    for (const tank of world.actorParents.owned(next)) world.actorParents.detach(tank);
    next.enemies = [];
    world.transit!.offset = { x: 170, y: 0 };
    setFieldFixtureLayout(world);
    world.actorParents.sync(world);
    draw();
    const oldParent = view(b)?.container.parent;
    old.enemies.push(b); // Raw stale alias cannot override physical parentage.
    world.attachActor(b, next);
    panel('Same ally object reparented to next field');
    const reparented = !!oldParent && !!view(b) && oldParent !== view(b)!.container.parent;
    const reparentRetained = !!originals[1] && view(b) === originals[1];
    const rawAliasPreserved = old.enemies.includes(b) && world.actorParents.inField(b, next);
    const reparentX = view(b)?.container.getGlobalPosition().x;
    const doomed = view(c);
    world.actorParents.detach(c);
    draw();
    const detachedDestroyed = !!doomed && doomed.container.destroyed && !view(c);
    const unrelatedRetained =
      !!originals[0] && originals[0] === view(a) && !originals[0].container.destroyed;
    world.attachActor(c, old);
    draw();
    const reattachedFresh = !!view(c) && view(c) !== doomed;
    // Deliberate duplicate UID AND design identity: only actual object identity can separate these.
    const twin = { ...d, x: d.x + 45 };
    actors.push(twin);
    world.attachActor(twin, old);
    old.enemies.push(d, twin); // Independent duplicate-UID control, including on the old renderer.
    draw();
    const identity = {
      distinct: !!view(d) && !!view(twin) && view(d) !== view(twin),
      count: new Set([view(d), view(twin)].filter(Boolean)).size,
    };
    old.enemies.push(a);
    draw();
    const emptyOuter = view(a);
    deactivateTankData(a);
    a.dead = true;
    panel('WipeTank keeps empty outer clip attached');
    const empty = {
      retained: !!emptyOuter && view(a) === emptyOuter,
      parented: !!view(a)?.container.parent,
      children: view(a)?.container.children.length ?? -1,
    };
    world.actorParents.detach(a);
    draw();
    const emptyRemoved = !!emptyOuter && emptyOuter.container.destroyed;
    // Positive controls: dead flag alone does not remove retained children. Real World status,
    // mounted shield and forcefield creation supply identities; no fabricated paint fallback.
    const protectedTank = createTank(
      world.nextId(),
      {
        ...STARTER,
        parts: [1003, 3010, 5005].map((type, i) => ({
          ...STARTER.parts[0],
          key: `p${i}`,
          type,
          x: i * 10 - 10,
          y: 0,
          scale: 1,
        })),
      },
      'player',
    );
    world.player = protectedTank;
    importAvatarFixture(world);
    world.fireGun(
      protectedTank,
      protectedTank.guns.find((gun) => gun.part.type === 3010)!,
      emptyInput(),
    );
    applyProjectileStatus(world, protectedTank, 'infect');
    childView = new TankView(protectedTank.design, pack, textures);
    let paintIndex = 5;
    const paint = (label: string, target = childView!, tank = protectedTank) => {
      target.update(tank);
      const frame = captureFrame(renderer.app.renderer, {
        target: target.container,
        frame: new Rectangle(-100, -60, 200, 120),
        resolution: 1,
      });
      let ink = 0;
      for (let i = 3; i < frame.pixels.length; i += 4) if (frame.pixels[i]) ink++;
      const index = paintIndex++,
        x = (index % 2) * 275,
        y = Math.floor(index / 2) * 150;
      ctx.fillStyle = '#0b3c5a';
      ctx.fillRect(x, y, 275, 150);
      ctx.drawImage(frame.canvas, x, y, 275, 130);
      ctx.fillStyle = '#e7f7ff';
      ctx.fillText(label, x + 6, y + 145);
      return { ink, children: target.container.children.map((child) => child.label) };
    };
    const livePaint = paint('Retained status / shield / forcefield');
    const retainedChildren = [...childView.container.children];
    protectedTank.dead = true;
    const deadPaint = paint('Dead flag alone retains actual children');
    const deadChildrenRetained = retainedChildren.every((child) =>
      childView!.container.children.includes(child),
    );
    const part = retainedChildren.find((child) => child.label === 'part:p0')!;
    protectedTank.displayChildren = protectedTank.displayChildren.filter(
      (key) => key !== 'part:p0',
    );
    childView.update(protectedTank);
    const partDetached = part.parent === null;
    protectedTank.displayChildren.push('part:p0');
    childView.update(protectedTank);
    const partReattached = childView.container.children.at(-1) === part;
    deactivateTankData(protectedTank);
    // Leave stale status durations/decoration and shield scalar to expose invented paint.
    const wipedPaint = paint('WipeTank: zero actual children, zero paint');
    const statusTank = make('retained status', 'enemy', 0);
    applyProjectileStatus(world, statusTank, 'stun');
    applyProjectileStatus(world, statusTank, 'infect');
    statusView = new TankView(statusTank.design, pack, textures);
    statusView.update(statusTank);
    const statusChildren = [...statusView.container.children];
    statusTank.dead = true;
    statusView.update(statusTank);
    const statusRetained = statusChildren.every((child) =>
      statusView!.container.children.includes(child),
    );
    const statusKeys = statusView.container.children.map((child) => child.label);
    const statusDeadPaint = paint('Retained dead status / infection', statusView, statusTank);
    deactivateTankData(statusTank);
    statusView.update(statusTank);
    const statusWiped = statusView.container.children.length === 0;
    const statusWipedPaint = paint(
      'Wiped status: no residual filter or marks',
      statusView,
      statusTank,
    );
    draw();
    draw();
    return {
      panels,
      pureReads,
      stableViews,
      raisedRetained,
      displayOnlyArtDelta,
      reparented,
      reparentRetained,
      rawAliasPreserved,
      reparentX,
      detachedDestroyed,
      unrelatedRetained,
      reattachedFresh,
      identity,
      empty,
      emptyRemoved,
      livePaint,
      deadPaint,
      deadChildrenRetained,
      partDetached,
      partReattached,
      wipedPaint,
      statusRetained,
      statusKeys,
      statusWiped,
      statusDeadPaint,
      statusWipedPaint,
    };
  } finally {
    statusView?.destroy();
    childView?.destroy();
    textures.destroy();
    renderer.destroy();
    host.replaceChildren(sheet);
  }
}
