import type { AssetPack } from '../../src/game/assets/asset-pack';
import { STARTER } from '../../src/game/data/catalog';
import { CreatorArtwork } from '../../src/game/render/creator-artwork';

function pixels(canvas: HTMLCanvasElement) {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 2166136261,
    ink = 0,
    left = canvas.width,
    top = canvas.height,
    right = -1,
    bottom = -1;
  for (let i = 0; i < data.length; i++) {
    hash = Math.imul(hash ^ data[i], 16777619);
    if (i % 4 === 3 && data[i] > 8) {
      const x = (i / 4) % canvas.width,
        y = Math.floor(i / 4 / canvas.width);
      ink++;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return {
    hash: hash >>> 0,
    ink,
    width: Math.max(0, right - left + 1),
    height: Math.max(0, bottom - top + 1),
  };
}

/** Exercise production caches and the retained offscreen artwork owner without editor UI. */
export async function showCreatorDetailsArt(pack: AssetPack, host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const rows = [...pack.creatorFrames]
    .filter(([key]) => key.startsWith('details:') || key.startsWith('selection-info:'))
    .map(([key, raster], i) => {
      const x = i === 0 ? 15 : i === 4 ? 320 : 270 + (i - 1) * 65,
        y = i === 4 ? 100 : 15;
      ctx.drawImage(raster.canvas, x + raster.x, y + raster.y, raster.width, raster.height);
      const sample = (x: number, y: number) => [
        ...raster.canvas
          .getContext('2d')!
          .getImageData(
            Math.floor((x - raster.x) * raster.resolution),
            Math.floor((y - raster.y) * raster.resolution),
            1,
            1,
          ).data,
      ];
      return {
        key,
        x: raster.x,
        y: raster.y,
        ...pixels(raster.canvas),
        logicalWidth: raster.width,
        logicalHeight: raster.height,
        panel: sample(100, 100),
        center: sample(10, 10),
        thumbnail: sample(25, 30),
      };
    });
  const renderer = new CreatorArtwork(pack);
  const sample = document.createElement('canvas');
  sample.width = sample.height = 350;
  const target = sample.getContext('2d')!;
  const thumbnails = [];
  try {
    await renderer.init();
    for (const [i, type] of [1001, 1005, 1504].entries()) {
      const part = { ...STARTER.parts[0], key: 'detail', type, x: 0, y: 0, scale: 1, rotation: 0 };
      renderer.clearLayer('details');
      renderer.clearLayer('preview');
      const capture = (layer: 'details' | 'preview', frame: number) => {
        target.clearRect(0, 0, 350, 350);
        target.save();
        target.translate(175, 175);
        // Fix constructor phase only in this synchronous fixture call. Production
        // retains its ordinary independent random clips; no renderer hook is added.
        const random = Math.random;
        Math.random = () => 0.25;
        try {
          renderer.draw(target, layer, [{ part }], frame);
        } finally {
          Math.random = random;
          target.restore();
        }
        return pixels(sample);
      };
      const preview = capture('preview', 1),
        first = capture('details', 1);
      ctx.drawImage(sample, i * 175, 220);
      const held = capture('details', 1),
        animated = capture('details', 21);
      const previewAnimated = capture('preview', 21);
      renderer.clearLayer('details');
      const reset = capture('details', 100);
      target.clearRect(0, 0, 350, 350);
      target.save();
      target.translate(175, 175);
      renderer.draw(target, 'details', [], 101);
      target.restore();
      thumbnails.push({
        type,
        preview,
        first,
        held,
        animated,
        previewAnimated,
        reset,
        removed: pixels(sample),
      });
    }
  } finally {
    renderer.destroy();
  }
  host.append(canvas);
  host.dataset.creatorDetailsArt = JSON.stringify({ rows, thumbnails });
  return () => {
    canvas.remove();
    delete host.dataset.creatorDetailsArt;
  };
}
