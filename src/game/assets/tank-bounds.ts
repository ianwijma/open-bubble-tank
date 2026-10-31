import { rotate } from '../core/math';
import { protectionScale } from '../core/protection-size';
import { legacyShieldFilm, shieldClipFrame } from '../core/shield-art';
import type { Tank, TankPart } from '../core/types';
import { partById } from '../data/catalog';
import { INFECTED_ART, PROTECTION_ART, shieldClipSymbol } from '../data/status-art';
import type { Bounds, SwfMatrix } from './asset-pack';
import { scriptBounds, type ScriptBoundsSource } from './projectile-bounds';
import type { SwfClip } from './swf-clip';

export interface TankBoundsClips {
  part(tank: Tank, part: TankPart): SwfClip | undefined;
  status(tank: Tank, index: number): SwfClip;
  infection(tank: Tank): SwfClip;
  forcefieldPart(tank: Tank, part: TankPart): SwfClip | undefined;
  forcefieldRadius(tank: Tank): number;
  protectionRadius(tank: Tank): number;
}

/** Script width includes invisible children and masks, without filter growth or raster padding. */
export function tankScriptBounds(tank: Tank, source: ScriptBoundsSource, clips: TankBoundsClips) {
  const boxes: Bounds[] = [];
  const add = (
    id: number,
    age: number,
    x = 0,
    y = 0,
    angle = 0,
    sx = 1,
    sy = sx,
    pose?: SwfClip,
  ) => {
    const position = rotate({ x, y }, tank.rotation),
      radians = ((tank.rotation + angle) * Math.PI) / 180,
      matrix: SwfMatrix = {
        a: Math.cos(radians) * sx,
        b: Math.sin(radians) * sx,
        c: -Math.sin(radians) * sy,
        d: Math.cos(radians) * sy,
        tx: position.x * 20,
        ty: position.y * 20,
      };
    const bounds = scriptBounds(source, id, age, matrix, undefined, [], 0, pose);
    if (bounds) boxes.push(bounds);
  };
  const addPart = (part: TankPart, pose: SwfClip | undefined, aimed: boolean) => {
    const id = partById(part.type)?.symbol;
    if (!id) return;
    add(
      id,
      pose?.age ?? 1,
      part.x,
      part.y,
      aimed
        ? (tank.guns.find((gun) => gun.part.key === part.key)?.angle ?? part.rotation)
        : part.rotation,
      part.scale,
      part.scale,
      pose,
    );
  };
  for (const part of tank.design.parts)
    if (!tank.removedParts.has(part.key) && tank.displayChildren.includes(`part:${part.key}`))
      addPart(part, clips.part(tank, part), true);
  if (tank.statusDecoration && tank.displayChildren.includes('status'))
    for (const [i, mark] of tank.statusDecoration.marks.entries()) {
      const pose = clips.status(tank, i);
      add(pose.id, pose.age, mark.x, mark.y, mark.angle, 1, 1, pose);
    }
  if (tank.status.infect > 0 && tank.displayChildren.includes('infection')) {
    const pose = clips.infection(tank);
    add(
      INFECTED_ART,
      pose.age,
      0,
      0,
      tank.infectionAngle,
      (tank.radius * 1.5) / 36,
      undefined,
      pose,
    );
  }
  const scaled = (id: number, frame: number, angle: number, diameter: number, uniform = false) => {
    const scale = protectionScale(scriptBounds(source, id, 1), diameter, uniform);
    add(id, frame, 0, 0, angle, scale.x, scale.y);
  };
  for (const clip of tank.shieldClips)
    if (tank.displayChildren.includes(clip.key))
      scaled(shieldClipSymbol(clip), shieldClipFrame(clip), clip.angle, clip.diameter);
  const film = legacyShieldFilm(tank),
    turret = tank.side !== 'player',
    diameter = turret ? tank.radius * 2 : (tank.shieldDiameter ?? clips.protectionRadius(tank) * 2);
  if (film)
    scaled(
      turret ? PROTECTION_ART.turretShield : PROTECTION_ART.shield,
      turret ? Math.min(25, tank.shieldAge + 1) : tank.shieldAge + 1,
      0,
      diameter,
    );
  if (film || tank.displayChildren.includes('shield-hit'))
    scaled(
      turret ? PROTECTION_ART.turretShieldHit : PROTECTION_ART.shieldHit,
      Math.min(16, tank.shieldHitAge + 1),
      tank.shieldHitAngle,
      tank.shieldHitDiameter ?? diameter,
    );
  if (tank.forcefieldAttached && tank.displayChildren.includes('forcefield')) {
    scaled(
      PROTECTION_ART.forcefield,
      tank.forcefieldFrame,
      tank.forcefieldAngle,
      clips.forcefieldRadius(tank) * 2.1,
      true,
    );
    // Flash includes the retained silhouette mask as well as the uncut field clip.
    for (const part of tank.design.parts) addPart(part, clips.forcefieldPart(tank, part), false);
  }
  if (!boxes.length) return undefined;
  const x = Math.min(...boxes.map((box) => box.x)),
    y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
}
