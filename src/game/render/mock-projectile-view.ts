import type { Graphics } from 'pixi.js';
import type { Projectile, Vec } from '../core/types';
import { mockProjectilePolygons } from '../assets/mock-projectile';

/** Numeric authored layout, procedural bubbles: the same polygons supply point contact. */
export function drawMockProjectile(graphics: Graphics, bullet: Projectile, owner?: Vec) {
  const polygons = mockProjectilePolygons(bullet, owner);
  if (polygons === undefined) return false;
  for (const polygon of polygons) {
    graphics
      .poly(polygon.points)
      .fill({ color: polygon.color, alpha: polygon.fillAlpha * (bullet.artAlpha ?? 1) })
      .stroke({
        color: polygon.lineColor,
        alpha: polygon.lineAlpha * (bullet.artAlpha ?? 1),
        width: polygon.lineWidth,
        alignment: 1,
      });
    for (const detail of polygon.details)
      graphics
        .poly(detail.points)
        .fill({ color: detail.color, alpha: detail.alpha * (bullet.artAlpha ?? 1) });
  }
  return true;
}
