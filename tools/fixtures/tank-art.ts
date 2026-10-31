import { captureCanvas } from './pixi-capture';
import { Application, Container, Rectangle } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { PROTECTION_ART } from '../../src/game/data/status-art';
import type { Tank } from '../../src/game/core/types';
import { TankView } from '../../src/game/render/tank-view';
import { SwfProtectionView } from '../../src/game/render/swf-protection-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { createTank } from '../../src/game/simulation/tank';
import { World, emptyInput } from '../../src/game/simulation/world';
import { killMountedShield } from '../../src/game/simulation/shields';

/** Production tank/protection views, retained bounds and clocks through a paused World. */
export async function showTankArtProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    world = new World([], [], 31);
  await app.init({
    width: 200,
    height: 110,
    resolution: 2,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
  });
  host.appendChild(app.canvas);
  world.field.enemies = [];
  world.hitTest = () => false;
  world.protectionRadius = pack.protectionRadius;
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const panels: { label: string; ink: number; painted: number; hash: number }[] = [];
  const dispose: (() => void)[] = [];
  const make = (types: number[], centered = false) => {
    const tank = createTank(
      world.nextId(),
      {
        ...STARTER,
        parts: types.map((type, i) => ({
          ...STARTER.parts[0],
          key: `part-${i}`,
          type,
          x: centered ? 0 : i ? 20 : -12,
          y: 0,
          scale: 1,
          rotation: 0,
        })),
      },
      'player',
    );
    world.player = tank;
    return tank;
  };
  const pause = (count: number) => {
    if (world.mode !== 'paused') world.pause();
    for (let i = 0; i < count; i++) world.step(emptyInput());
  };
  const tankView = (tank: Tank) => {
    const view = new TankView(tank.design, pack, textures);
    app.stage.addChild(view.container);
    dispose.push(() => view.destroy());
    return view;
  };
  const protectionView = (tank: Tank) => {
    if (pack.mode === 'swf') {
      const view = new SwfProtectionView(pack, textures);
      app.stage.addChild(view.root);
      dispose.push(() => view.destroy());
      return {
        root: view.root,
        update: () => view.update(tank),
        filmScale: () =>
          view.displayEntries().find(([key]) => key.startsWith('shield-film:'))?.[1].scale.x,
      };
    }
    const view = tankView(tank);
    return {
      root: view.container,
      update: () => {
        view.update(tank);
        for (const child of view.container.children)
          if (child.label?.startsWith('part:')) child.visible = false;
      },
      filmScale: () => null,
    };
  };
  const capture = (label: string, root: Container) => {
    const frame = captureCanvas(app.renderer, {
      target: root,
      frame: new Rectangle(-100, -55, 200, 110),
      resolution: 2,
    }) as HTMLCanvasElement;
    const pixels = frame.getContext('2d')!.getImageData(0, 0, frame.width, frame.height).data;
    let ink = 0,
      hash = 2166136261;
    for (let i = 0; i < pixels.length; i++) {
      if (i % 4 === 3 && pixels[i]) ink++;
      hash = Math.imul(hash ^ pixels[i], 16777619);
    }
    const index = panels.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 150;
    ctx.drawImage(frame, x, y, 275, 150);
    const displayed = ctx.getImageData(x, y, 275, 150).data;
    let painted = 0;
    for (let i = 0; i < displayed.length; i += 4)
      if (displayed[i] !== 11 || displayed[i + 1] !== 60 || displayed[i + 2] !== 90) painted++;
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 8, y + 17);
    panels.push({ label, ink, painted, hash: hash >>> 0 });
    return ink;
  };
  try {
    const animated = make([1001, 2001]),
      body = animated.design.parts[0];
    const view = tankView(animated);
    view.update(animated);
    capture('Tank artwork · before pause', view.container);
    const firstPose = pack.mode === 'swf' ? pack.partClip(animated, body) : undefined;
    pause(12);
    view.update(animated);
    capture('Tank artwork · 12 paused ticks', view.container);
    const live = {
      age: animated.age,
      artAge: animated.artAge,
      poseAge: firstPose ? pack.partClip(animated, body).age : null,
      retained: firstPose ? pack.partClip(animated, body) === firstPose : true,
    };

    const shield = make([1003, 3010]);
    world.fireGun(shield, shield.guns[0], emptyInput());
    shield.shieldHitAge = 0;
    shield.shieldHitClip!.age = 0;
    const shieldView = protectionView(shield);
    shieldView.update();
    capture('Shield · cached display-child size', shieldView.root);
    const expectedScale =
      pack.mode === 'swf'
        ? shield.shieldDiameter! / pack.symbolScriptBounds(PROTECTION_ART.shield)!.width
        : null;
    const actualScale = shieldView.filmScale();
    killMountedShield(shield, shield.guns[0]);
    pause(3);
    shieldView.update();
    const remainingHitInk = capture('Immunity ended · hit clip remains', shieldView.root);
    const hit = { remainingHitInk, hitAge: shield.shieldHitAge, expectedScale, actualScale };

    const field = make([1001, 5005]),
      fieldPart = field.design.parts[0];
    const fieldView = protectionView(field);
    field.forcefieldFrame = 2;
    fieldView.update();
    capture('Forcefield · fresh full-design mask', fieldView.root);
    const radius = pack.forcefieldRadius(field);
    const clone = pack.mode === 'swf' ? pack.forcefieldPartClip(field, fieldPart) : undefined;
    pause(12);
    fieldView.update();
    capture('Forcefield · paused mask and impact', fieldView.root);
    const forcefield = {
      age: field.age,
      artAge: field.artAge,
      frame: field.forcefieldFrame,
      radius,
      cachedRadius: pack.forcefieldRadius(field),
      cloneAge: clone?.age ?? null,
      retained: clone ? pack.forcefieldPartClip(field, fieldPart) === clone : true,
    };

    let centeredScale: number | null = null;
    if (pack.mode === 'swf') {
      const centered = make([1003, 3010], true);
      world.fireGun(centered, centered.guns[0], emptyInput());
      const centeredView = protectionView(centered);
      centeredView.update();
      centeredScale = centeredView.filmScale() ?? null;
    }
    let galleryHash = 2166136261;
    for (const byte of ctx.getImageData(0, 0, 550, 450).data)
      galleryHash = Math.imul(galleryHash ^ byte, 16777619);
    return {
      mode: pack.mode,
      live,
      hit,
      forcefield,
      centeredScale,
      panels,
      galleryHash: galleryHash >>> 0,
    };
  } finally {
    for (const fn of dispose) fn();
    app.destroy({ removeView: true }, { children: true });
    textures.destroy();
    host.replaceChildren(canvas);
  }
}
