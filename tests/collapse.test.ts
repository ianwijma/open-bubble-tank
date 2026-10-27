import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { fieldPoint, fieldTransform } from '../src/game/render/field-transform';
import art from '../src/game/data/screen-effect-art.json';

test('Apocalypse captures radial orientation, screen registration, scale and Main offset once', () => {
  const w = new World([], [], 1);
  w.player.x = 100;
  w.player.y = -50;
  w.viewZoom = 0.75;
  w.mainEffects.position = { x: 1.55, y: -2.25 };
  w.field.scale = 1.4;
  const bullet = createProjectile(w.nextId(), {
    owner: w.player.uid,
    enemy: false,
    kind: 'apocalypse',
    symbol: 2058,
    x: 400,
    y: 200,
    angle: 90,
    speed: 6,
    damage: 0,
  });
  bullet.detonating = 53;
  tickBullet(w, bullet, emptyInput());
  const effect = w.collapse!.effect;
  expect(effect).toMatchObject({
    symbol: 2173,
    duration: 120,
    frame: 1,
    x: -73.45,
    y: 35.25,
    layer: 'screen',
    randomRotation: false,
    blendMode: 'layer',
  });
  expect(effect.scale).toBeCloseTo(1.05);
  expect(effect.rotation).toBeCloseTo((Math.atan2(206, 400) * 180) / Math.PI);
  expect(effect.rotation).not.toBe(bullet.angle);
  w.player.x = 200;
  w.mainEffects.position = { x: 0, y: 0 };
  w.step(emptyInput());
  expect([effect.x, effect.y, effect.scale]).toEqual([-73.45, 35.25, effect.scale]);
});

test('collapse retains frame1 at birth and its first stage, then removes120 before another shrink', () => {
  const w = new World([], [], 5),
    shakes: number[] = [];
  const shake = w.mainEffects.shake.bind(w.mainEffects);
  w.mainEffects.shake = (duration) => {
    shakes.push(duration);
    shake(duration);
  };
  w.beginCollapse(0);
  const effect = w.collapse!.effect;
  expect(w.effects).toContain(effect);
  expect(effect.frame).toBe(1);
  w.step(emptyInput());
  expect([w.collapse!.age, effect.frame]).toEqual([1, 1]);
  w.step(emptyInput());
  expect([w.collapse!.age, effect.frame]).toEqual([2, 2]);
  for (let i = 2; i < 119; i++) w.step(emptyInput());
  expect(effect.frame).toBe(119);
  expect(shakes).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  expect(w.mainEffects.remaining).toBe(0);
  const jump = w.jump.bind(w);
  w.jump = (...args) => {
    expect(w.effects).toContain(effect);
    jump(...args);
  };
  w.step(emptyInput());
  expect(effect.frame).toBe(120);
  expect(w.collapse).toBeNull();
  expect(w.mode).toBe('transit');
  expect(w.mainEffects.remaining).toBe(0);
  expect(shakes).toHaveLength(14);
  expect(w.effects).not.toContain(effect);
  expect(w.effects.some((e) => e.symbol === art.collapseFlash.symbol)).toBe(true);
});

test('collapse birth finishes the live field loop and final avatar/passive phase', () => {
  const w = new World([], [], 1);
  w.hitTest = () => false;
  w.player = createTank(
    w.nextId(),
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5006 }] },
    'player',
  );
  const apocalypse = createProjectile(w.nextId(), {
    owner: w.player.uid,
    enemy: false,
    kind: 'apocalypse',
    symbol: 2058,
    x: 425,
    y: 0,
    angle: 0,
    speed: 6,
    damage: 0,
  });
  apocalypse.detonating = 53;
  const later = createProjectile(w.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'shell',
    symbol: 1717,
    x: 100,
    y: 60,
    angle: 0,
    speed: 2,
    damage: 1,
  });
  w.addBullet(apocalypse);
  w.addBullet(later);
  w.step(emptyInput());
  expect(w.mode).toBe('collapse');
  expect(w.collapse!.age).toBe(0);
  expect(later.age).toBe(1);
  expect(later.x).toBe(102);
  expect(w.player.age).toBe(1);
  expect(w.bullets.some((b) => b.kind === 'orbital' && b.age === 0)).toBe(true);
  expect(w.bullets).not.toContain(apocalypse);
  w.step(emptyInput());
  expect(w.player.age).toBe(1);
  expect(later.age).toBe(1);
});

test('field and avatar shrink toward a fixed field center while a crossing destination stays full size', () => {
  const w = new World([], [], 1);
  w.player.x = 200;
  w.player.y = -100;
  w.jump({ x: 1, y: 0 });
  const next = w.transit!.next,
    offset = w.transit!.offset;
  w.beginCollapse(0);
  for (let i = 0; i < 51; i++) w.step(emptyInput());
  const transform = fieldTransform(w, w.field),
    destination = fieldTransform(w, next, offset);
  expect(transform).toEqual({ x: 0, y: 0, scale: 0.75 });
  expect(fieldPoint({ x: 0, y: 0 }, transform)).toEqual({ x: 0, y: 0 });
  const avatar = fieldPoint(w.player, transform);
  expect({ x: 275 - w.player.x + avatar.x, y: 225 - w.player.y + avatar.y }).toEqual({
    x: 225,
    y: 250,
  });
  expect(destination).toEqual({ ...offset, scale: 1 });
  expect(fieldPoint({ x: -30, y: 20 }, destination)).toEqual({
    x: offset.x - 30,
    y: offset.y + 20,
  });
});
