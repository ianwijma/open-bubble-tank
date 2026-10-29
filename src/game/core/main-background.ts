import type { Vec } from './types';

export interface BackgroundParticle extends Vec {
  z: number;
  vx: number;
  vy: number;
  alpha: number;
  dead: boolean;
}

/** _-Rm / _-2t / _-Me: retained linked particles, not wrapping tiled stars. */
export class BackgroundParticles {
  readonly particles: BackgroundParticle[] = [];
  age = 0;
  private counter = 0;
  private length = 0;
  private shift = { x: 0, y: 0 };
  constructor(private random: () => number) {
    for (let i = 0; i < 5; i++) this.spawn();
  }
  private integer(min: number, max: number) {
    return Math.round(this.random() * (max - min + 0.8) + min - 0.4);
  }
  private spawn() {
    const vx = this.random() * 0.5 - 0.25,
      vy = this.random() * 0.5 - 0.25,
      color = this.integer(1, 17),
      x = this.random() * 550,
      y = this.random() * 450;
    const particle = {
      x,
      y,
      vx,
      vy,
      z: -(this.random() + 0.2),
      // Source arms5/6 deliberately repeat BB; the final arm is transparent.
      alpha: [255, 238, 221, 204, 187, 187, 170, 153, 136, 119, 102, 85, 68, 51, 34, 17, 0][
        color - 1
      ],
      dead: false,
    };
    // _-8z inserts after the retained cursor (the head after each Update), not at the tail.
    this.particles.splice(this.particles.length ? 1 : 0, 0, particle);
  }
  move(x: number, y: number) {
    this.shift.x -= x * 0.4;
    this.shift.y -= y * 0.4;
  }
  advance() {
    this.age++;
    const prune = [2, 3, 4, 5, 10].includes(this.counter);
    if (this.counter === 5 || this.counter === 10) this.spawn();
    if (this.counter === 10) this.counter = 0;
    // intLength is the preceding Update's visited count, including its removed head.
    if (this.length < 15) {
      const missing = 15 - this.length;
      for (let i = 0; i < missing; i++) this.spawn();
    }
    this.counter++;
    this.length = 0;
    for (let i = 0; i < this.particles.length; i++) {
      this.length++;
      const next = this.particles[i + 1];
      if (next && (next.dead || (prune && Math.ceil(this.random() * 50) === 5)))
        this.particles.splice(i + 1, 1);
      const p = this.particles[i];
      p.x += this.shift.x / (1 + p.z / 2);
      p.y += this.shift.y / (1 + p.z / 2);
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > 550 || p.y < 0 || p.y > 450) p.dead = true;
      if (p.alpha < 136) p.dead = true;
    }
    // Keep this frame's painted pixels even when the first particle is unlinked below.
    this.painted = this.particles.map((p) => ({ ...p }));
    if (this.particles[0]?.dead) this.particles.shift();
    this.shift.x = this.shift.y = 0;
  }
  painted: readonly BackgroundParticle[] = [];
}

/** Main._-N1 creates two identical layers: _-Rm overwrites its third argument to false. */
export class MainBackground {
  readonly layers: BackgroundParticles[];
  running = true;
  private blocked = false;
  get efficient() {
    return this.blocked;
  }
  set efficient(value: boolean) {
    // _-7X(true)/_-KD(true): forced enable restarts even a pause-stopped layer.
    this.blocked = value;
    this.running = !value;
  }
  stop() {
    this.running = false;
  }
  resume() {
    if (!this.blocked) this.running = true;
  }
  revision = 0;
  constructor(random: () => number = Math.random) {
    this.layers = [new BackgroundParticles(random), new BackgroundParticles(random)];
  }
  move(x: number, y: number) {
    for (const layer of this.layers) layer.move(x, y);
  }
  advance() {
    if (!this.running || this.efficient) return;
    for (const layer of this.layers) layer.advance();
    this.revision++;
  }
}
