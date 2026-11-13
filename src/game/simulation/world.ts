import { CLASS_SPEED, FIELD_RADIUS, MAX_LIFE, STAGE } from '../core/constants';
import { clamp, direction, distance, length, Random, rotate } from '../core/math';
import { displayPixel, displayTwips } from '../core/display-values';
import { displayMatrixPoint, inverseDisplayMatrix } from '../core/display-transform';
import { protectionRadius } from '../core/protection-size';
import { advanceTankArt } from './tank-art';
import { detachForcefield } from './forcefield';
import { removeTankChild } from './tank-display';
import { killMountedShield } from './shields';
import { MainEffects } from './main-effects';
import { RunPartUnlocks } from '../core/part-unlocks';
import { defaultUpgradeTank, upgradeClasses } from '../core/upgrade-offers';
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
import { AVATARS, STARTER } from '../data/catalog';
import { WEAPONS, type WeaponSpec } from '../data/weapons';
import emitterData from '../data/emitters.json';
import { moveActor } from './actor-movement';
import { ActorParents } from './actor-parents';
import {
  RegisteredEffects,
  EffectChildRemovalError,
  EffectCompletionReadError,
  EffectLayerReadError,
  type PendingEffect,
  type EffectRequest,
} from './registered-effects';
import { HealerTargetReadError } from './healer-target';
import { TurretTargetReadError } from './turrets';
import { SpikeTargetReadError } from './spikes';
import { initializeHomingProjectile, HomingTargetReadError } from './homing-projectiles';
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
import { stopDamageBeam } from './beams';
import { createTank, deactivateTankData } from './tank';
import { spawnPickups, tickPickups } from './pickups';
import { PickupDisplays, PickupChildRemovalError, clearPickups } from './pickup-display';
import { damageTank } from './damage';
import { rollBossWave, rollWave, UnitRoster } from './waves';
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
import {
  WorldFlow,
  CrossingTargetReadError,
  DeactivatedActorRunError,
  FieldChildRemovalError,
} from './world-flow';
import { FieldCache } from './field-cache';
import { FieldDisplays, type UnderAvatarSizeResolver } from './field-display';
import { resolveUnderAvatarSize } from './under-avatar-size';
import { WorldDisplays } from './world-display';

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
  from: Pick<Field, 'col' | 'row'>;
  to: Pick<Field, 'col' | 'row'>;
}
export function fieldConnectionKey(from: FieldConnection['from'], to: FieldConnection['to']) {
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
  private flow = new WorldFlow();
  get mode(): WorldMode {
    return this.flow.mode;
  }
  set mode(value: WorldMode) {
    this.flow.mode = value;
  }
  hitSoundTimer = -1;
  readonly actorParents = new ActorParents();
  readonly pickupDisplays = new PickupDisplays();
  readonly effectEngine = new RegisteredEffects();
  player: Tank;
  private currentField!: Field;
  private fieldContext: Field | null = null;
  private orphaned: { field: Field; screen: Vec }[] = [];
  private callbackFields = new WeakMap<Tank, Field>();
  readonly cache = new FieldCache();
  readonly fieldDisplays: FieldDisplays;
  readonly worldDisplays: WorldDisplays;
  mapPosition = { col: 0, row: 0 };
  private previousMapPosition = { col: 0, row: 0 };
  private runtimes = new WeakMap<Field, FieldRuntime>();
  private projectileParents = new WeakMap<Projectile, FieldRuntime>();
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
      runtime = new FieldRuntime(field, this.effectEngine);
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
    this.replaceBullets(this.runtime, value);
  }
  private replaceBullets(runtime: FieldRuntime, bullets: Projectile[]) {
    const retained = new Set(bullets);
    for (const bullet of runtime.bullets)
      if (!retained.has(bullet) && this.projectileParents.get(bullet) === runtime)
        this.projectileParents.delete(bullet);
    runtime.bullets = bullets;
    for (const bullet of bullets) this.projectileParents.set(bullet, runtime);
  }
  /** A detached wrapper's bullet layer still parents its surviving children. */
  hasBulletParent(bullet: Projectile) {
    return this.projectileParents.has(bullet);
  }
  bulletGlobal(bullet: Projectile) {
    const parent = this.projectileParents.get(bullet);
    return parent
      ? this.worldDisplays.layerGlobal(bullet, parent.field, 'bullet', this.mainEffects.position)
      : null;
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
  get allies() {
    return this.runtime.allies;
  }
  set allies(value: Tank[]) {
    this.runtime.allies = value;
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
  /** Superseded next wrappers remain attached at their last stage-relative position. */
  attachedFields() {
    const player = this.avatarPosition();
    return [
      ...this.activeFields().slice(0, 1),
      ...this.orphaned.map(({ field, screen }) => ({
        field,
        runtime: this.runtimeFor(field),
        offset: { x: screen.x + player.x, y: screen.y + player.y },
      })),
      ...this.activeFields().slice(1),
    ];
  }
  private avatarPosition() {
    return this.actorParents.point(this.player, this.currentField)!;
  }
  /** Tank scalars are a receiver-local bridge, not a second accumulated camera position. */
  private projectAvatar(field: Field) {
    const point = this.actorParents.point(this.player, field)!;
    this.player.x = point.x;
    this.player.y = point.y;
  }
  /** Every actor keeps field-local coordinates; only the shared avatar needs projection. */
  private inField(field: Field, run: () => void) {
    const previous = this.fieldContext;
    this.fieldContext = field;
    this.projectAvatar(field);
    try {
      run();
    } finally {
      this.fieldContext = previous;
      this.projectAvatar(previous ?? this.currentField);
    }
  }
  /** _-0D.SpawnNewBullet declines new shots while _-5d is set. Timers still run. */
  addBullet(bullet: Projectile, home?: Tank, target?: Tank, prepare?: () => void) {
    if (this.transit) return false;
    prepare?.();
    // SpawnNewBullet assigns display coordinates before virtual Setup reads them.
    bullet.x = displayPixel(bullet.x);
    bullet.y = displayPixel(bullet.y);
    if (bullet.kind === 'healBeam')
      bullet.healingHome ??= home ?? this.allTanks().find((tank) => tank.uid === bullet.owner);
    if (bullet.kind === 'apocalypse') bullet.missExempt ??= true;
    if (bullet.kind === 'turret') {
      bullet.turretHome = home;
      bullet.motion ??= direction(bullet.angle, bullet.speed);
    }
    this.projectileTimelines.initialize(bullet);
    initializeSapper(this, bullet, home, target);
    initializeAvatarSeeker(this, bullet, target);
    initializeHomingProjectile(this, bullet, home, target);
    if (bullet.kind === 'infect' && bullet.targetId === null) expireInfectionTarget(this, bullet);
    // Source SpawnNewBullet writes this AFTER virtual Setup, even if Setup queued removal.
    bullet.movementEnabled = true;
    this.bullets.push(bullet);
    this.projectileParents.set(bullet, this.runtime);
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
  removeBullet(bullet: Projectile, field = this.field) {
    const runtime = this.runtimeFor(field);
    const index = runtime.bullets.indexOf(bullet);
    if (index < 0) return false;
    forgetLayerMine(this, bullet);
    runtime.bullets.splice(index, 1);
    if (this.projectileParents.get(bullet) === runtime) this.projectileParents.delete(bullet);
    return true;
  }
  /** currentBFTarget.SpawnNewEnemy has no crossing birth gate. */
  spawnEnemy(design: TankDesign, point: Vec) {
    const field = this.currentWrapper;
    const enemy = createTank(this.nextId(), design, 'enemy', 0, 0, undefined, undefined, this);
    // TankData._-Tr completes Setup before SpawnNewEnemy assigns its display pose.
    enemy.x = point.x;
    enemy.y = point.y;
    this.attachActor(enemy, field);
    field.enemies.push(enemy);
    return enemy;
  }
  /** SpawnNewAlly attaches before recording its callback and live-array entry. */
  spawnAlly(design: TankDesign, point: Vec) {
    const field = this.currentWrapper;
    const ally = createTank(this.nextId(), design, 'ally', 0, 0, 15, undefined, this);
    ally.x = point.x;
    ally.y = point.y;
    this.attachActor(ally, field);
    this.runtimeFor(field).allies.push(ally);
    return ally;
  }
  /** Source addChild followed by SetCallback; Run-array insertion is separate. */
  attachActor(tank: Tank, field: Field) {
    this.actorParents.attach(tank, field);
    this.callbackFields.set(tank, field);
  }
  fieldVisit = new FieldVisit(true);
  fields = new Map<string, Field>();
  connections = new Map<string, FieldConnection>();
  mapMode: MapMode = 1;
  mapHovered = false;
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
  /** Browser assets supply Script width; headless callers may inject geometry. */
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
    return (
      t.displayChildren.includes(`part:${p.key}`) &&
      !t.removedParts.has(p.key) &&
      distance(pt, p) <= p.radius * p.scale
    );
  };
  onProgression: (history: TankDesign[]) => void = () => {};
  onAchievement: (name: string) => void = () => {};
  onCameraMove: (x: number, y: number) => void = () => {};
  secondaryHelpSeen = false;
  onSecondaryHelp: () => void = () => {};
  onUpgradeMenuOpen: () => void = () => {};
  /** CompletedABubblefield notification, before the calling field completes its tail. */
  onWinScreenOpen: () => void = () => {};
  onBackgroundChange: (running: boolean) => void = () => {};
  private backgroundActive = true;
  /** Last World command; Settings can independently force the browser background on/off. */
  get backgroundRunning() {
    return this.backgroundActive;
  }
  private backgroundState(running: boolean) {
    this.backgroundActive = running;
    this.onBackgroundChange(running);
  }
  constructor(
    public localTanks: TankDesign[] = [],
    history: TankDesign[] = [],
    seed?: number,
    readonly mainEffects = new MainEffects(),
    readonly profileClass = new ProfileClassAllowance(),
    public avatarLibrary: readonly TankDesign[] = localTanks.filter((tank) => tank.avatar),
    underAvatarSizeResolver: UnderAvatarSizeResolver = resolveUnderAvatarSize,
  ) {
    this.fieldDisplays = new FieldDisplays(underAvatarSizeResolver);
    this.worldDisplays = new WorldDisplays(this.fieldDisplays, this.effectEngine);
    this.fieldDisplays.onCollapseSiblingScale = (field, kind, axis, value) =>
      this.worldDisplays.setCollapseScale(field, kind, axis, value);
    this.fieldDisplays.onCollapseHighlightAlpha = (field, value) =>
      this.worldDisplays.setHighlightAlpha(field, value);
    this.rng = new Random(seed);
    this.roster = new UnitRoster(this.rng, localTanks);
    if (history.length)
      this.progression = {
        level: Math.min(6, history.length - 1),
        history: [...history.slice(0, 7)],
      };
    const level = this.progression.level,
      max = MAX_LIFE[level];
    this.field = { col: 0, row: 0, scale: 1, enemies: [], cleared: true, boss: false, tutorial: 1 };
    this.fieldDisplays.create(this.field, true);
    this.fieldDisplays.attach(this.field, { x: 0, y: 0 });
    this.fieldDisplays.attachBottom(this.field);
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
    this.fieldDisplays.updateAvatar(this.player, this.field, undefined, this.stats.frames);
    this.fields.set('0,0', this.field);
    this.effectEngine.createFieldLayers(this.field);
    this.worldDisplays.construct(this.field, this.field, true);
    this.effectEngine.register(this.effectEngine.layer(this.field, 'top')!);
    this.effectEngine.register(this.effectEngine.layer(this.field, 'bottom')!);
    this.effectEngine.register(this.effectEngine.screen);
    this.actorParents.sync(this);
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
    if (this.flow.pause()) {
      this.backgroundState(false);
      this.revision++;
    }
  }
  cycleMap() {
    this.mapMode = nextMapMode(this.mapMode);
    this.editSlider.reflow(this.mapMode);
    this.revision++;
  }
  resume() {
    if (this.flow.resume()) {
      this.backgroundState(true);
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
    this.effectEngine.enterFrame();
    this.pickupDisplays.enterFrame();
    this.advanceTime(milliseconds);
    if (advanceMainEffects) this.mainEffects.tick(() => this.rng.next());
    try {
      this.stepFrame(input);
      // BTAGameWorld._-9E follows its mode switch, including state1 pause.
      // An uncaught listener error skips this tail; the finally artwork pass is separate.
      if (this.hitSoundTimer >= 0) this.hitSoundTimer--;
    } catch (error) {
      // AVM2 dispatch ends this Main.Run listener on an uncaught target read; the next frame runs.
      if (
        !(error instanceof HealerTargetReadError) &&
        !(error instanceof TurretTargetReadError) &&
        !(error instanceof SpikeTargetReadError) &&
        !(error instanceof HomingTargetReadError) &&
        !(error instanceof CrossingTargetReadError) &&
        !(error instanceof DeactivatedActorRunError) &&
        !(error instanceof FieldChildRemovalError) &&
        !(error instanceof PickupChildRemovalError) &&
        !(error instanceof EffectLayerReadError) &&
        !(error instanceof EffectChildRemovalError) &&
        !(error instanceof EffectCompletionReadError)
      )
        throw error;
    } finally {
      this.advanceArtwork(false);
    }
  }
  /** Attached ENTER_FRAME art continues when Main4 skips the World.Run listener. */
  advanceArtwork(enterCarrierFrame = true) {
    if (enterCarrierFrame) {
      this.effectEngine.enterFrame();
      this.pickupDisplays.enterFrame();
    }
    this.pickupDisplays.advanceArtwork();
    this.fieldDisplays.advanceArtwork();
    this.actorParents.sync(this);
    this.effectEngine.advanceArtwork();
    const attached = new Set<Tank>([this.player]);
    for (const { runtime } of this.attachedFields()) {
      for (const bullet of runtime.bullets)
        if (!bullet.dead) this.projectileTimelines.advance(bullet);
    }
    for (const { field } of this.attachedFields())
      for (const tank of this.actorParents.owned(field)) attached.add(tank);
    for (const tank of attached) advanceTankArt(tank);
  }
  private stepFrame(input: InputFrame) {
    if (this.flow.state === 'collapse') {
      // PausePlayerControl selects source state3: effects/ENTER_FRAME shrink continue, HUD Run stops.
      this.pollEffects();
      if (this.collapse) this.tickCollapse();
      return;
    }
    if (this.flow.state === 'transit') {
      this.stats.frames++;
      this.interfaceFrame(input);
      this.tickActiveFields(input);
      this.pollEffects();
      this.tickTransit();
      return;
    }
    if (this.flow.state !== 'playing') return;
    this.projectAvatar(this.currentField);
    this.stats.frames++;
    // State0 detects an exit before interface/field/avatar work. Its initiation frame
    // still reaches Avatar.Run; subsequent state2 frames skip it.
    if (!this.transit && length(this.player) > FIELD_RADIUS * this.field.scale)
      this.jump(nearestExit(this.player));
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
      this.flow.state === 'collapse',
    );
  }
  stopPrimaryFire() {
    for (const gun of this.player.guns) if (gun.part.type === 2017) stopDamageBeam(this, gun);
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
    this.effectEngine.poll();
  }
  private tickActiveFields(input: InputFrame) {
    this.actorParents.sync(this);
    this.tacticalHud.updateAllies(this.allies, this.player, this.viewZoom);
    this.inField(this.currentField, () => this.tickField(input, this.fieldVisit));
    const transit = this.transit;
    if (transit) this.inField(transit.next, () => this.tickField(input, transit.visit));
  }
  private tickField(input: InputFrame, visit: FieldVisit) {
    this.flushEnemyRemovals();
    const runtime = this.runtime;
    for (const tank of runtime.allyRemovals) {
      const index = runtime.allies.indexOf(tank);
      if (index >= 0) {
        runtime.allies.splice(index, 1);
        this.actorParents.detach(tank);
      }
    }
    runtime.allyRemovals = [];
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
    this.completeField(this.field, visit);
    // _-0D flushes queued effects after its combat/pickup/completion work. The engine
    // still targets the outgoing layer while both wrappers run during a crossing.
    runtime.flushEffects((request) => this.registerEffectRequest(request));
    if (this.runtime.collectTimer >= 0) this.runtime.collectTimer--;
    if (this.runtime.shootTimer >= 0) this.runtime.shootTimer--;
  }
  private tickActor(tank: Tank, input: InputFrame) {
    if (tank.dead && tank.dataActive) return; // Host fixtures can mark death without source teardown.
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
    tank.teleportReady = true;
    if (!tank.dataActive) {
      // Normal Deactivate leaves intState untouched. A retained stunned branch
      // above can finish; active movement then reads its cleared data/vectors.
      if (boss && tank.design.id.startsWith('B1')) tank.x = tank.y = 0;
      throw new DeactivatedActorRunError();
    }
    moveActor(tank, this.currentField.scale, this.rng, this.player);
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
      this.dropBubbles(tank, tank.design.reward);
      this.emit('pop');
      this.deactivateNpc(tank);
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
        rotation: angle,
        scale: this.field.scale * this.viewZoom,
        randomRotation: false,
        blendMode: 'layer',
      },
      true,
      this.field,
      () => this.finishCollapse(),
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
    this.fieldDisplays.beginCollapse(this.field);
    this.flow.collapse();
    this.tacticalHud.updatePassives(this.player, this.field.enemies, this.viewZoom, true);
    this.revision++;
  }
  private tickCollapse() {
    const c = this.collapse!;
    c.age++;
    this.fieldDisplays.shrink(c.field, this.currentField);
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
    this.fieldDisplays.finishCollapse(this.collapse!.field, this.currentField);
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
    clearPickups(this, this.field);
    this.allies = [];
    for (const carrier of this.runtime.pending) this.effectEngine.discard(carrier);
    this.projectAvatar(this.currentField);
    this.collapse = null;
    this.flow.restoreControl();
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
    }
    this.adjustBubblefieldObjects(p.velocity);
  }
  /** Original shared camera operation, including teleport's destination-origin displacement. */
  adjustBubblefieldObjects(delta: Vec) {
    this.fieldDisplays.moveCurrent(this.currentField, delta);
    this.projectAvatar(this.currentField);
    this.onCameraMove(delta.x, delta.y);
    this.worldDisplays.follow(this.currentField, this.transit?.next);
    this.fieldDisplays.updateMasks(this.currentField, this.transit?.next);
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
    return this.queueEffectCallback({ kind: 'shield', owner, gun, frame: 1, total: 25 });
  }
  scheduleShot(owner: Tank, gun: GunState, frames: number) {
    return this.queueEffectCallback({ owner, gun, total: frames, frame: 1 });
  }
  private carrierRequest(carrier: PendingEffect): EffectRequest {
    this.effectEngine.constructCarrier(carrier);
    return {
      clip: carrier,
      x: 0,
      y: 0,
      name: carrier.kind === 'shield' ? 'top' : 'bottom',
      randomRotation: false,
      callback: () => {
        if (
          carrier.owner.dead ||
          (carrier.owner.side === 'player' && carrier.owner !== this.player)
        )
          return;
        if (carrier.kind === 'shield') killMountedShield(carrier.owner, carrier.gun);
        else {
          if (this.screenShake) this.mainEffects.shake(20);
          this.mainEffects.flash();
          this.spawnVolley(carrier.owner, carrier.gun, WEAPONS[3008]);
        }
      },
    };
  }
  private queueEffectCallback(carrier: PendingEffect) {
    // Both source weapons explicitly call objWorld.currentBFTarget, even while
    // a next-field actor is running after the outgoing field's tail.
    this.runtimeFor(this.currentField).queueEffect(this.carrierRequest(carrier));
    return carrier;
  }
  /** Explicit CreateEffect adapter for host controls; gameplay uses the field queue. */
  registerEffectCallback(carrier: PendingEffect) {
    this.registerEffectRequest(this.carrierRequest(carrier));
    return carrier;
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
    if (t.side === 'enemy') this.dropBubbles(t, t.design.reward);
    this.emit(t.side === 'ally' ? 'death' : 'pop');
    if (t.side === 'enemy' && t.status.infect > 0)
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
    this.deactivateNpc(t);
  }
  /** _-Zx.Deactivate: primary finals precede data clearing, dead flag and field callback. */
  private deactivateNpc(t: Tank) {
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
    for (const b of this.bullets)
      if (b.owner === t.uid && ['beam', 'whip'].includes(b.kind)) b.dead = true;
    deactivateTankData(t);
    t.dead = true;
    if (t.side === 'enemy') {
      this.stats.kills++;
      this.runtimeFor(this.callbackFields.get(t) ?? this.field).enemyRemovals.push(t);
    } else this.runtimeFor(this.callbackFields.get(t) ?? this.field).allyRemovals.push(t);
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
      if (this.actorParents.hasParent(tank) && !this.actorParents.inField(tank, this.field))
        throw new FieldChildRemovalError();
      this.actorParents.detach(tank);
      this.field.enemies.splice(index, 1);
    }
    runtime.enemyRemovals = [];
  }
  dropBubbles(pos: Vec, amount: number) {
    spawnPickups(
      this,
      pos,
      amount,
      this.runtimeFor(this.currentField).pickups,
      false,
      this.currentField,
    );
  }
  private completeField(field: Field, visit: FieldVisit) {
    if (!visit.canComplete(field)) return;
    // _-0D calls World.CompletedABubblefield before _-K2, _-FR, map and wipe writes.
    this.stats.completed++;
    this.revision++;
    // CompletedABubblefield checks the current wrapper, even if the next one called it.
    if (this.currentField.boss && !this.bossDefeated) {
      this.bossDefeated = true;
      if (this.flow.state === 'playing') {
        this.flow.openWin();
        this.backgroundState(false);
        this.onWinScreenOpen();
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
    const runtime = this.runtimeFor(field);
    for (const b of runtime.pickups) b.forced = true;
    this.editSlider.trigger(this.progression.level, this.mapMode);
    visit.completed = true;
    field.cleared = true;
    const dot = this.fields.get(`${this.mapPosition.col},${this.mapPosition.row}`);
    if (dot) dot.cleared = true;
    for (const b of runtime.bullets)
      if (b.enemy && (['mine', 'seekerMine'].includes(b.kind) || projectileFlags(b).seeker))
        b.wipe = true;
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
        this.offers = this.getOffers();
        this.flow.openUpgrade();
        this.backgroundState(false);
        this.onUpgradeMenuOpen();
        this.revision++;
      }
    }
  }
  getOffers(): TankDesign[] {
    const current = this.player.design.classId,
      level = this.progression.level;
    this.partUnlocks.unlockThrough(level);
    const offers: TankDesign[] = [];
    const library = [...AVATARS, ...this.avatarLibrary];
    for (const classId of upgradeClasses(current)) {
      // The fresh source profile rolls its default-vs-server preference even
      // though both routes reach GetDefaultTank when retired search is unavailable.
      this.rng.int(1, 2);
      const tank = defaultUpgradeTank(library, classId, level);
      if (tank) offers.push(tank);
    }
    return offers;
  }
  /** Headless choice adapter; the browser separates placement from presentation completion. */
  selectUpgrade(design: TankDesign) {
    if (!this.placeUpgrade(design)) return;
    this.finishUpgrade();
  }
  /** ViewerUp places the avatar before starting its retained presentation reversal. */
  placeUpgrade(design: TankDesign) {
    if (this.mode !== 'upgrade') return false;
    this.progression.history[this.progression.level] = design;
    this.rebuildPlayer(design);
    this.onProgression([...this.progression.history]);
    this.revision++;
    return true;
  }
  /** Destroy restores the shared saved mode only after presentation completes. */
  finishUpgrade() {
    this.flow.closeUpgrade();
    this.backgroundState(true);
    this.offers = [];
    this.revision++;
  }
  continueAfterWin() {
    if (!this.flow.closeWin()) return;
    this.backgroundState(true);
    this.revision++;
  }
  editPlayer(design: TankDesign) {
    this.progression.history[this.progression.level] = design;
    this.rebuildPlayer(design);
    this.onProgression([...this.progression.history]);
    this.revision++;
  }
  get canEdit() {
    return (
      !this.transit &&
      this.editSlider.enabled &&
      this.progression.level >= 1 &&
      this.mode === 'playing'
    );
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
    this.actorParents.setAvatar(this.player);
    this.player.rotation = old.rotation;
    this.player.velocity = { ...old.velocity };
    this.fieldDisplays.updateAvatar(
      this.player,
      this.currentField,
      this.transit?.next,
      this.stats.frames,
    );
    this.secondaryCounter = 0;
    this.revision++;
    // PlaceAvatar tests only replacement avatars, including edits and downgrades.
    if (
      !this.secondaryHelpSeen &&
      this.player.guns.some((g) => Math.floor(g.part.type / 1000) === 3)
    ) {
      this.secondaryHelpSeen = true;
      this.flow.openSecondaryHelp();
      this.onSecondaryHelp();
    }
  }
  closeSecondaryHelp() {
    if (this.flow.closeSecondaryHelp()) this.revision++;
  }
  /** _-Zx.Damage handles a level-zero lethal hit synchronously, before pickups run. */
  escapeAtLevelZero() {
    this.player.life = 1;
    this.jump(nearestExit(this.avatarPosition()), true);
  }
  jump(dir: Vec, deadhead = false, { finalizeParts = true }: { finalizeParts?: boolean } = {}) {
    const stopShoot = this.transit?.stopShoot ?? false;
    const tutorial = tutorialForAttachment(this.stats.visited);
    this.previousMapPosition = { ...this.mapPosition };
    let col = this.mapPosition.col + dir.x,
      row = this.mapPosition.row + dir.y;
    let stored = this.cache.get(col, row);
    // Only Apocalypse's destroyed fields are holes; ordinary cleared fields remain destinations.
    while (stored?.destroyed) {
      col += dir.x;
      row += dir.y;
      stored = this.cache.get(col, row);
    }
    // AttachNewBubblefield constructs1551 and its actor-layer tutorial before
    // either _-WZ population or _-G0 cached reparenting, and before all setters.
    const next: Field = {
      col,
      row,
      scale: 1,
      boss: false,
      cleared: false,
      tutorial,
      enemies: [],
    };
    this.fieldDisplays.create(next);
    if (!stored) {
      const boss =
        !deadhead && !this.bossTriggered && this.player.life >= 1000 && this.progression.level >= 5;
      const wave = boss
        ? rollBossWave(this.rng)
        : rollWave(deadhead ? -1 : Math.hypot(col, row), this.rng, this.localTanks, this.roster);
      if (boss) this.bossTriggered = true;
      next.scale = wave.scale;
      next.boss = boss;
      for (const design of wave.designs) {
        const t = createTank(this.nextId(), design, 'enemy', 0, 0, undefined, undefined, this);
        // _-Ar finishes Setup, then samples with authored BF_BG scale1.
        t.x = this.rng.int(-200, 200);
        t.y = this.rng.int(-200, 200);
        t.rotation = this.rng.int(-180, 180);
        this.attachActor(t, next);
        next.enemies.push(t);
      }
      this.stats.visited++;
      if (this.stats.visited === 100) this.award('Explorer');
    } else {
      next.scale = stored.scale;
      next.cleared = this.fields.get(`${col},${row}`)?.cleared ?? false;
      next.enemies = this.cache.restore(stored);
      for (const tank of next.enemies) this.attachActor(tank, next);
      // _-0D._-G0 resets only offensive primary movTarget on cached attachment.
      for (const enemy of next.enemies)
        if (enemy.dataActive)
          for (const gun of enemy.guns)
            if (Math.floor(gun.part.type / 1000) !== 3 && gun.targeting) {
              gun.targeting.target = this.player;
              if (gun.part.type === 4032) gun.turretTarget = this.player;
            }
    }
    this.mapPosition = { col, row };
    this.fields.set(`${col},${row}`, next);
    this.connections.set(fieldConnectionKey(this.previousMapPosition, this.mapPosition), {
      from: { ...this.previousMapPosition },
      to: { ...this.mapPosition },
    });
    // Reattachment constructs a new bfStartDisplay even when the stored field already exists.
    next.tutorial = tutorial;
    this.fieldDisplays.setupChildren(next, next.scale);
    const spacing =
      fieldGeometry.transitDiameter * next.scale +
      Math.trunc((fieldGeometry.transitDiameter * (this.currentField.scale - next.scale)) / 2) -
      4;
    this.roster.update(Math.hypot(col, row));
    const offset = { x: dir.x * spacing, y: dir.y * spacing };
    const entry = 317 * next.scale; // BF_over_detail_mc markers: ±6340 twips.
    if (this.transit) {
      const player = this.avatarPosition();
      this.fieldDisplays.orphan(this.transit.next);
      this.orphaned.push({
        field: this.transit.next,
        screen: {
          x: this.transit.offset.x - player.x,
          y: this.transit.offset.y - player.y,
        },
      });
    }
    this.transit = {
      next,
      visit: new FieldVisit(),
      offset,
      target: { x: offset.x - dir.x * entry, y: offset.y - dir.y * entry },
      direction: dir,
      age: 0,
      stopShoot,
    };
    const currentRoot = this.fieldDisplays.read(this.currentField).root.pose;
    this.fieldDisplays.attach(next, { x: currentRoot.x + offset.x, y: currentRoot.y + offset.y });
    this.fieldDisplays.attachBottom(next);
    this.effectEngine.createFieldLayers(next);
    this.worldDisplays.construct(next, this.currentField);
    if (!next.enemies.length) this.editSlider.trigger(this.progression.level, this.mapMode);
    else if (this.editSlider.atRest) this.editSlider.hide();
    this.flow.cross();
    // _-ZY performs these caller-owned writes/finals only after _-1E attached
    // the field and enabled the birth gate. Death and Destroy call _-1E directly.
    if (!deadhead && finalizeParts) {
      this.transit.stopShoot = true;
      this.wallTimers.cancel(this.player.uid);
      this.stopPrimaryFire();
      this.tacticalHud.clearPassives();
      detachForcefield(this.player);
    }
    this.emit('jump');
    this.revision++;
  }
  private tickTransit() {
    const tr = this.transit;
    if (!tr) throw new CrossingTargetReadError();
    tr.age++;
    // The marker belongs to next.BF_over_detail_mc; the avatar belongs to World.
    // Both original Point calls truncate separately, including fractional Main motion.
    const stage = displayMatrixPoint(
      this.worldDisplays.fieldMatrix(tr.next, this.mainEffects.position, 'detail'),
      { x: displayTwips(-317 * tr.direction.x), y: displayTwips(-317 * tr.direction.y) },
    );
    const inverse = inverseDisplayMatrix(
      this.worldDisplays.worldMatrix(this.mainEffects.position),
    )!;
    const target = displayMatrixPoint(inverse, stage);
    const avatar = this.fieldDisplays.readAvatar().pose;
    const dx = target.x / 20 - avatar.x,
      dy = target.y / 20 - avatar.y;
    if (dx * dx + dy * dy < 25) {
      const outgoingField = this.currentField;
      this.actorParents.sync(this);
      // _-4j clears the engine before Deactivate/cache writes and layer promotion.
      this.effectEngine.clear();
      this.effectEngine.unregister('top');
      this.effectEngine.unregister('bottom');
      this.player.velocity = { x: 0, y: 0 };
      // Deactivate clears only a completed wrapper. An uncleared detached
      // wrapper retains its collections; neither wrapper itself enters the cache.
      if (this.fieldVisit.completed) {
        const outgoing = this.runtimeFor(this.currentField);
        for (const bullet of outgoing.bullets) bullet.dead = true;
        this.replaceBullets(outgoing, []);
        clearPickups(this, this.currentField);
        outgoing.enemyRemovals = [];
        outgoing.allyRemovals = [];
        // _-0D.Deactivate clears _-I4 only for a completed wrapper. Engine
        // clearing above is separate and must not erase an uncleared queue.
        outgoing.clearEffectQueue();
        this.currentField.enemies = [];
      }
      for (const kind of ['top', 'bottom'] as const)
        this.effectEngine.detachLayer(this.effectEngine.layer(this.currentField, kind)!);
      this.worldDisplays.detachLayers(this.currentField);
      this.fieldDisplays.detach(this.currentField);
      this.cache.store(
        this.currentField,
        this.previousMapPosition.col,
        this.previousMapPosition.row,
      );
      this.field = tr.next;
      this.effectEngine.register(this.effectEngine.layer(this.field, 'top')!);
      this.effectEngine.register(this.effectEngine.layer(this.field, 'bottom')!);
      this.worldDisplays.promote(outgoingField);
      this.targetLocks.clear();
      this.fieldVisit = tr.visit;
      this.player.shield = 0;
      this.player.shieldManaged = false;
      // CleanUpShield clears immunity only; clearing the effects engine skips
      // KillShield, so the old film remains attached until another trigger.
      for (const g of this.player.guns) g.counter = 0;
      this.transit = null;
      this.fieldDisplays.arrive(this.currentField);
      this.projectAvatar(this.currentField);
      this.flow.arrive();
      this.revision++;
    } else {
      const angle = (360 * Math.atan2(dy, dx)) / (2 * Math.PI),
        speed = (Math.sqrt(dx * dx + dy * dy) / 10) * 0.9,
        moveX = Math.cos((Math.PI * angle) / 180) * speed,
        moveY = Math.sin((Math.PI * angle) / 180) * speed;
      this.fieldDisplays.moveCurrent(this.currentField, { x: moveX, y: moveY });
      this.projectAvatar(this.currentField);
      this.onCameraMove(moveX, moveY);
      this.fieldDisplays.moveNext(this.currentField, tr.next, tr.offset, this.stats.frames);
      this.worldDisplays.follow(this.currentField, tr.next);
      this.fieldDisplays.updateMasks(this.currentField, tr.next);
    }
  }
  addEffect(pos: Vec, kind: Effect['kind'], radius: number, color: number, duration: number) {
    this.effectEngine.create(
      {
        uid: this.nextId(),
        x: pos.x,
        y: pos.y,
        kind,
        radius,
        color,
        duration,
        age: 0,
      },
      'top',
      this.currentField,
    );
  }
  addCombatEffect(
    pos: Vec,
    kind: CombatEffect,
    options: EffectOptions = {},
    immediate = false,
    queueField = this.field,
    callback?: () => void,
  ) {
    const effect = combatEffect(this.nextId(), kind, options, this.effectEngine.artwork);
    const request = this.effectRequest(effect, pos, callback);
    if (immediate) this.registerEffectRequest(request);
    else this.runtimeFor(queueField).queueEffect(request);
    return effect;
  }
  private effectRequest(
    effect: Effect,
    position: Vec = effect,
    callback?: () => void,
  ): EffectRequest {
    return {
      clip: effect,
      x: position.x,
      y: position.y,
      name: effect.layer ?? 'top',
      randomRotation: effect.randomRotation ?? false,
      callback,
    };
  }
  queueEffect(effect: Effect, field = this.field) {
    this.runtimeFor(field).queueEffect(this.effectRequest(effect));
  }
  private registerEffectRequest(request: EffectRequest) {
    this.effectEngine.createRequest(request, this.currentField, () => this.rng.next());
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
      t.displayChildren.includes(`part:${p.key}`) &&
      !t.removedParts.has(p.key) &&
      Math.hypot(local.x - p.x, local.y - p.y) < p.radius * p.scale,
  );
}
