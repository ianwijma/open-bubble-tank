import type { ActorMovementState, Tank, Vec } from '../core/types';
import type { Random } from '../core/math';
import { displayPixel } from '../core/display-values';
import { FIELD_RADIUS } from '../core/constants';

/** Source _-KM vector arithmetic order, before DisplayObject coordinate assignment. */
export function actorHeading(from: Vec, to: Vec) {
  return (360 * Math.atan2(to.y - from.y, to.x - from.x)) / (2 * Math.PI);
}
export function actorDirection(angle: number, speed: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: Math.cos(radians) * speed, y: Math.sin(radians) * speed };
}
const vectorLength = (v: Vec) => Math.sqrt(v.x * v.x + v.y * v.y);

export type MovingActor = Pick<
  Tank,
  'x' | 'y' | 'side' | 'design' | 'rotation' | 'radius' | 'velocity' | 'status'
> & { movement: ActorMovementState };
export const createActorMovement = (point: Vec = { x: 0, y: 0 }): ActorMovementState => ({
  frames: 0,
  rate: 0,
  hold: 0,
  safety: false,
  lastAngle: actorHeading({ x: 0, y: 0 }, point),
  swarmPoint: null,
  wallFlower: false,
  skittish: false,
  stationary: false,
});

/** MovieClip.rotation and _-EP's single-wrap, signed opposite-direction ties. */
export function actorAngle(value: number) {
  value %= 360;
  if (value > 180) value -= 360;
  else if (value < -180) value += 360;
  return value;
}
function planTurn(t: MovingActor, point: Vec, speed: number) {
  const delta = actorAngle(actorHeading(t, point) - t.rotation);
  t.movement.frames = Math.round(Math.abs(delta) / (speed * 1.5));
  t.movement.rate = t.movement.frames > 0 ? delta / t.movement.frames : 0;
  t.movement.safety = false;
}
function dampForce(t: MovingActor) {
  if (t.velocity.x === 0 && t.velocity.y === 0) return;
  t.velocity.x *= 0.9;
  t.velocity.y *= 0.9;
  if (vectorLength(t.velocity) < 0.1) t.velocity.x = t.velocity.y = 0;
}
/** _-dL plans a wall turn without applying it until a later Move. */
function advanceTurn(t: MovingActor, scale: number, speed: number, rng: Random) {
  const m = t.movement,
    look = actorDirection(t.rotation, 30 * speed + t.radius),
    outside =
      !m.wallFlower && vectorLength({ x: t.x + look.x, y: t.y + look.y }) > FIELD_RADIUS * scale;
  if (m.frames === 0 || (outside && !m.safety)) {
    if (outside) {
      const radial = actorHeading({ x: 0, y: 0 }, t);
      if (Math.abs(radial) > 90) {
        if (radial > 0 && m.lastAngle < 0) m.lastAngle = 360;
        else if (radial < 0 && m.lastAngle > 0) m.lastAngle = -360;
      }
      const positive = radial < 0 ? radial >= m.lastAngle : radial > m.lastAngle,
        turn = positive ? rng.int(120, 180) : rng.int(-120, -180);
      m.frames = Math.round(Math.abs(turn) / (speed * 1.5));
      if (m.skittish) m.frames /= 2;
      m.rate = speed * 1.5 * (turn / Math.abs(turn));
      m.hold = m.skittish ? 10 : 30;
      m.safety = true;
      m.lastAngle = radial;
    }
  } else {
    m.frames--;
    t.rotation = actorAngle(t.rotation + m.rate);
    m.lastAngle = actorHeading({ x: 0, y: 0 }, t);
  }
}
/** EnemyAI.Move / _-Px.Move and _-2T/_-Ab/_-QH. BehaviorRun sets next-frame swarmPoint. */
export function moveActor(t: MovingActor, fieldScale: number, rng: Random, avatar?: Vec) {
  const m = t.movement,
    speed = t.design.speed * (t.status.sticky > 0 ? 0.3 : 1);
  if (t.side === 'enemy' && t.design.id.startsWith('B')) {
    if (t.design.id.charAt(1) !== '1') return;
    t.x = t.y = 0;
    m.frames--;
    t.rotation = actorAngle(t.rotation + m.rate);
    m.lastAngle = 0;
    if (avatar) planTurn(t, avatar, t.design.speed);
    dampForce(t);
    return;
  }
  if (t.side === 'enemy' && m.stationary) {
    t.x = displayPixel(t.x + t.velocity.x);
    t.y = displayPixel(t.y + t.velocity.y);
    dampForce(t);
    return;
  }
  const forward = actorDirection(t.rotation, speed);
  t.x = displayPixel(t.x + (forward.x + t.velocity.x));
  t.y = displayPixel(t.y + (forward.y + t.velocity.y));
  advanceTurn(t, fieldScale, speed, rng);
  if (m.hold > 0) m.hold--;
  else if (m.swarmPoint) {
    const dx = t.x - m.swarmPoint.x,
      dy = t.y - m.swarmPoint.y;
    if (m.wallFlower || dx * dx + dy * dy > 40000) planTurn(t, m.swarmPoint, speed);
  } else if (m.frames === 0 && rng.int(0, 1000) < 20) {
    // _-OJ reads the GetLength function rather than calling it; its NaN test is always false.
    const turn = rng.int(-100, 100);
    m.frames = Math.round(Math.abs(turn) / (speed * 1.5));
    m.rate = speed * 1.5 * (turn / Math.abs(turn));
    m.safety = false;
  }
  dampForce(t);
}
