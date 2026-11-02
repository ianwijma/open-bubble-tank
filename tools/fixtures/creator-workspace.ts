import type { AssetPack, Raster } from '../../src/game/assets/asset-pack';
import { CREATOR_CONTROLS } from '../../src/game/core/creator-controls';

/** Paint the actual prepared cache at the original550×450 scale, independently of editor input. */
export async function showCreatorWorkspace(pack: AssetPack, host: HTMLElement) {
  if (pack.mode !== 'swf') throw new Error('Workspace comparison requires the original artwork.');
  const frames = [];
  host.style.height = `${6 * 450}px`;
  for (let frame = 1; frame <= 6; frame++) {
    const prepared = pack.creatorFrames.get(`rings:${frame}`)!;
    const raw = (await pack.rasterSymbol(819, frame))!;
    const canvas = document.createElement('canvas');
    canvas.width = 550;
    canvas.height = 450;
    canvas.dataset.workspaceFrame = String(frame);
    canvas.style.display = 'block';
    host.append(canvas);
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const x = CREATOR_CONTROLS.workspace.tx / 20;
    const y = CREATOR_CONTROLS.workspace.ty / 20;
    context.drawImage(
      prepared.canvas,
      x + prepared.x,
      y + prepared.y,
      prepared.width,
      prepared.height,
    );
    const alphaSum = (x: number, y: number, width: number, height: number) => {
      const pixels = context.getImageData(x, y, width, height).data;
      let total = 0;
      for (let i = 3; i < pixels.length; i += 4) total += pixels[i] / 255;
      return total;
    };
    const bounds = (raster: Raster) => ({
      x: raster.x,
      y: raster.y,
      width: raster.width,
      height: raster.height,
    });
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 550;
    rawCanvas.height = 450;
    const rawContext = rawCanvas.getContext('2d')!;
    rawContext.drawImage(raw.canvas, x + raw.x, y + raw.y, raw.width, raw.height);
    const rawAxisPixels = rawContext.getImageData(100, 228, 1, 8).data;
    let rawAxis = 0;
    for (let i = 3; i < rawAxisPixels.length; i += 4) rawAxis += rawAxisPixels[i] / 255;
    frames.push({
      frame,
      prepared: bounds(prepared),
      raw: bounds(raw),
      script: pack.symbolScriptBounds(819, frame),
      placements: [...pack.displayList(819, frame), ...pack.displayList(812, 1)].map(
        (placement) => placement.matrix,
      ),
      axis: alphaSum(100, 228, 1, 8),
      rawAxis,
      border: alphaSum(8, 300, 7, 1),
      // Source811 is radius33; these are the authored positive uniform placements.
      rings: [
        1.06060791015625, 1.6666717529296875, 2.272705078125, 3.0302581787109375,
        4.1666412353515625,
      ].map((scale) => alphaSum(Math.floor(x), Math.floor(y - 33 * scale) - 3, 1, 8)),
    });
  }
  return frames;
}
