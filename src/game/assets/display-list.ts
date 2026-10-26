import type { DisplayPlacement, SpriteInfo } from './asset-pack';
const identity = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

/** Retained SWF depths, shared by browser artwork and numeric simulation poses. */
export function buildDisplayList(sprite: SpriteInfo, age: number): DisplayPlacement[] {
  const frame = ((Math.max(1, Math.floor(age)) - 1) % sprite.frameCount) + 1;
  const list = new Map<number, DisplayPlacement>();
  for (const p of sprite.placements) {
    if (p.frame > frame) break;
    if (p.remove) list.delete(p.depth);
    else {
      const old = list.get(p.depth),
        charId = p.charId ?? old?.charId;
      if (charId !== undefined)
        list.set(p.depth, {
          ...old,
          ...p,
          charId,
          matrix: p.matrix ?? old?.matrix ?? identity,
          bornFrame: p.charId !== undefined ? p.frame : (old?.bornFrame ?? p.frame),
        });
    }
  }
  return [...list.values()].sort((a, b) => a.depth - b.depth);
}
