import { STAGE } from '../core/constants';
import { rotate } from '../core/math';
import type { Projectile, Vec } from '../core/types';
import type { World } from './world';

/** _-Rx samples only the named primary whip, not the duplicate translucent artwork. */
export function whipSamples(b: Projectile): Vec[] {
  const pose = b.artPose;
  const placement = pose?.placements.find((child) => child.name === 'whip_mc');
  if (!pose || !placement) return [];
  const whip = pose.children.get(placement.depth)?.clip;
  if (!whip) return [];
  const m = placement.matrix,
    scale = b.artScale ?? 1.25;
  return whip.placements.map((child) => {
    const x = child.matrix.tx / 20,
      y = child.matrix.ty / 20;
    const point = rotate(
      {
        x: (m.a * x + m.c * y + m.tx / 20) * scale,
        y: (m.b * x + m.d * y + m.ty / 20) * scale,
      },
      b.angle,
    );
    return { x: b.x + point.x, y: b.y + point.y };
  });
}

/** _-Rx checks its old position before following the emitter, retaining launch rotation. */
export function tickWhip(world: World, b: Projectile) {
  const pose = world.projectileTimelines.initialize(b);
  if (pose) b.artPose = pose;
  if (b.artPose?.frame === world.projectileTimelines.totalFrames(b)) {
    b.dead = true;
    return;
  }
  const points = whipSamples(b);
  for (const enemy of [...world.field.enemies]) {
    if (enemy.dead || b.hit.has(enemy.uid)) continue;
    const point = points.find((point) => world.hitTest(enemy, point.x, point.y));
    if (!point) continue;
    // BulletCallCollisionDetected is empty. Damage precedes remembering the hit/effect.
    world.damageDoneIncr(b.damage);
    world.damage(enemy, b.damage, b);
    b.hit.add(enemy.uid);
    b.missExempt = true;
    // The original passes a global point directly into its field-local effect queue.
    world.addCombatEffect(
      {
        x: STAGE.cx + (point.x - world.player.x) * world.viewZoom,
        y: STAGE.cy + (point.y - world.player.y) * world.viewZoom,
      },
      'impact',
    );
    break;
  }
  const owner = world.allTanks().find((tank) => tank.uid === b.owner);
  // Detached emitter references can outlive the owner; retain the last safe position.
  if (owner && b.anchor) {
    const emitter = world.muzzle(owner, b.anchor);
    b.x = emitter.x;
    b.y = emitter.y;
  }
}
