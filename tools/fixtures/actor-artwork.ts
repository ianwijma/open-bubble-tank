import { Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { SwfClip } from '../../src/game/assets/swf-clip';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { TankView } from '../../src/game/render/tank-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { addTankChild, removeTankChild } from '../../src/game/simulation/tank-display';
import { World, emptyInput } from '../../src/game/simulation/world';
import { setFieldFixtureLayout } from './field-layout';
import { captureFrame } from './pixi-capture';

/** Controlled display operations; source clock windows, not an ordinary encounter oracle. */
export async function showActorArtwork(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 47),
    renderer = new GameRenderer(pack),
    textures = new SwfTextures();
  await renderer.init(host, DEFAULT_SETTINGS);
  const tank = world.spawnEnemy(
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [1501, 1501, 4015].map((type, i) => ({
        ...STARTER.parts[0],
        key: `mount-${i}`,
        type,
        x: i === 2 ? 30 : 0,
        y: i === 0 ? -20 : i === 1 ? 20 : 0,
        scale: 1,
        rotation: 0,
      })),
    },
    { x: 0, y: 0 },
  );
  const home = world.field;
  home.cleared = false;
  world.cache.store({ ...home, col: 1, enemies: [] });
  world.hitTest = () => false;
  const view = new TankView(tank.design, pack, textures),
    sheet = document.createElement('canvas');
  sheet.width = 550;
  sheet.height = 450;
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const roots = tank.design.parts.map((part) => pack.partClip(tank, part)),
    rotor = roots[2];
  const child = rotor.children.get(1)!;
  const draw = () => renderer.draw(world, DEFAULT_SETTINGS);
  const nodes = () => (renderer as unknown as { tankNodes: Map<object, TankView> }).tankNodes;
  const state = (clip: SwfClip): unknown => [
    clip.age,
    clip.frame,
    [...clip.children.values()].map((c) => state(c.clip)),
  ];
  const samples = Array.from({ length: 80 * 80 }, (_, i) => ({
    x: (i % 80) - 40,
    y: Math.floor(i / 80) - 60,
  }));
  const contact = () =>
    samples.map((p) => pack.hitPart(tank, tank.design.parts[0], p.x + tank.x, p.y + tank.y));
  const initialContact = contact();
  const panels: {
    label: string;
    artAge: number;
    frames: number[];
    childAge: number;
    childFrame: number;
    ink: number;
    hash: number;
    changedContact: number;
  }[] = [];
  let stableReads = true;
  const capture = (label: string) => {
    const before = JSON.stringify(roots.map(state));
    view.update(tank);
    draw();
    const hits = contact();
    const frame = captureFrame(renderer.app.renderer, {
      target: view.container,
      frame: new Rectangle(-90, -60, 180, 120),
      resolution: 2,
    });
    let ink = 0,
      hash = 2166136261;
    for (const [i, byte] of frame.pixels.entries()) {
      if (i % 4 === 3 && byte) ink++;
      hash = Math.imul(hash ^ byte, 16777619);
    }
    stableReads &&= before === JSON.stringify(roots.map(state));
    const i = panels.length,
      x = (i % 2) * 275,
      y = Math.floor(i / 2) * 150;
    ctx.drawImage(frame.canvas, x, y, 275, 130);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 5, y + 145);
    panels.push({
      label,
      artAge: tank.artAge,
      frames: roots.map((root) => root.frame),
      childAge: child.clip.age,
      childFrame: child.clip.frame,
      ink,
      hash: hash >>> 0,
      changedContact: hits.filter((hit, j) => hit !== initialContact[j]).length,
    });
  };
  const until = (age: number) => {
    while (tank.artAge < age) world.advanceArtwork();
  };
  try {
    capture('Constructor · current mounted tree');
    const firstView = nodes().get(tank);
    until(110);
    world.jump({ x: 1, y: 0 });
    world.player.x = world.transit!.target.x;
    world.player.y = world.transit!.target.y;
    setFieldFixtureLayout(world);
    world.step(emptyInput());
    draw();
    const cached =
      world.cache.get(0, 0)!.enemies[0].tank === tank &&
      world.actorParents.hasParent(tank) &&
      !world.actorParents.onStage(tank) &&
      !nodes().has(tank);
    until(149);
    capture('Cached · retained pose at ENTER150');
    until(199);
    world.jump({ x: -1, y: 0 });
    draw();
    const restored =
      world.transit!.next.enemies[0] === tank &&
      nodes().has(tank) &&
      nodes().get(tank) !== firstView;
    capture('Revisit · same mounts at ENTER200');
    const age = tank.age;
    world.actorParents.detach(tank);
    until(399);
    capture('Direct actor removal · ENTER400');
    world.attachActor(tank, world.transit!.next);
    removeTankChild(tank, 'part:mount-2');
    until(439);
    view.update(tank);
    const removedMount = !view.container.children.some((c) => c.label === 'part:mount-2');
    capture('Rotor removed · child still ticking');
    const childAge = child.clip.age;
    until(440);
    addTankChild(tank, 'part:mount-2');
    capture('Rotor reattached · same child at ENTER441');
    const mountedRetained =
      roots.every((root, i) => pack.partClip(tank, tank.design.parts[i]) === root) &&
      rotor.children.get(1) === child &&
      child.clip.age === childAge + 1;
    return {
      panels,
      cached,
      restored,
      removedMount,
      mountedRetained,
      stableReads,
      noRun: tank.age === age,
      rotorFrames: panels.map((panel) => panel.frames[2]),
      childFrames: panels.map((panel) => panel.childFrame),
      boundary:
        'host artwork entropy; lazy construction/provider and global original phase remain unproved',
    };
  } finally {
    view.destroy();
    textures.destroy();
    renderer.destroy();
    host.replaceChildren(sheet);
  }
}
