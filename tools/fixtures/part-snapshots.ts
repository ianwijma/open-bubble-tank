import { alphaHit, type AssetPack, type Raster } from '../../src/game/assets/asset-pack';
import { captureClass } from '../../src/game/assets/class-measurement';
import { partSnapshot } from '../../src/game/assets/part-snapshot';
import { STARTER, partById } from '../../src/game/data/catalog';
import type { TankPart } from '../../src/game/core/types';

/** Frozen production caches and body-class counting, separate from live artwork playback. */
export async function showPartSnapshots(pack: AssetPack, host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, 550, 450);
  const paint = (r: Raster, x: number, y: number, label: string) => {
    ctx.drawImage(r.canvas, x + r.x, y + r.y, r.width, r.height);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '12px Arial';
    ctx.fillText(label, x - 95, y + 63);
  };
  let posters: {
    emptyIdleCharge: boolean;
    rawChargeVisible: boolean;
    stoppedRotor: boolean;
    rawRotorShifted: boolean;
    positiveClusterMatchesPose: boolean;
    rawUnchanged: boolean;
  } | null = null;
  if (pack.mode === 'swf') {
    const massive = pack.part(3008),
      rawMassive = (await pack.rasterSymbol(721, 2))!;
    const rotor = pack.part(4015),
      rawRotor = (await pack.rasterSymbol(701, 2))!;
    paint(massive, 140, 65, 'Massive Cannon · idle poster');
    paint(rawMassive, 415, 65, 'Explicit authored frame2');
    paint(rotor, 140, 205, 'Rotating Machine Gun · stopped');
    paint(rawRotor, 415, 205, 'Explicit authored frame2');
    const again = (await pack.rasterSymbol(721, 2))!;
    const positive = (await pack.rasterClip(partSnapshot(partById(1501)!, pack, 'poster', 1)))!;
    posters = {
      emptyIdleCharge: !alphaHit(massive, 34, -34),
      rawChargeVisible: alphaHit(rawMassive, 34, -34),
      stoppedRotor: alphaHit(rotor, -15, 0),
      rawRotorShifted: !alphaHit(rawRotor, -15, 0),
      positiveClusterMatchesPose: pack.part(1501, 0, 1).url === positive.url,
      rawUnchanged: again.url === rawMassive.url,
    };
  } else {
    paint(pack.part(3008), 140, 65, 'Mock Massive Cannon · idle');
    paint(pack.part(4015), 415, 65, 'Mock Rotating Machine Gun');
  }
  const body = (index: number, x: number, y: number): TankPart => ({
    ...STARTER.parts[0],
    key: `body-${index}`,
    type: 1004,
    x,
    y,
    scale: 1,
    radius: 28.75,
  });
  const bodies = Array.from({ length: 12 }, (_, i) =>
    body(i, (i % 4) * 70 - 105, Math.floor(i / 4) * 70 - 70),
  );
  const weapons: TankPart[] = [3008, 3017, 4013, 6002].map((type, i) => ({
    ...body(i, i * 500 - 750, 1500),
    key: `weapon-${i}`,
    type,
    scale: 3,
  }));
  const make = (parts: TankPart[]) => ({ ...STARTER, parts });
  const sample = (label: string, parts: TankPart[], display = false) => {
    const capture = captureClass(make(parts), pack);
    if (display) {
      const scale = Math.min(1, 490 / capture.canvas.width, 120 / capture.canvas.height);
      ctx.drawImage(
        capture.canvas,
        30,
        300,
        capture.canvas.width * scale,
        capture.canvas.height * scale,
      );
      ctx.fillStyle = '#e7f7ff';
      ctx.font = '12px Arial';
      ctx.fillText(
        `Body-only sample · ${capture.pixels} pixels · class ${capture.classId}`,
        30,
        440,
      );
    }
    return {
      label,
      pixels: capture.pixels,
      classId: capture.classId,
      width: capture.canvas.width,
      height: capture.canvas.height,
      bounds: capture.bounds,
    };
  };
  const classes = [
    sample('empty', []),
    sample('weapons-only', weapons),
    ...[1, 2, 4, 8, 12].flatMap((count) => [
      sample(`bodies-${count}`, bodies.slice(0, count)),
      sample(`armed-${count}`, [...bodies.slice(0, count), ...weapons], count === 4),
    ]),
    sample(
      'overlap',
      bodies.map((p) => ({ ...p, x: 0, y: 0 })),
    ),
    sample(
      'translated',
      bodies.slice(0, 4).map((p) => ({ ...p, x: p.x + 1700, y: p.y - 1700 })),
    ),
    sample(
      'wrong-stored-radius',
      bodies.slice(0, 4).map((p) => ({ ...p, radius: 1 })),
    ),
  ];
  host.replaceChildren(canvas);
  return { mode: pack.mode, posters, classes };
}
