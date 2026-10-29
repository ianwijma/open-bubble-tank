import type { SwfClip } from '../assets/swf-clip';

export interface Vec {
  x: number;
  y: number;
}
/** Direct _-Zx children; attached status marks form one contiguous group. */
export type TankChild =
  | `part:${string}`
  | `shield-hit:${string}`
  | `shield-film:${string}`
  | 'forcefield'
  | 'shield-hit'
  | 'shield-film'
  | 'infection'
  | 'status';
export interface ShieldClip {
  key: `shield-hit:${string}` | `shield-film:${string}`;
  kind: 'hit' | 'film';
  style: 'mounted' | 'turret';
  diameter: number;
  age: number;
  angle: number;
}
export interface Rect extends Vec {
  width: number;
  height: number;
  /** An authored display list with no geometry cannot contact another clip. */
  empty?: boolean;
}
export type MineReference = Projectile | null | { mc: Projectile | null; x: number; y: number };
export interface TankPart extends Vec {
  key: string;
  type: number;
  twin: string;
  rotation: number;
  scale: number;
  radius: number;
}
export interface TankDesign {
  /** Original encoded identity, retained for source wave-roster lookups. */
  sourceCode?: string;
  id: string;
  name: string;
  author: string;
  avatar: boolean;
  classId: number;
  life: number;
  reward: number;
  speed: number;
  difficulty: number;
  parts: TankPart[];
}
export interface PartDefinition {
  id: number;
  name: string;
  shortName: string;
  pluralName: string;
  symbol: number;
  gp: number;
  bp: number;
  classCost: number;
  lower: boolean;
  tier: number;
  summary: string;
  flavor: string;
}
export type Status = 'stun' | 'jam' | 'sticky' | 'ink' | 'weaken' | 'infect';
export type DecoratedStatus = 'stun' | 'jam' | 'sticky' | 'weaken';
export interface StatusDecoration {
  kind: DecoratedStatus;
  age: number;
  artAge: number;
  duration: number;
  marks: (Vec & { angle: number; frame: number })[];
}
export interface GunState {
  part: TankPart;
  counter: number;
  angle: number;
  burst: number;
  burstTimer: number;
  autoTargetId?: number | null;
  rotatingCycle?: { remaining: number; active: boolean };
  suppressionCycle?: { delay: number; spacing: number };
  turretId?: number;
  turretRefs?: Projectile[];
  spawnDesign?: TankDesign;
  patientId?: number;
  beamId?: number;
  shieldDiameter?: number;
  shieldFilm?: ShieldClip;
  shieldGeneration?: number;
  mineRefs?: MineReference[];
  /** Latest non-overlapping mounted MovieClip.play episode, in stage-art ages. */
  mountedPlay?: { child: string; age: number; frames: number };
}
export interface Tank extends Vec {
  /** The source caches strTankCode at birth, independently of mutable live data. */
  rosterIdentity: string;
  uid: number;
  design: TankDesign;
  side: 'player' | 'enemy' | 'ally';
  rotation: number;
  life: number;
  maxLife: number;
  radius: number;
  velocity: Vec;
  guns: GunState[];
  status: Record<Status, number>;
  statusDecoration?: StatusDecoration;
  infectCounter: number;
  infectStartedAt: number;
  infectionAngle: number;
  stunned: boolean;
  shield: number;
  shieldAge: number;
  shieldDiameter?: number;
  shieldHitDiameter?: number;
  shieldManaged?: boolean;
  shieldHitAge: number;
  shieldHitAngle: number;
  /** AGunShield instances are independent; movShieldHit points to the newest hit. */
  shieldClips: ShieldClip[];
  shieldHitClip?: ShieldClip;
  teleportReady: boolean;
  hurtCounter: number;
  forcefield: number;
  forcefieldReady: boolean;
  forcefieldCounter: number;
  forcefieldFrame: number;
  forcefieldAngle: number;
  /** APassiveForcefield wrapper identity and its independent stage-clock origin. */
  forcefieldAttached: boolean;
  forcefieldGeneration: number;
  forcefieldStartedAt: number;
  /** Source direct-child order; browser objects remain renderer-owned. */
  displayChildren: TankChild[];
  age: number;
  /** Attached artwork stage ticks, independent of gameplay Run. */
  artAge: number;
  turnFrames: number;
  turnRate: number;
  holdTurn: number;
  phase: number;
  alpha: number;
  targetId: number | null;
  hiddenParts: Set<string>;
  removedParts: Set<string>;
  degradation: { debt: number; total: number; minimum: number };
  dead: boolean;
}
export type ProjectileKind =
  | 'shell'
  | 'seeker'
  | 'pierce'
  | 'ricochet'
  | 'leech'
  | 'grow'
  | 'push'
  | 'rocket'
  | 'mine'
  | 'seekerMine'
  | 'spin'
  | 'infect'
  | 'star'
  | 'apocalypse'
  | 'beam'
  | 'healBeam'
  | 'whip'
  | 'buster'
  | 'flak'
  | 'sapper'
  | 'orbital'
  | 'turret'
  | 'builder';
export interface Projectile extends Vec {
  uid: number;
  owner: number;
  enemy: boolean;
  kind: ProjectileKind;
  angle: number;
  heading: number;
  speed: number;
  damage: number;
  radius: number;
  age: number;
  life: number;
  status?: Status;
  explode: number;
  targetId: number | null;
  hit: Set<number>;
  /** Source _-MB: wall-miss exemption, independent of remembered contact IDs. */
  missExempt?: boolean;
  dead: boolean;
  anchor?: GunState;
  symbol: number;
  artScale?: number;
  partType?: number;
  artFrame?: number;
  /** Pure retained display-list pose, shared by stage playback, painting and contact. */
  artPose?: SwfClip;
  artAlpha?: number;
  wobbleFrequency?: number;
  wobbleAmplitude?: number;
  orbit: number;
  health?: number;
  build?: number;
  origin?: Vec;
  splashDamage?: number;
  bounces?: number;
  returning?: boolean;
  scatter?: number;
  detonating?: number;
  beamLength?: number;
  contactFrames?: number;
  stopped?: boolean;
  motion?: Vec;
  trailCounter?: number;
  trailPoint?: Vec;
  deflected?: Vec;
  removeAfterFrame?: boolean;
  infectionTries?: number;
  mineState?: { armed: boolean; movement: Vec };
  wipe?: boolean;
  readyForDelete?: boolean;
}
export interface Pickup extends Vec {
  uid: number;
  rotation: number;
  scattering: boolean;
  collected: boolean;
  value: number;
  vx: number;
  vy: number;
  forced: boolean;
  dead: boolean;
}
export interface Effect extends Vec {
  uid: number;
  kind: 'pop' | 'burst' | 'shield' | 'warp' | 'hit' | 'smoke' | 'native';
  age: number;
  duration: number;
  radius: number;
  color: number;
  symbol?: number;
  layer?: 'top' | 'bottom' | 'screen';
  rotation?: number;
  scale?: number;
  randomRotation?: boolean;
  line?: Vec;
  /** A controller-owned authored frame; ordinary effect clips use their stage age. */
  frame?: number;
  blendMode?: 'layer';
}
export interface Field {
  col: number;
  row: number;
  scale: number;
  enemies: Tank[];
  cleared: boolean;
  boss: boolean;
  tutorial: number;
  destroyed?: boolean;
}
export type WorldMode =
  'playing' | 'paused' | 'secondary-help' | 'upgrade' | 'transit' | 'won' | 'collapse';
export interface InputFrame {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  secondary: boolean;
  aim: Vec;
}
export interface Stats {
  damageDone: number;
  enemyShots: number;
  friendlyMissed: number;
  enemyMissed: number;
  kills: number;
  deadheads: number;
  fighters: number;
  sumo: number;
  collected: number;
  completed: number;
  visited: number;
  shots: number;
  frames: number;
}
export interface Progression {
  level: number;
  history: TankDesign[];
}
export interface Settings {
  zoom: number;
  sound: boolean;
  music: boolean;
  shake: boolean;
  fps: 35 | 50 | 65 | 90;
  /** Main.mainFPS is saved separately from the live Stage.frameRate. */
  mainFps: 35 | 50 | 65;
  quality: 'high' | 'medium' | 'low';
  efficient: boolean;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
}
export interface Profile {
  version: 1;
  secondaryHelpSeen: boolean;
  progression: TankDesign[];
  tanks: TankDesign[];
  settings: Settings;
  achievements: string[];
  nextTankId: number;
}
export interface WorldEvent {
  type:
    | 'shoot'
    | 'hit'
    | 'hurt'
    | 'pop'
    | 'collect'
    | 'death'
    | 'upgrade'
    | 'jump'
    | 'win'
    | 'achievement';
  value?: string;
}
export type CollisionTest = (tank: Tank, x: number, y: number) => boolean;
