import type { Vec } from './types';
export const DEG = Math.PI / 180;
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const length = (v: Vec) => Math.hypot(v.x, v.y);
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x) / DEG;
export const deltaAngle = (a: number, b: number) => ((((b - a + 540) % 360) + 360) % 360) - 180;
export const toward = (a: number, b: number, step: number) =>
  a + clamp(deltaAngle(a, b), -step, step);
export function rotate(v: Vec, angle: number): Vec {
  const c = Math.cos(angle * DEG),
    s = Math.sin(angle * DEG);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
export function direction(angle: number, speed = 1): Vec {
  return { x: Math.cos(angle * DEG) * speed, y: Math.sin(angle * DEG) * speed };
}
export class Random {
  constructor(public state = (Math.random() * 0xffffffff) >>> 0) {}
  next() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }
  // The original uses this slightly non-uniform inclusive integer roll.
  int(min: number, max: number) {
    return clamp(Math.round(this.next() * (max - min + 0.8) + min - 0.4), min, max);
  }
  pick<T>(items: readonly T[]): T {
    if (!items.length) throw new Error('Cannot choose from an empty pool');
    return items[Math.floor(this.next() * items.length)];
  }
  weighted<T extends { chance: number }>(items: readonly T[]): T {
    let n = this.next() * items.reduce((s, i) => s + i.chance, 0);
    for (const item of items) {
      n -= item.chance;
      if (n < 0) return item;
    }
    return items[items.length - 1];
  }
}
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
