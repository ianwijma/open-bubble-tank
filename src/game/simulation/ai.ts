import type { Tank } from '../core/types';
import { angleTo, deltaAngle, direction, distance, length, Random, toward } from '../core/math';
import { FIELD_RADIUS } from '../core/constants';

export function moveEnemy(t: Tank, target: Tank, fieldScale: number, rng: Random, patient?: Tank) {
  const parts = t.design.parts;
  const has = (id: number) => parts.some((p) => p.type === id);
  if (t.design.id.startsWith('B')) {
    t.x = 0;
    t.y = 0;
    t.rotation = toward(t.rotation, angleTo(t, target), t.design.speed * 1.5);
    return;
  }
  const speed = t.design.speed * (t.status.sticky > 0 ? 0.3 : 1),
    radius = FIELD_RADIUS * fieldScale;
  const wall = has(6005),
    skittish = has(6003);
  let seek: number | null = null;
  if (wall) {
    const ang = angleTo({ x: 0, y: 0 }, t) + (t.uid % 2 ? 1 : -1);
    const point = direction(ang, radius - t.radius - Math.sin(t.age * 0.04) * 15);
    seek = angleTo(t, point);
  } else if (has(6002)) {
    if (patient && distance(t, patient) > 200) seek = angleTo(t, patient);
  } else if (has(6001) || t.side === 'ally') {
    if (distance(t, target) > 200) seek = angleTo(t, target);
  } else if (
    skittish &&
    distance(t, target) < 600 &&
    Math.abs(deltaAngle(t.rotation, angleTo(t, target))) <= 90
  ) {
    seek = angleTo(t, target) + (t.uid % 2 ? 100 : -100);
  }
  if (t.holdTurn > 0) t.holdTurn--;
  if (seek !== null) t.rotation = toward(t.rotation, seek, speed * 1.5);
  else if (t.turnFrames > 0) {
    t.rotation += t.turnRate;
    t.turnFrames--;
  } else if (t.holdTurn === 0 && rng.int(0, 1000) < 20) {
    const angle =
      length(t) + t.radius > radius * 0.75
        ? deltaAngle(t.rotation, angleTo(t, { x: 0, y: 0 })) + rng.int(-30, 30)
        : rng.int(-100, 100);
    t.turnFrames = Math.round(Math.abs(angle) / (speed * 1.5 || 1));
    t.turnRate = speed * 1.5 * Math.sign(angle);
  }
  const d = direction(t.rotation, speed);
  t.x += d.x + t.velocity.x;
  t.y += d.y + t.velocity.y;
  t.velocity.x *= 0.9;
  t.velocity.y *= 0.9;
  if (Math.abs(t.velocity.x) < 0.1) t.velocity.x = 0;
  if (Math.abs(t.velocity.y) < 0.1) t.velocity.y = 0;
  const look = direction(t.rotation, 30 * speed + t.radius);
  if (!wall && t.turnFrames === 0 && Math.hypot(t.x + look.x, t.y + look.y) > radius) {
    const turn = rng.int(120, 180) * (t.uid % 2 ? 1 : -1);
    t.turnFrames = Math.round(Math.abs(turn) / (speed * 1.5 || 1)) * (skittish ? 0.5 : 1);
    t.turnRate = speed * 1.5 * Math.sign(turn);
    t.holdTurn = skittish ? 10 : 30;
  }
  if (has(6004)) {
    const frame = (t.age + t.phase) % 300;
    t.alpha =
      frame < 50 ? 1 - frame * 0.02 : frame < 150 ? 0 : frame < 200 ? (frame - 150) * 0.02 : 1;
  }
}
