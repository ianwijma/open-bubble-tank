import { CREDITS } from '../core/credits-screen';
import type { Bounds, Raster } from './asset-pack';

/** Numerical text positions with system glyphs and procedural shapes; no supplied artwork. */
export function mockCreditsLeaf(id: number, bounds: Bounds): Raster {
  const canvas = document.createElement('canvas');
  const b = {
    x: bounds.x - 2,
    y: bounds.y - 2,
    width: bounds.width + 4,
    height: bounds.height + 4,
  };
  canvas.width = Math.ceil(b.width * 2);
  canvas.height = Math.ceil(b.height * 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(2, 2);
  ctx.translate(-b.x, -b.y);
  const text = CREDITS.texts.find((t) => t.id === id);
  if (text) {
    const m = text.matrix;
    ctx.transform(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20);
    for (const glyph of text.glyphs) {
      ctx.font = `${glyph.italic ? 'italic' : 'normal'} ${glyph.font === 'Billo' ? '900' : glyph.bold ? 'bold' : 'normal'} ${glyph.size}px Arial, sans-serif`;
      ctx.fillStyle = `rgba(${glyph.color.slice(0, 3).join(',')},${(glyph.color[3] ?? 255) / 255})`;
      ctx.fillText(glyph.text, glyph.x, glyph.y);
    }
  } else if (id === 572 || id === 574) {
    // Source572/574 are white ellipse fills at38/255 and56/255 opacity.
    ctx.fillStyle = `rgba(255,255,255,${(id === 572 ? 38 : 56) / 255})`;
    ctx.beginPath();
    ctx.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else if (id === 587) {
    // The source embeds a bitmap logo; the fallback supplies a simple letter badge.
    ctx.fillStyle = '#3b5998';
    ctx.fillRect(0, -15, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText('f', 11, 14);
  }
  //434 is a transparent link target;589 is part of the native logo's erase treatment.
  return {
    ...b,
    canvas,
    resolution: 2,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    url: canvas.toDataURL('image/png'),
  };
}
