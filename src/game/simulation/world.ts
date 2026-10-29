import { CLASS_SPEED, FIELD_RADIUS, MAX_LIFE, STAGE } from '../core/constants';
import { clamp, direction, distance, length, Random, rotate } from '../core/math';
import { protectionRadius } from '../core/protection-size';
import { advanceTankArt } from './tank-art';
import { initializeHomingProjectile } from './homing-projectiles';
import { detachForcefield } from './forcefield';
import { removeTankChild } from './tank-display';
import { killMountedShield } from './shields';
import { MainEffects } from './main-effects';
import { RunPartUnlocks, partUnlocked } from '../core/part-unlocks';
import { ProfileClassAllowance } from '../core/profile-class';
import type {
  CollisionTest,
  Effect,
  Field,
  GunState,
  InputFrame,
  Pickup,
  Progression,
  Projectile,
  Rect,
  Stats,
  Tank,
  TankDesign,
  TankPart,
  Vec,
  WorldEvent,
  WorldMode,
} from '../core/types';
import { AVATARS, BOSSES, costs, gunBudget, STARTER } from '../data/catalog';
import { WEAPONS, type WeaponSpec } from '../data/weapons';
import emitterData from '../data/emitters.json';
import { moveEnemy } from './ai';
import { FieldRuntime } from './field-runtime';
import { WallTimers } from './wall-timers';
import { controlPlayerDirection } from './player-direction';
import {
  tickGuns,
  triggerPlayerPrimaries,
  fireGun,
  spawnVolley,
  orderSecondaries,
} from './weapons';
import { tickBullet, starSplit, releaseCarrier, explode } from './projectiles';
import { createTank } from './tank';
import { spawnPickups, tickPickups } from './pickups';
import { damageTank } from './damage';
import { rollWave, UnitRoster } from './waves';
import { tickStatusDecoration, tickStatusTail } from './status';
import fieldGeometry from '../data/field-geometry.json';
import { nextMapMode, type MapMode } from '../core/minimap';
import { HudState, firePanelHeight } from '../core/hud';
import { EditSliderState } from '../core/edit-slider';
import { tutorialForAttachment } from '../core/tutorial';
import { FieldVisit } from '../core/field-visit';
import { TacticalHudState } from '../core/tactical-hud';
import { disabledTargetLocks, type TargetLockHooks } from '../core/target-lock';
import { combatEffect, type CombatEffect, type EffectOptions } from './effects';
import { expireInfectionTarget } from './infection-projectile';
import { ProjectileTimelines } from './projectile-timelines';
import { forgetLayerMine } from './mine-layers';
import { projectileFlags } from './projectile-flags';
import mineArt from '../data/mine-art.json';
import { initializeSapper } from './sapper';
import { initializeAvatarSeeker } from './avatar-seeker';
import { mockProjectileHit } from '../assets/mock-projectile';
import { authoredProjectileBounds } from '../assets/projectile-geometry';

export interface Transit {
  next: Field;
  visit: FieldVisit;
  offset: Vec;
  target: Vec;
  direction: Vec;
  age: number;
  stopShoot: boolean;
}
export interface FieldConnection {
  from: Field;
  to: Field;
}
export function fieldConnectionKey(from: Field, to: Field) {
  return [`${from.col},${from.row}`, `${to.col},${to.row}`].sort().join('|');
}
export const emptyInput = (): InputFrame => ({
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  secondary: false,
  aim: { x: STAGE.cx + 100, y: STAGE.cy },
});
export class World {
  mode: WorldMode = 'playing';
  player: Tank;
  private currentField!: Field;
  private fieldContext: Field | null = null;
  private runtimes = new WeakMap<Field, FieldRuntime>();
  get currentWrapper(): Field {
    return this.currentField;
  }
  get field(): Field {
    return this.fieldContext ?? this.currentField;
  }
  set field(value: Field) {
    this.currentField = value;
  }
  runtimeFor(field: Field): FieldRuntime {
    let runtime = this.runtimes.get(field);
    if (!runtime) {
      runtime = new FieldRuntime();
      this.runtimes.set(field, runtime);
    }
    return runtime;
  }
  private get runtime() {
    return this.runtimeFor(this.field);
  }
  get bullets() {
    return this.runtime.bullets;
  }
  set bullets(value: Projectile[]) {
    this.runtime.bullets = value;
  }
  get pickups() {
    return this.runtime.pickups;
  }
  set pickups(value: Pickup[]) {
    this.runtime.pickups = value;
  }
  get effects() {
    return this.runtime.effects;
  }
  set effects(value: Effect[]) {
    this.runtime.effects = value;
  }
  get allies() {
    return this.runtime.allies;
  }
  set allies(value: Tank[]) {
    this.runtime.allies = value;
  }
  private get pending() {
    return this.runtime.pending;
  }
  private set pending(value: FieldRuntime['pending']) {
    this.runtime.pending = value;
  }
  activeFields() {
    return [
      {
        field: this.currentField,
        runtime: this.runtimeFor(this.currentField),
        offset: { x: 0, y: 0 },
      },
      ...(this.transit
        ? [
            {
              field: this.transit.next,
              runtime: this.runtimeFor(this.transit.next),
              offset: this.transit.offset,
            },
          ]
        : []),
    ];
  }
  /** Every actor keeps field-local coordinates; only the shared avatar needs projection. */
  private inField(field: Field, offset: Vec, run: () => void) {
    const previous = this.fieldContext;
    this.fieldContext = field;
    this.player.x -= offset.x;
    this.player.y -= offset.y;
    try {
      run();
    } finally {
      this.player.x += offset.x;
      this.player.y += offset.y;
      this.fieldContext = previous;
    }
  }
  /** _-0D.SpawnNewBullet declines new shots while _-5d is set. Timers still run. */
  addBullet(bullet: Projectile) {
    if (this.transit) return false;
    if (bullet.kind === 'apocalypse') bullet.missExempt ??= true;
    if (bullet.kind === 'turret') bullet.motion ??= direction(bullet.angle, bullet.speed);
    this.projectileTimelines.initialize(bullet);
    initializeSapper(this, bullet);
    initializeAvatarSeeker(this, bullet);
    initializeHomingProjectile(this, bullet);
    if (bullet.kind === 'infect' && bullet.targetId === null) expireInfectionTarget(this, bullet);
    this.bullets.push(bullet);
    if (bullet.enemy) this.stats.enemyShots++;
    else {
      this.stats.shots++;
      if (this.runtime.shootTimer === -1) {
        this.emit('shoot');
        this.runtime.shootTimer = 5;
      }
    }
    return true;
  }
  removeBullet(bullet: Projectile) {
    const index = this.bullets.indexOf(bullet);
    if (index < 0) return;
    forgetLayerMine(this, bullet);
    this.bullets.splice(index, 1);
  }
  fieldVisit = new FieldVisit(true);
  fields = new Map<string, Field>();
  connections = new Map<string, FieldConnection>();
  mapMode: MapMode = 1;
  mapHovered = false;
  private pausedMode: WorldMode = 'playing';
  private upgradeReturnMode: 'playing' | 'transit' = 'playing';
  private secondaryHelpReturnMode: 'playing' | 'transit' = 'playing';
  progression: Progression = { level: 0, history: [STARTER] };
  private readonly partUnlocks = new RunPartUnlocks();
  get unlockedParts() {
    return this.partUnlocks.parts;
  }
  offers: TankDesign[] = [];
  stats: Stats = {
    damageDone: 0,
    enemyShots: 0,
    friendlyMissed: 0,
    enemyMissed: 0,
    kills: 0,
    deadheads: 0,
    fighters: 0,
    sumo: 0,
    collected: 0,
    completed: 0,
    visited: 0,
    shots: 0,
    frames: 0,
  };
  events: WorldEvent[] = [];
  achievements = new Set<string>();
  transit: Transit | null = null;
  targetLocks: TargetLockHooks = disabledTargetLocks;
  viewZoom = 1;
  bossTriggered = false;
  bossDefeated = false;
  secondaryCounter = 0;
  screenShake = true;
  collapse: {
    age: number;
    angle: number;
    shakeTimer: number;
    shakeCount: number;
    flashTimer: number;
    effect: Effect;
    field: Field;
  } | null = null;
  hud = new HudState();
  tacticalHud = new TacticalHudState();
  editSlider = new EditSliderState();
  revision = 0;
  private uid = 1;
  private wallTimers = new WallTimers();
  projectileTimelines = new ProjectileTimelines(() => this.rng.next());
  get mineTimelines() {
    return this.projectileTimelines;
  }
  rng: Random;
  roster: UnitRoster;
  hitTest: CollisionTest = geometricHit;
  /** Runtime artwork supplies Script width; headless callers can inject its geometry. */
  displayWidth = (tank: Tank) => tank.radius * 2;
  /** Browser geometry supplies transformed Script bounds; headless callers can inject it. */
  protectionRadius = (tank: Tank) =>
    protectionRadius(
      tank.design.parts.map((part) => ({
        ...part,
        width: part.radius * 2,
        height: part.radius * 2,
      })),
    );
  hitProjectile = mockProjectileHit;
  projectileBounds = (b: Projectile): Rect =>
    authoredProjectileBounds(b) ?? {
      x: b.x - b.radius,
      y: b.y - b.radius,
      width: b.radius * 2,
      height: b.radius * 2,
      ...(b.artPose && !b.artPose.placements.length
        ? { x: b.x, y: b.y, width: 0, height: 0, empty: true }
        : {}),
    };
  projectileWidth = (b: Projectile) => this.projectileBounds(b).width;
  hitPart = (t: Tank, p: TankPart, x: number, y: number) => {
    const pt = rotate({ x: x - t.x, y: y - t.y }, -t.rotation);
    return !t.removedParts.has(p.key) && distance(pt, p) <= p.radius * p.scale;
  };
  onProgression: (history: TankDesign[]) => void = () => {};
  onAchievement: (name: string) => void = () => {};
  onCameraMove: (x: number, y: number) => void = () => {};
  secondaryHelpSeen = false;
  onSecondaryHelp: () => void = () => {};
  constructor(
    public localTanks: TankDesign[] = [],
    history: TankDesign[] = [],
    seed?: number,
    readonly mainEffects = new MainEffects(),
    readonly profileClass = new ProfileClassAllowance(),
  ) {
    this.rng = new Random(seed);
    this.roster = new UnitRoster(this.rng, localTanks);
    if (history.length)
      this.progression = {
        level: Math.min(6, history.length - 1),
        history: [...history.slice(0, 7)],
      };
    const level = this.progression.level,
      max = MAX_LIFE[level];
    this.player = createTank(
      this.nextId(),
      this.progression.history[level],
      'player',
      0,
      0,
      max,
      Math.floor(max / 75) + 1,
      this,
    );
    this.field = { col: 0, row: 0, scale: 1, enemies: [], cleared: true, boss: false, tutorial: 1 };
    this.fields.set('0,0', this.field);
  }
  nextId() {
    return this.uid++;
  }
  emit(type: WorldEvent['type'], value?: string) {
    this.events.push({ type, value });
  }
  drainEvents() {
    return this.events.splice(0);
  }
  allTanks() {
    return [this.player, ...this.field.enemies, ...this.allies].filter((t) => !t.dead);
  }
  pause() {
    if (this.mode === 'playing' || this.mode === 'transit') {
      this.pausedMode = this.mode;
      this.mode = 'paused';
      this.revision++;
    }
  }
  cycleMap() {
    this.mapMode = nextMapMode(this.mapMode);
    this.editSlider.reflow(this.mapMode);
    this.revision++;
  }
  resume() {
    if (this.mode === 'paused') {
      this.mode = this.pausedMode;
      this.revision++;
    }
  }
  cycleLock() {
    this.targetLocks.cycle();
    this.revision++;
  }
  advanceTime(milliseconds: number) {
    this.wallTimers.advance(milliseconds);
  }
  step(input: InputFrame, milliseconds = 20, advanceMainEffects = true) {
    this.advanceTime(milliseconds);
    if (advanceMainEffects) this.mainEffects.tick(() => this.rng.next());
    try {
      this.stepFrame(input);
    } finally {
      // Authored timelines advance even when state1 skips effects-engine polling.
      const attached = new Set<Tank>([this.player]);
      for (const { runtime } of this.activeFields()) {
        for (const effect of runtime.effects) effect.age++;
        for (const bullet of runtime.bullets)
          if (!bullet.dead) this.projectileTimelines.advance(bullet);
        for (const effect of runtime.pending) {
          effect.frame = (effect.frame % effect.total) + 1;
        }
      }
      for (const { field, runtime } of this.activeFields()) {
        for (const tank of [...field.enemies, ...runtime.allies]) attached.add(tank);
      }
      for (const tank of attached) advanceTankArt(tank);
    }
  }
  private stepFrame(input: InputFrame) {
    if (this.mode === 'collapse') {
      // PausePlayerControl selects source state3: effects/ENTER_FRAME shrink continue, HUD Run stops.
      this.pollEffects();
      this.tickCollapse();
      return;
    }
    if (this.mode === 'transit') {
      this.stats.frames++;
      this.interfaceFrame(input);
      if (this.mode !== 'transit') return;
      this.tickActiveFields(input);
      this.pollEffects();
      this.tickTransit();
      return;
    }
    if (this.mode !== 'playing') return;
    this.stats.frames++;
    // State0 detects an exit before interface/field/avatar work. Its initiation frame
    // still reaches Avatar.Run; subsequent state2 frames skip it.
    if (length(this.player) > FIELD_RADIUS * this.field.scale) this.jump(nearestExit(this.player));
    this.interfaceFrame(input);
    this.tickActiveFields(input);
    // Avatar.Run follows Bubblefield.Run; infection cannot promote/demote a tank until
    // the following interface frame. Passive weapons also observe the completed field step.
    this.tickAvatar(input);
    this.pollEffects();
    if (this.stats.frames % 5 === 0) this.revision++;
  }
  private interfaceFrame(input: InputFrame) {
    const tank = this.player;
    tank.teleportReady = true;
    // Interface direction/input is independent of the avatar's stunned Run branch.
    controlPlayerDirection(tank, input);
    if (!this.transit) this.movePlayer(input);
    if (this.secondaryCounter > 0) this.secondaryCounter--;
    else if (this.secondaryCounter === 0) this.secondaryCounter = -1;
    if (!this.transit?.stopShoot) {
      if (input.fire) {
        this.hud.revealFire();
        triggerPlayerPrimaries(this, tank, input);
      } else this.stopPrimaryFire();
      if (input.secondary && this.secondaryCounter < 0 && tank.status.jam === 0) {
        const guns = orderSecondaries(
          tank.guns.filter((gun) => Math.floor(gun.part.type / 1000) === 3),
        );
        if (guns.length) {
          this.hud.revealFire();
          for (const gun of guns) this.fireGun(tank, gun, input);
          this.secondaryCounter = Math.max(
            ...guns.map((gun) => WEAPONS[gun.part.type]?.rate ?? 40),
          );
        }
      }
    }
    this.hud.advance(tank.life, firePanelHeight(tank));
    this.hud.capture(tank, this.secondaryCounter);
    if (tank.status.sticky > 0) tank.status.sticky--;
    this.checkProgression();
    this.editSlider.advance();
  }
  private tickAvatar(input: InputFrame) {
    const tank = this.player;
    this.tickTank(tank, false);
    tank.stunned = tank.status.stun > 0;
    if (tank.stunned) {
      tank.status.stun--;
      tickStatusDecoration(tank);
      this.tickProtection(tank);
      return;
    }
    if (tank.status.jam > 0) tank.status.jam--;
    if (tank.status.jam === 0) tickGuns(this, tank, input, [2, 3, 5]);
    tickStatusDecoration(tank);
    this.tickProtection(tank);
    tickStatusTail(this, tank);
    this.tacticalHud.updatePassives(
      tank,
      this.field.enemies,
      this.viewZoom,
      this.mode === 'collapse',
    );
  }
  stopPrimaryFire() {
    for (const { runtime } of this.activeFields()) {
      for (const bullet of runtime.bullets)
        if (bullet.owner === this.player.uid && bullet.anchor?.part.type === 2017)
          bullet.dead = true;
      runtime.bullets = runtime.bullets.filter((bullet) => !bullet.dead);
    }
  }
  startRocketTimer(owner: Tank, gun: GunState) {
    this.wallTimers.repeat(owner.uid, 100, 10, (index) => {
      if (owner !== this.player || owner.dead) return;
      this.spawnVolley(
        owner,
        gun,
        { ...WEAPONS[3015], angles: [this.rng.int(-10, 10)] },
        index % 5,
      );
    });
  }
  private pollEffects() {
    for (const { field, offset, runtime } of this.activeFields())
      this.inField(field, offset, () => {
        runtime.effects = runtime.effects.filter(
          (effect) =>
            effect.frame !== undefined || effect.age % effect.duration < effect.duration - 1,
        );
        runtime.pending = runtime.pending.filter((effect) => {
          if (effect.owner.dead || (effect.owner.side === 'player' && effect.owner !== this.player))
            return false;
          if (effect.frame < effect.total) return true;
          if (effect.kind === 'shield') {
            killMountedShield(effect.owner, effect.gun);
            return false;
          }
          if (this.screenShake) this.mainEffects.shake(20);
          this.mainEffects.flash();
          this.spawnVolley(effect.owner, effect.gun, WEAPONS[3008]);
          return false;
        });
      });
  }
  private tickActiveFields(input: InputFrame) {
    this.tacticalHud.updateAllies(this.allies, this.player, this.viewZoom);
    this.inField(this.currentField, { x: 0, y: 0 }, () => this.tickField(input, this.fieldVisit));
    const transit = this.transit;
    if (transit)
      this.inField(transit.next, transit.offset, () => this.tickField(input, transit.visit));
  }
  private tickField(input: InputFrame, visit: FieldVisit) {
    this.flushEnemyRemovals();
    this.allies = this.allies.filter((t) => !t.dead);
    // Separate live arrays match _-0D.Run: a spawner's newly appended enemies run now.
    for (const enemy of this.field.enemies) this.tickActor(enemy, input);
    for (const ally of this.allies) this.tickActor(ally, input);
    // The source loops the live array: spawned fragments run in this same field frame.
    for (const bullet of this.bullets) {
      this.tickBullet(bullet, input);
    }
    for (let index = 0; index < this.bullets.length;) {
      const bullet = this.bullets[index];
      if (bullet.dead || bullet.removeAfterFrame) this.removeBullet(bullet);
      else index++;
    }
    tickPickups(this);
    this.allies = this.allies.filter((t) => !t.dead);
    this.completeField(this.field, visit);
    // _-0D flushes queued effects after its combat/pickup/completion work. The engine
    // still targets the outgoing layer while both wrappers run during a crossing.
    for (const effect of this.runtime.effectQueue) this.registerEffect(effect);
    this.runtime.effectQueue = [];
    if (this.runtime.collectTimer >= 0) this.runtime.collectTimer--;
    if (this.runtime.shootTimer >= 0) this.runtime.shootTimer--;
  }
  private tickActor(tank: Tank, input: InputFrame) {
    if (tank.dead) return;
    this.tickTank(tank, false);
    tank.stunned = tank.status.stun > 0;
    if (tank.stunned) {
      // Reaching zero does not enter the active branch until the following Run.
      tank.status.stun--;
      tickStatusDecoration(tank);
      this.tickProtection(tank);
      return;
    }
    const boss = tank.side === 'enemy' && tank.design.id.startsWith('B');
    if (!boss && tank.status.sticky > 0) tank.status.sticky--;
    moveEnemy(tank, this.currentField.scale, this.rng, this.player);
    if (tank.status.jam > 0) tank.status.jam--;
    if (tank.status.jam === 0) this.tickGuns(tank, input);
    tickStatusDecoration(tank);
    this.tickProtection(tank);
    tickStatusTail(this, tank);
    if (
      tank.dead ||
      boss ||
      length(tank) + tank.radius / 2 <= FIELD_RADIUS * this.currentField.scale
    )
      return;
    if (tank.side === 'enemy') {
      this.stats.sumo++;
      this.damage(tank, tank.life);
    } else {
      // Base IsOutside deactivates allies directly, bypassing shield/forcefield damage.
      tank.life = 0;
      tank.dead = true;
      this.dropBubbles(tank, tank.design.reward);
      for (const bullet of this.bullets)
        if (bullet.owner === tank.uid && ['beam', 'whip'].includes(bullet.kind)) bullet.dead = true;
    }
  }
  beginCollapse(angle: number) {
    if (this.collapse) return;
    this.runtime.apocalypse = false;
    const effect = this.addCombatEffect(
      {
        x: -this.player.x * this.viewZoom + this.mainEffects.position.x,
        y: -this.player.y * this.viewZoom + this.mainEffects.position.y,
      },
      'collapse',
      {
        frame: 1,
        rotation: angle,
        scale: this.field.scale * this.viewZoom,
        randomRotation: false,
        blendMode: 'layer',
      },
      true,
    );
    this.collapse = {
      age: 0,
      angle,
      shakeTimer: 0,
      shakeCount: 0,
      flashTimer: 0,
      effect,
      field: this.field,
    };
    this.mode = 'collapse';
    this.tacticalHud.updatePassives(this.player, this.field.enemies, this.viewZoom, true);
    this.revision++;
  }
  private tickCollapse() {
    const c = this.collapse!;
    c.age++;
    // The script-created clip holds frame1 through its first stage update.
    c.effect.frame = Math.max(1, c.age);
    // Engine completion removes the shrink listener before the120th field ENTER_FRAME.
    if (c.age >= c.effect.duration) {
      this.finishCollapse();
      const runtime = this.runtimeFor(c.field);
      runtime.effects = runtime.effects.filter((effect) => effect !== c.effect);
      return;
    }
    if (c.shakeTimer-- <= 0) {
      this.mainEffects.shake(++c.shakeCount);
      c.shakeTimer = c.shakeCount;
    }
    if (c.flashTimer-- <= 0) {
      this.mainEffects.flash();
      c.flashTimer = this.rng.int(10, 40);
    }
  }
  private finishCollapse() {
    for (const ally of this.allies) this.damage(ally, ally.life);
    for (const enemy of this.field.enemies) {
      enemy.design = { ...enemy.design, reward: Math.floor(enemy.design.reward / 3) };
      this.damage(enemy, enemy.life);
    }
    // Destroy replaces arrEnemies without flushing its deletion queue or medal checks.
    this.runtime.enemyRemovals = [];
    this.field.enemies = [];
    this.field.destroyed = true;
    this.field.cleared = true;
    this.bullets = [];
    this.pickups = [];
    this.allies = [];
    this.pending = [];
    this.player.x = this.player.y = 0;
    this.collapse = null;
    this.mode = 'playing';
    // Destroy calls _-1E directly; only ordinary boundary exits run FinalPartCall.
    this.jump({ x: -1, y: 0 }, false, { finalizeParts: false });
    this.addCombatEffect({ x: 0, y: 0 }, 'collapseFlash', {}, true);
  }
  private tickTank(t: Tank, maintainProtection = true) {
    t.age++;
    if (t.hurtCounter > 0) t.hurtCounter--;
    else if (t.hurtCounter === 0) t.hurtCounter = -1;
    if (maintainProtection) this.tickProtection(t);
  }
  private tickProtection(t: Tank) {
    if (t.shield > 0 && !t.shieldManaged) {
      t.shield--;
      if (t.shield === 0) removeTankChild(t, 'shield-film');
    }
    if (
      t.forcefield < 40 &&
      t.design.parts.some((p) => p.type === 5005) &&
      ++t.forcefieldCounter === 20
    ) {
      t.forcefieldCounter = 0;
      t.forcefield = Math.min(40, t.forcefield + 1);
      if (!t.forcefieldReady && t.forcefield > 0) {
        t.forcefieldReady = true;
        t.forcefield = 40;
        t.forcefieldFrame = 36;
      }
    }
  }
  private movePlayer(input: InputFrame) {
    const p = this.player,
      speed = CLASS_SPEED[p.design.classId - 1] ?? 1;
    const max = 6 * speed * (p.status.sticky > 0 ? 0.3 : 1);
    for (const [axis, neg, pos] of [
      ['x', input.left, input.right],
      ['y', input.up, input.down],
    ] as const) {
      let v = p.velocity[axis];
      if (neg || pos) v = clamp(v + ((pos ? 1 : 0) - (neg ? 1 : 0)) * 0.6 * speed, -max, max);
      else {
        v -= Math.sign(v) * 0.09;
        if (Math.abs(v) < 0.5) v = 0;
      }
      p.velocity[axis] = v;
      p[axis] += v;
    }
    this.onCameraMove(p.velocity.x, p.velocity.y);
  }

  nearestEnemy(from: Vec): Tank | undefined {
    return this.field.enemies
      .filter((t) => !t.dead)
      .reduce<Tank | undefined>(
        (a, t) => (!a || distance(t, from) < distance(a, from) ? t : a),
        undefined,
      );
  }
  muzzle(t: Tank, gun: GunState, offset = 13, emitterIndex = 0): Vec {
    const points = (emitterData as Record<string, Vec[]>)[gun.part.type];
    const emitter =
      offset === 0
        ? { x: 0, y: 0 }
        : (points?.[emitterIndex] ?? points?.[0] ?? { x: offset, y: 0 });
    const mount = rotate(gun.part, t.rotation),
      tip = rotate(
        { x: emitter.x * gun.part.scale, y: emitter.y * gun.part.scale },
        t.rotation + gun.angle,
      );
    return { x: t.x + mount.x + tip.x, y: t.y + mount.y + tip.y };
  }
  private tickGuns(t: Tank, input: InputFrame) {
    tickGuns(this, t, input);
  }
  fireGun(t: Tank, gun: GunState, input: InputFrame) {
    fireGun(this, t, gun, input);
  }
  spawnVolley(t: Tank, gun: GunState, spec: WeaponSpec, emitterIndex?: number) {
    return spawnVolley(this, t, gun, spec, emitterIndex);
  }
  private tickBullet(b: Projectile, input: InputFrame) {
    tickBullet(this, b, input);
  }
  starSplit(b: Projectile) {
    starSplit(this, b);
  }
  releaseCarrier(t: Tank, gun: GunState) {
    releaseCarrier(this, t, gun);
  }
  explode(b: Projectile, radius: number, damage: number, directTarget?: Tank | Projectile) {
    explode(this, b, radius, damage, directTarget);
  }
  scheduleShield(owner: Tank, gun: GunState) {
    owner.shieldManaged = true;
    // Every trigger queues a callback bound to that mount, without cancelling earlier ones.
    this.pending.push({ kind: 'shield', owner, gun, frame: 1, total: 25 });
  }
  scheduleShot(owner: Tank, gun: GunState, frames: number) {
    this.pending.push({ owner, gun, total: frames, frame: 1 });
  }
  /** Source counters record nominal contact damage before Damage applies protection. */
  damageDoneIncr(amount: number) {
    this.stats.damageDone += amount;
  }
  damage(t: Tank, amount: number, bullet?: Projectile) {
    damageTank(this, t, amount, bullet);
  }
  kill(t: Tank) {
    if (t.dead) return;
    t.dead = true;
    this.emit(t.side === 'ally' ? 'death' : 'pop');
    if (t.side === 'enemy') {
      this.stats.kills++;
      this.runtime.enemyRemovals.push(t);
      this.dropBubbles(t, t.design.reward);
    }
    for (const gun of t.guns)
      if (gun.part.type === 4022) {
        for (let i = 0; i < 6; i++) {
          this.addBullet({
            uid: this.nextId(),
            owner: t.uid,
            enemy: true,
            kind: 'seekerMine',
            x: t.x,
            y: t.y,
            angle: this.rng.int(0, 360),
            heading: 0,
            speed: 4,
            damage: 7,
            radius: 2,
            age: 0,
            life: Infinity,
            explode: 0,
            targetId: null,
            hit: new Set(),
            dead: false,
            symbol: mineArt.seeker.symbol,
            artScale: 1,
            orbit: 0,
            scatter: this.rng.int(4, 22),
          });
        }
      }
    if (t.status.infect > 0)
      for (let i = 0; i < 2; i++)
        this.addBullet({
          uid: this.nextId(),
          owner: t.uid,
          enemy: false,
          x: t.x,
          y: t.y,
          angle: this.rng.int(0, 360),
          heading: 0,
          speed: 6,
          damage: 1,
          radius: 3,
          kind: 'infect',
          status: 'infect',
          age: 0,
          life: Infinity,
          explode: 0,
          hit: new Set(),
          targetId: null,
          dead: false,
          symbol: 15,
          orbit: 0,
        });
    for (const b of this.bullets)
      if (b.owner === t.uid && ['beam', 'whip'].includes(b.kind)) b.dead = true;
  }
  /** _-0D.RemoveEnemy classifies the birth code only when the queued object detaches. */
  flushEnemyRemovals() {
    const runtime = this.runtime;
    for (const tank of runtime.enemyRemovals) {
      const index = this.field.enemies.indexOf(tank);
      if (index < 0) continue;
      const key = this.roster.lookupKey(tank.rosterIdentity);
      if (key.includes('DeadHead')) this.stats.deadheads++;
      if (key.includes('Fighter')) this.stats.fighters++;
      if (key === 'HeavyMiniBoss' && this.progression.level <= 3) this.award('David and Goliath');
      // Source equality is intentional: two protected pushes can skip exactly50.
      if (this.stats.deadheads === 200) this.award('Headhunter');
      if (this.stats.fighters === 100) this.award('Dogfighter');
      if (this.stats.sumo === 50) this.award('Pro Sumo');
      this.field.enemies.splice(index, 1);
    }
    runtime.enemyRemovals = [];
    // External fixtures may mark a tank dead without invoking its callback.
    this.field.enemies = this.field.enemies.filter((tank) => !tank.dead);
  }
  dropBubbles(pos: Vec, amount: number) {
    spawnPickups(this, pos, amount, this.runtimeFor(this.currentField).pickups);
  }
  private completeField(field: Field, visit: FieldVisit) {
    if (!visit.tryComplete(field)) return;
    field.cleared = true;
    this.editSlider.trigger(this.progression.level, this.mapMode);
    this.stats.completed++;
    this.revision++;
    const runtime = this.runtimeFor(field);
    for (const b of runtime.pickups) b.forced = true;
    for (const b of runtime.bullets)
      if (b.enemy && (['mine', 'seekerMine'].includes(b.kind) || projectileFlags(b).seeker))
        b.wipe = true;
    // CompletedABubblefield checks the current wrapper, even if the next one called it.
    if (this.currentField.boss && !this.bossDefeated) {
      this.bossDefeated = true;
      if (this.mode === 'playing') {
        this.mode = 'won';
        this.emit('win');
      }
      this.award('Boss Badge');
      const cells = [...this.fields.values()];
      const col = this.transit?.next.col ?? this.currentField.col,
        row = this.transit?.next.row ?? this.currentField.row;
      const extremes = [
        Math.abs(Math.min(0, col, ...cells.map((f) => f.col))),
        Math.max(0, col, ...cells.map((f) => f.col)),
        Math.abs(Math.min(0, row, ...cells.map((f) => f.row))),
        Math.max(0, row, ...cells.map((f) => f.row)),
      ];
      if (extremes.includes(this.stats.visited)) this.award('Masochist');
    }
  }
  private checkProgression() {
    const p = this.player;
    if (p.life <= 0) {
      if (this.progression.level === 0) {
        this.escapeAtLevelZero();
      } else {
        this.progression.level--;
        this.rebuildPlayer(this.progression.history[this.progression.level], true);
      }
      return;
    }
    if (p.life === p.maxLife && this.progression.level < 6) {
      this.progression.level++;
      this.profileClass.recordUpgrade(this.progression.level);
      this.emit('upgrade');
      const design = this.progression.history[this.progression.level];
      if (design) this.rebuildPlayer(design);
      else {
        this.upgradeReturnMode = this.mode === 'transit' ? 'transit' : 'playing';
        this.offers = this.getOffers();
        this.mode = 'upgrade';
        this.revision++;
      }
    }
  }
  getOffers(): TankDesign[] {
    const current = this.player.design.classId,
      level = this.progression.level;
    this.partUnlocks.unlockThrough(level);
    const offers: TankDesign[] = [];
    for (const classId of [current - 1, current, current + 1]) {
      if (classId < 1 || classId > 6 || classId > Math.min(6, level + 1)) continue;
      const budget = gunBudget(classId, level);
      if (!budget) continue;
      const pool = [...AVATARS, ...this.localTanks.filter((t) => t.avatar)].filter(
        (t) =>
          t.classId === classId &&
          costs(t.parts).gp <= budget &&
          t.parts.every(
            (p) =>
              partUnlocked(p.type, level, this.unlockedParts) &&
              Math.floor(p.type / 1000) !== 4 &&
              Math.floor(p.type / 1000) !== 6,
          ),
      );
      const sorted = pool.sort((a, b) => costs(b.parts).gp - costs(a.parts).gp);
      const exact = sorted.filter((t) => costs(t.parts).gp === budget);
      if (exact.length) offers.push(this.rng.pick(exact));
      else if (sorted.length) offers.push(sorted[0]);
    }
    if (!offers.length) offers.push({ ...STARTER, id: `fallback-${level}`, name: 'Basic Tank' });
    return offers;
  }
  selectUpgrade(design: TankDesign) {
    if (this.mode !== 'upgrade') return;
    this.progression.history[this.progression.level] = design;
    this.mode = this.upgradeReturnMode;
    this.rebuildPlayer(design);
    this.offers = [];
    this.onProgression([...this.progression.history]);
    this.revision++;
  }
  editPlayer(design: TankDesign) {
    this.progression.history[this.progression.level] = design;
    this.rebuildPlayer(design);
    this.onProgression([...this.progression.history]);
    this.revision++;
  }
  get canEdit() {
    return this.editSlider.enabled && this.progression.level >= 1 && this.mode === 'playing';
  }
  private rebuildPlayer(design: TankDesign, death = false) {
    this.targetLocks.clear(0);
    this.tacticalHud.clear();
    const old = this.player,
      max = MAX_LIFE[this.progression.level];
    this.wallTimers.cancel(old.uid);
    this.stopPrimaryFire();
    this.player = createTank(
      this.nextId(),
      design,
      'player',
      old.x,
      old.y,
      max,
      death ? max - 1 : Math.floor(max / 75) + 1,
      this,
    );
    this.player.rotation = old.rotation;
    this.player.velocity = { ...old.velocity };
    this.secondaryCounter = 0;
    this.revision++;

    // PlaceAvatar tests only replacement avatars, including edits and downgrades.
    if (
      !this.secondaryHelpSeen &&
      this.player.guns.some((g) => Math.floor(g.part.type / 1000) === 3)
    ) {
      this.secondaryHelpSeen = true;
      this.secondaryHelpReturnMode =
        this.mode === 'transit' || (this.mode === 'paused' && this.pausedMode === 'transit')
          ? 'transit'
          : 'playing';
      this.mode = 'secondary-help';
      this.onSecondaryHelp();
    }
  }
  closeSecondaryHelp() {
    if (this.mode !== 'secondary-help') return;
    this.mode = this.secondaryHelpReturnMode;
    this.revision++;
  }
  /** _-Zx.Damage handles a level-zero lethal hit synchronously, before pickups run. */
  escapeAtLevelZero() {
    this.player.life = 1;
    if (!this.transit) this.jump(nearestExit(this.player), true);
  }
  jump(dir: Vec, deadhead = false, { finalizeParts = true }: { finalizeParts?: boolean } = {}) {
    if (this.mode === 'transit') return;
    if (!deadhead) {
      this.wallTimers.cancel(this.player.uid);
      this.stopPrimaryFire();
      this.tacticalHud.clearPassives();
      if (finalizeParts) detachForcefield(this.player);
    }
    const tutorial = tutorialForAttachment(this.stats.visited);
    let col = this.currentField.col + dir.x,
      row = this.currentField.row + dir.y;
    let next = this.fields.get(`${col},${row}`);
    // Only Apocalypse's destroyed fields are holes; ordinary cleared fields remain destinations.
    while (next?.destroyed) {
      col += dir.x;
      row += dir.y;
      next = this.fields.get(`${col},${row}`);
    }
    if (!next) {
      const boss =
        !deadhead && !this.bossTriggered && this.player.life >= 1000 && this.progression.level >= 5;
      const wave = boss
        ? { scale: 1, designs: [BOSSES[0]] }
        : rollWave(deadhead ? -1 : Math.hypot(col, row), this.rng, this.localTanks, this.roster);
      if (boss) this.bossTriggered = true;
      next = {
        col,
        row,
        scale: wave.scale,
        boss,
        cleared: false,
        tutorial,
        enemies: wave.designs.map((design) => {
          const t = createTank(
            this.nextId(),
            design,
            'enemy',
            this.rng.int(-200, 200) * wave.scale,
            this.rng.int(-200, 200) * wave.scale,
            undefined,
            undefined,
            this,
          );
          t.rotation = this.rng.int(-180, 180);
          return t;
        }),
      };
      this.fields.set(`${col},${row}`, next);
      this.stats.visited = this.fields.size - 1;
      if (this.stats.visited === 100) this.award('Explorer');
    } else next.boss = false; // Cached enemies do not preserve the wrapper's boss flag.
    // Reattachment constructs a new bfStartDisplay even when the stored field already exists.
    next.tutorial = tutorial;
    const spacing =
      fieldGeometry.transitDiameter * next.scale +
      Math.trunc((fieldGeometry.transitDiameter * (this.field.scale - next.scale)) / 2) -
      4;
    this.roster.update(Math.hypot(col, row));
    const offset = { x: dir.x * spacing, y: dir.y * spacing };
    const entry = 317 * next.scale; // BF_over_detail_mc markers: ±6340 twips.
    this.transit = {
      next,
      visit: new FieldVisit(),
      offset,
      target: { x: offset.x - dir.x * entry, y: offset.y - dir.y * entry },
      direction: dir,
      age: 0,
      stopShoot: !deadhead,
    };
    if (!next.enemies.length) this.editSlider.trigger(this.progression.level, this.mapMode);
    else if (this.editSlider.atRest) this.editSlider.hide();
    this.mode = 'transit';
    this.emit('jump');
    this.revision++;
  }
  private tickTransit() {
    const tr = this.transit;
    if (!tr) return;
    tr.age++;
    const dx = tr.target.x - this.player.x,
      dy = tr.target.y - this.player.y;
    if (dx * dx + dy * dy < 25) {
      this.player.x -= tr.offset.x;
      this.player.y -= tr.offset.y;
      this.player.velocity = { x: 0, y: 0 };
      this.connections.set(fieldConnectionKey(this.field, tr.next), {
        from: this.field,
        to: tr.next,
      });
      // Only enemy objects survive in the cache. The destination already owns its
      // live shots, pickups and allies and keeps them when promoted.
      this.currentField.enemies = this.currentField.enemies.filter((t) => !t.dead);
      // _-8Y clears the single global effects engine without completing callbacks.
      for (const { runtime } of this.activeFields()) {
        runtime.effects = [];
        runtime.effectQueue = [];
        runtime.pending = [];
      }
      this.runtimes.delete(this.currentField);
      this.field = tr.next;
      this.targetLocks.clear();
      this.fieldVisit = tr.visit;
      this.player.shield = 0;
      this.player.shieldManaged = false;
      // CleanUpShield clears immunity only; clearing the effects engine skips
      // KillShield, so the old film remains attached until another trigger.
      for (const g of this.player.guns) g.counter = 0;
      this.transit = null;
      this.mode = 'playing';
      this.revision++;
    } else {
      this.player.x += dx * 0.09;
      this.player.y += dy * 0.09;
      this.onCameraMove(dx * 0.09, dy * 0.09);
    }
  }
  addEffect(pos: Vec, kind: Effect['kind'], radius: number, color: number, duration: number) {
    this.effects.push({
      uid: this.nextId(),
      x: pos.x,
      y: pos.y,
      kind,
      radius,
      color,
      duration,
      age: 0,
    });
  }
  addCombatEffect(
    pos: Vec,
    kind: CombatEffect,
    options: EffectOptions = {},
    immediate = false,
    queueField = this.field,
  ) {
    const effect = combatEffect(this.nextId(), pos, kind, options);
    if (immediate) this.registerEffect(effect);
    else this.runtimeFor(queueField).effectQueue.push(effect);
    return effect;
  }
  private registerEffect(effect: Effect) {
    if (effect.randomRotation) effect.rotation = Math.round(this.rng.next() * 360);
    this.runtimeFor(this.currentField).effects.push(effect);
  }
  award(name: string) {
    if (this.achievements.has(name)) return;
    this.achievements.add(name);
    this.emit('achievement', name);
    this.onAchievement(name);
  }
}
export function nearestExit(pos: Vec): Vec {
  // _-Ud starts with left, then replaces only on a strictly shorter right/top/bottom distance.
  if (Math.abs(pos.x) >= Math.abs(pos.y)) return { x: Math.sign(pos.x) || -1, y: 0 };
  return { x: 0, y: Math.sign(pos.y) || 1 };
}
export function geometricHit(t: Tank, x: number, y: number) {
  const local = rotate({ x: x - t.x, y: y - t.y }, -t.rotation);
  return t.design.parts.some(
    (p) =>
      !t.removedParts.has(p.key) && Math.hypot(local.x - p.x, local.y - p.y) < p.radius * p.scale,
  );
}
