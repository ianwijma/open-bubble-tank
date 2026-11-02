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
      const x = Math.floor(i / 4) % canvas.width,
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
    left,
    top,
    width: Math.max(0, right - left + 1),
    height: Math.max(0, bottom - top + 1),
  };
}

/** Same mounted IDs in separate viewer instances must retain their own clip clocks. */
export async function showViewerTankArtwork(pack: AssetPack, host: HTMLElement) {
  const canvas = document.createElement('canvas'),
    sample = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  sample.width = sample.height = 600;
  const context = canvas.getContext('2d')!,
    target = sample.getContext('2d')!;
  context.fillStyle = '#0b3c5a';
  context.fillRect(0, 0, 550, 450);
  const renderer = new CreatorArtwork(pack, 600);
  const part = { ...STARTER.parts[0], key: 'same', type: 1504, x: 0, y: 0, scale: 1, rotation: 0 };
  type Layer = Parameters<CreatorArtwork['draw']>[1];
  const capture = (layer: Layer, frame: number, parts = [part], scale = 1) => {
    target.clearRect(0, 0, 600, 600);
    target.save();
    target.translate(300, 300);
    const random = Math.random;
    Math.random = () => 0.25;
    try {
      renderer.draw(
        target,
        layer,
        parts.map((part) => ({ part })),
        frame,
        scale,
      );
    } finally {
      Math.random = random;
      target.restore();
    }
    return pixels(sample);
  };
  const present = (label: string, index: number, proof: ReturnType<typeof pixels>) => {
    const x = (index % 3) * 180,
      y = Math.floor(index / 3) * 210;
    const scale = Math.min(1, 160 / proof.width, 160 / proof.height);
    context.drawImage(
      sample,
      proof.left,
      proof.top,
      proof.width,
      proof.height,
      x + 10,
      y + 20,
      proof.width * scale,
      proof.height * scale,
    );
    context.fillStyle = '#fff';
    context.font = '11px Arial';
    context.fillText(label, x + 10, y + 190);
  };
  try {
    await renderer.init();
    capture('design', 1, [{ ...part, type: 1001 }]);
    const designBounds = renderer.localBounds(part);
    const first = capture('viewer:a', 1);
    present('Row A: initial', 0, first);
    const firstBounds = renderer.localBounds(part, 'viewer:a');
    const animated = capture('viewer:a', 21);
    present('Row A: animated', 1, animated);
    const second = capture('viewer:b', 21);
    present('Row B: fresh', 2, second);
    const held = capture('viewer:a', 21);
    renderer.removeLayer('viewer:a');
    const removed = renderer.localBounds(part, 'viewer:a') === undefined;
    renderer.removeLayer('viewer:a');
    const otherHeld = capture('viewer:b', 21);
    const reset = capture('viewer:a', 100);
    present('Row A: replaced', 3, reset);
    const full = capture('viewer:a', 100);
    const half = capture('viewer:a', 100, [part], 0.5);
    present('Row A: half scale', 4, half);
    const halfBounds = renderer.localBounds(part, 'viewer:a');
    const fullAgain = capture('viewer:a', 100);
    const edge = capture('viewer:edge', 1, [{ ...part, type: 1001, x: 230 }]);
    present('Beyond old 350px surface', 5, edge);
    const empty = capture('viewer:a', 101, []);
    const cleared = renderer.localBounds(part, 'viewer:a') === undefined;
    host.dataset.viewerTankArtwork = JSON.stringify({
      first,
      animated,
      second,
      held,
      removed,
      otherHeld,
      reset,
      full,
      half,
      fullAgain,
      edge,
      empty,
      cleared,
      designBounds,
      firstBounds,
      halfBounds,
    });
  } finally {
    renderer.destroy();
    renderer.destroy();
  }
  host.append(canvas);
  return () => {
    canvas.remove();
    delete host.dataset.viewerTankArtwork;
  };
}
