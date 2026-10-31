import { AssetPack, type Raster } from '../../src/game/assets/asset-pack';
import { mockPartLayout } from '../../src/game/assets/mock-part';
import { PARTS, STARTER } from '../../src/game/data/catalog';

/** All catalog silhouettes, at the same scale/registration as supplied-SWF thumbnails. */
export async function showMockPartsProof(source: AssetPack, host: HTMLElement) {
  const mock = await AssetPack.mock();
  const parts = PARTS.filter((p) => p.id >= 2000);
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = Math.ceil(parts.length / 4) * 110;
  canvas.style.height = `${canvas.height / 2}px`;
  host.style.height = `${canvas.height / 2}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const visible = (r: Raster, x: number, y: number) => {
    const px = Math.floor((x - r.x) * r.resolution),
      py = Math.floor((y - r.y) * r.resolution);
    return (
      px >= 0 &&
      py >= 0 &&
      px < r.canvas.width &&
      py < r.canvas.height &&
      r.pixels[(py * r.canvas.width + px) * 4 + 3] > 64
    );
  };
  const samples = await Promise.all(
    parts.map(async (part, index) => {
      const layout = mockPartLayout(part.id)!;
      const original =
          source.mode === 'swf' && layout.frame !== 2
            ? (await source.rasterSymbol(part.symbol, layout.frame))!
            : source.part(part.id),
        procedural = mock.part(part.id);
      const x = (index % 4) * 275,
        y = Math.floor(index / 4) * 110;
      ctx.fillStyle = '#e7f7ff';
      ctx.font = '13px Arial';
      ctx.fillText(`${part.id} ${part.name}`, x + 5, y + 15);
      ctx.font = '10px Arial';
      ctx.fillText(source.mode === 'swf' ? 'SWF' : 'Mock', x + 50, y + 103);
      ctx.fillText('Mock', x + 185, y + 103);
      [original, procedural].forEach((r, side) => {
        ctx.save();
        ctx.translate(x + 68 + side * 137, y + 58);
        ctx.scale(1.45, 1.45);
        ctx.drawImage(r.canvas, r.x, r.y, r.width, r.height);
        ctx.restore();
      });
      const bounds = layout.bounds;
      let union = 0,
        intersection = 0,
        painted = 0,
        contact = 0;
      const placement = {
        ...STARTER.parts[0],
        type: part.id,
        x: 43,
        y: -29,
        scale: 1.3,
        rotation: 37,
      };
      const angle = (placement.rotation * Math.PI) / 180;
      for (let y = bounds.y - 1; y < bounds.y + bounds.height + 1; y += 0.5)
        for (let x = bounds.x - 1; x < bounds.x + bounds.width + 1; x += 0.5) {
          const a = visible(original, x, y),
            b = visible(procedural, x, y);
          if (a || b) union++;
          if (a && b) intersection++;
          if (b) {
            painted++;
            if (
              mock.hitDesignPart(
                placement,
                placement.x + placement.scale * (Math.cos(angle) * x - Math.sin(angle) * y),
                placement.y + placement.scale * (Math.sin(angle) * x + Math.cos(angle) * y),
              )
            )
              contact++;
          }
        }
      let hash = 2166136261;
      for (let i = 3; i < procedural.pixels.length; i += 4)
        hash = Math.imul(hash ^ procedural.pixels[i], 16777619);
      return {
        id: part.id,
        bubbles: layout.bubbles.length,
        iou: intersection / union,
        painted,
        contactRatio: contact / painted,
        hash: hash >>> 0,
        nativeWidth: original.width - (source.mode === 'swf' ? 4 : 6),
        mockWidth: procedural.width - 6,
      };
    }),
  );
  host.replaceChildren(canvas);
  mock.dispose();
  return { mode: source.mode, samples };
}
