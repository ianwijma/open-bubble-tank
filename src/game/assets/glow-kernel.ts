import type { SwfGlowFilter } from './asset-pack';

export interface BoxKernel {
  size: number;
  extent: number;
  edge: number;
}

/** Pinned Ruffle's fractional box kernel, including Flash-style fixed-point edge weights. */
export function glowKernel(width: number): BoxKernel | undefined {
  const size = Math.min(255, width);
  if (size <= 1) return;
  const radius = (size - 1) / 2,
    extent = Math.ceil(radius);
  return { size, extent, edge: Math.floor((radius - extent + 1) * 255) / 255 };
}

// Ruffle's conservative, explicitly approximate Flash destination-rectangle factors.
const passScales = [1, 2.1, 2.7, 3.1, 3.5, 3.8, 4, 4.2, 4.4, 4.6, 5, 6, 6, 7, 7];
export function glowPadding(filter: SwfGlowFilter): number {
  const scale = passScales[Math.max(1, Math.min(15, filter.passes)) - 1];
  return Math.ceil(Math.trunc(Math.max(0, filter.blurX, filter.blurY) * scale * 20) / 20);
}
