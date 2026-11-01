import { AssetPack, type Raster, type SpriteInfo } from '../../src/game/assets/asset-pack';
import { SwfClip } from '../../src/game/assets/swf-clip';
import type { ButtonInfo, ButtonState } from '../../src/game/assets/button-display-list';

function proof(raster: Raster) {
  let hash = 2166136261,
    ink = 0;
  for (let i = 0; i < raster.pixels.length; i++) {
    hash = Math.imul(hash ^ raster.pixels[i], 16777619);
    if (i % 4 === 3 && raster.pixels[i]) ink++;
  }
  return {
    x: raster.x,
    y: raster.y,
    width: raster.width,
    height: raster.height,
    hash: hash >>> 0,
    ink,
  };
}
function sample(raster: Raster, x: number, y: number) {
  return [
    ...raster.canvas
      .getContext('2d')!
      .getImageData(
        Math.floor((x - raster.x) * raster.resolution),
        Math.floor((y - raster.y) * raster.resolution),
        1,
        1,
      ).data,
  ];
}

async function synthetic() {
  const pack = new AssetPack('swf');
  const identity = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const button: ButtonInfo = {
    id: 95000,
    states: (['up', 'over', 'down', 'hit'] as const).map((state, i) => ({
      charId: 95001 + i,
      depth: i + 1,
      matrix: { ...identity, tx: state === 'hit' ? 0 : 200, ty: state === 'hit' ? 0 : 100 },
      color: { mult: [1, 1, 1, state === 'up' ? 0.5 : 1], add: [0, 0, 0, 0] },
      states: {
        up: state === 'up',
        over: state === 'over',
        down: state === 'down',
        hit: state === 'hit',
      },
    })),
  };
  const sprite: SpriteInfo = {
    id: 95010,
    frameCount: 1,
    placements: [
      {
        frame: 1,
        depth: 1,
        charId: button.id,
        matrix: { ...identity, a: 2, d: 3, tx: 40, ty: 60 },
      },
    ],
  };
  const colors = ['#ff0000', '#0000ff', '#ffff00', '#00ff00'];
  Object.assign(pack, {
    buttons: new Map([[button.id, button]]),
    sprites: new Map([[sprite.id, sprite]]),
    shapes: new Map(
      colors.map((_, i) => [
        95001 + i,
        {
          id: 95001 + i,
          bounds: { xMin: 0, yMin: 0, xMax: i === 3 ? 600 : 200, yMax: i === 3 ? 600 : 200 },
        },
      ]),
    ),
    symbols: {
      svgByCid: new Map(
        colors.map((color, i) => [
          95001 + i,
          `<svg><rect width="${i === 3 ? 30 : 10}" height="${i === 3 ? 30 : 10}" fill="${color}"/></svg>`,
        ]),
      ),
    },
  });
  try {
    const states: Record<string, unknown> = {};
    for (const state of ['up', 'over', 'down', 'hit'] as ButtonState[]) {
      const raster = (await pack.rasterSymbol(button.id, 1, 0, state))!;
      states[state] = { ...proof(raster), pixel: sample(raster, 12, 7) };
    }
    const pose = new SwfClip(sprite.id, pack);
    pose.advance(1);
    const raster = (await pack.rasterClip(pose, 'up'))!;
    return { states, nested: { ...proof(raster), pixel: sample(raster, 24, 20) } };
  } finally {
    pack.dispose();
  }
}

/** Exercise production raster APIs; supplied media stays in memory and outside the repository. */
export async function showCreatorButtons(
  pack: AssetPack,
  host: HTMLElement,
  subset: 'controls' | 'palette' = 'controls',
) {
  const primitive = await synthetic();
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  canvas.setAttribute(
    'aria-label',
    subset === 'palette' ? 'Creator palette raster states' : 'Creator button raster states',
  );
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const frames = [...pack.creatorFrames].filter(([key]) =>
    subset === 'palette' ? key.startsWith('palette:') : !key.startsWith('palette:'),
  );
  const rows = frames.map(([key, raster], index) => {
    const x = (index % 7) * 78,
      y = Math.floor(index / 7) * 62;
    const scale = Math.min(1, 72 / raster.width, 42 / raster.height);
    ctx.drawImage(
      raster.canvas,
      x + (78 - raster.width * scale) / 2,
      y + 4,
      raster.width * scale,
      raster.height * scale,
    );
    ctx.fillStyle = '#fff';
    ctx.font = '7px Arial';
    ctx.fillText(key.replace('_mc', ''), x + 2, y + 57, 75);
    return {
      key,
      ...proof(raster),
      ...(key.startsWith('palette:row:') ? { pixel: sample(raster, 50, 10) } : {}),
    };
  });
  host.append(canvas);
  host.dataset.creatorButtons = JSON.stringify({ primitive, rows });
  return () => {
    canvas.remove();
    delete host.dataset.creatorButtons;
  };
}
