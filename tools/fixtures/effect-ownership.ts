import { Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { combatEffect } from '../../src/game/simulation/effects';
import { World } from '../../src/game/simulation/world';

/** Controlled CreateEffect contexts and same-ID objects, through the production renderer. */
export async function showEffectOwnershipProof(pack: AssetPack, host: HTMLElement) {
  const world = new World([], [], 12),
    renderer = new GameRenderer(pack);
  world.fieldDisplays.selectTutorial(world.field, 0);
  world.cache.store({
    col: 1,
    row: 0,
    scale: 1,
    enemies: [],
    cleared: false,
    boss: false,
    tutorial: 0,
  });
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  await renderer.init(host, DEFAULT_SETTINGS);
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const draw = () => {
    renderer.draw(world, { ...DEFAULT_SETTINGS, shake: false });
    context.clearRect(0, 0, 550, 450);
    context.drawImage(renderer.app.canvas, 0, 0, 550, 450);
    return context.getImageData(0, 0, 550, 450).data;
  };
  const bottom = renderer.root.children[2] as Container,
    top = renderer.root.children[8] as Container;
  const nodes = (layer: Container) =>
    layer.children.filter((c) => pack.mode !== 'swf' || !(c instanceof Graphics));
  try {
    const before = draw();
    const first = combatEffect(7000, { x: -80, y: 0 }, 'impact', {
      frame: 3,
      randomRotation: false,
      layer: 'bottom',
    });
    world.effectEngine.create(first, 'bottom', next);
    const painted = draw(),
      originalNode = nodes(bottom)[0];
    let changedPixels = 0;
    for (let i = 0; i < before.length; i += 4)
      if (before.slice(i, i + 4).some((v, j) => v !== painted[i + j])) changedPixels++;
    const actualParent = {
      count: nodes(bottom).length,
      position: originalNode?.getGlobalPosition(),
      changedPixels,
    };
    const second = combatEffect(7000, { x: 80, y: 0 }, 'impact', {
      frame: 3,
      randomRotation: false,
      layer: 'top',
    });
    world.effectEngine.create(second, 'top', world.field);
    draw();
    const duplicateIds = {
      bottom: nodes(bottom).length,
      top: nodes(top).length,
      distinct: nodes(bottom)[0] !== nodes(top)[0],
    };
    const secondNode = nodes(top)[0];
    world.effectEngine.create(first, 'top', next);
    draw();
    const reparent = {
      bottom: nodes(bottom).length,
      top: nodes(top).length,
      retained: nodes(top)[1] === originalNode,
      order: nodes(top)[0] === secondNode,
      positions: nodes(top).map((c) => c.getGlobalPosition()),
    };
    return { actualParent, duplicateIds, reparent };
  } finally {
    renderer.destroy();
    host.replaceChildren(canvas);
  }
}
