import type { AssetPack } from '../../src/game/assets/asset-pack';
import { World } from '../../src/game/simulation/world';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import type { Field } from '../../src/game/core/types';
import type { FieldUnderAvatarView } from '../../src/game/render/field-under-avatar-view';
import fixture from '../../tests/fixtures/under-avatar-paint.json';

export async function showUnderAvatarPaint(pack: AssetPack, host: HTMLElement) {
  return { game: await gameControls(pack, host) };
}

/** Calls the actual GameRenderer branch; absent production integration paints nothing. */
async function gameControls(pack: AssetPack, host: HTMLElement) {
  const renderer = new GameRenderer(pack, true);
  const settings = { ...DEFAULT_SETTINGS, quality: 'low' as const };
  await renderer.init(host, settings);
  const views = () =>
    (renderer as unknown as { underAvatarNodes?: Map<Field, FieldUnderAvatarView> })
      .underAvatarNodes;
  const samplePixels = (x = 275, y = 225) => {
    renderer.app.render();
    const cv = document.createElement('canvas');
    cv.width = 550;
    cv.height = 450;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(renderer.app.canvas, 0, 0);
    return fixture.points.map(([dx, dy]) => [...ctx.getImageData(x + dx, y + dy, 1, 1).data]);
  };
  const results = [];
  let stable = true,
    pure = true,
    detachedRetained = true,
    reattachedRetained = true,
    obsoleteReleased = true;
  let previous: FieldUnderAvatarView | undefined;
  let exteriorPaint = '';
  try {
    for (const [i, sample] of fixture.samples.entries()) {
      if (sample.mode !== 'masked') continue;
      const world = new World([], [], 172, undefined, undefined, [], () => ({
        qualification: 'qualified',
        scaleX: 1,
        scaleY: 1,
      }));
      // Explicit artificial display operations; scalar/map edits are not a pose oracle.
      if (sample.rotation === 0) {
        world.fieldDisplays.moveCurrent(world.field, { x: 1, y: 0 });
        world.fieldDisplays.updateMasks(world.field);
        world.fieldDisplays.moveCurrent(world.field, { x: sample.x - 1, y: sample.y });
      } else world.fieldDisplays.moveCurrent(world.field, { x: sample.x, y: sample.y });
      const draw = () => {
        renderer.draw(world, settings);
        for (const child of renderer.app.stage.children) child.visible = child === renderer.root;
        for (const child of renderer.root.children) child.visible = child === renderer.underAvatars;
      };
      const before = JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]);
      draw();
      const view = views()?.get(world.field);
      obsoleteReleased &&=
        (!previous || previous.root.destroyed) &&
        views()?.size === 1 &&
        renderer.underAvatars.children.length === 1;
      previous = view;
      const pixels = samplePixels();
      draw();
      stable &&= !!view && views()?.get(world.field) === view;
      pure &&= before === JSON.stringify([world.fieldDisplays.read(world.field), world.rng.state]);
      results.push({ channel: 'game', i, pixels });
      if (i === 6) {
        exteriorPaint = renderer.app.canvas.toDataURL('image/png');
        // Changing raw gameplay/map scalars must not move the retained display.
        world.player.x += 31;
        world.player.y -= 27;
        world.field.col += 8;
        draw();
        pure &&= JSON.stringify(pixels) === JSON.stringify(samplePixels());
        world.fieldDisplays.orphan(world.field);
        draw();
        stable &&= view === views()?.get(world.field) && !!view?.root.visible;
        world.fieldDisplays.detach(world.field);
        draw();
        detachedRetained &&=
          !!view &&
          views()?.get(world.field) === view &&
          !view.root.visible &&
          !view.root.destroyed;
        world.fieldDisplays.attach(world.field, { x: -475, y: 0 });
        draw();
        reattachedRetained &&= !!view && view === views()?.get(world.field) && view.root.visible;
        world.fieldDisplays.beginCollapse(world.field);
        for (let n = 0; n < 51; n++) world.fieldDisplays.shrink(world.field);
        draw();
        const read = world.fieldDisplays.read(world.field);
        pure &&=
          !!view &&
          Math.abs(view.root.scale.x - read.root.pose.matrix.a) < 1e-12 &&
          Math.abs(view.under.x - read.slots.avatarUnder.pose.x) < 1e-12;
      }
    }
    return {
      results,
      stable,
      pure,
      detachedRetained,
      reattachedRetained,
      obsoleteReleased,
      exteriorPaint,
    };
  } finally {
    renderer.destroy();
  }
}
