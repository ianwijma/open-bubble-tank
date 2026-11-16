import { PARTS, partById } from '../data/catalog';
import { CREDITS } from '../core/credits-screen';
import { svgMaskDefinition } from './svg-mask';
import { mockCreditsLeaf } from './mock-credits';
import type { Projectile, Rect, Tank, TankDesign, TankPart } from '../core/types';
import { Random, rotate } from '../core/math';
import { SwfClip } from './swf-clip';
import { partSnapshot } from './part-snapshot';
import { MountedParts, PartPlayback } from './part-playback';
import { observeActorArtwork, readActorArtworkPhase } from '../core/actor-artwork';
import {
  mockProjectileBounds,
  scriptBounds,
  scriptTwipBounds,
  type ScriptBoundsSource,
} from './projectile-bounds';
import { protectionRadius } from '../core/protection-size';
import { DisplayListCache } from './display-list';
import { mockPart, mockPartLeaf, mockPartLeafHit } from './mock-part';
import {
  CONTACT_IDENTITY,
  contactTransform,
  descendContact,
  type ContactMatrix,
} from './contact-transform';
import mockPartTimelines from '../data/mock-part-timelines.json';
import attachmentGeometry from '../data/attachment-geometry.json';
import { tankScriptBounds } from './tank-bounds';
import { StatusPlayback } from './status-playback';
import { mockProjectileHit } from './mock-projectile';
import { authoredProjectileBounds } from './projectile-geometry';
import { INFECTED_ART } from '../data/status-art';

export interface Bounds extends Rect {}
export interface Raster extends Bounds {
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
  resolution: number;
  url: string;
}
export interface SwfMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}
type Matrix = SwfMatrix;
export interface SwfGlowFilter {
  kind: 'glow';
  color: number[];
  blurX: number;
  blurY: number;
  strength: number;
  inner: boolean;
  knockout: boolean;
  compositeSource: boolean;
  passes: number;
}
export interface Placement {
  depth: number;
  charId?: number;
  matrix?: Matrix;
  color?: { mult: number[]; add: number[] };
  frame: number;
  remove?: boolean;
  clipDepth?: number;
  name?: string;
  ratio?: number;
  blendMode?: number;
  cacheAsBitmap?: number;
  filters?: SwfGlowFilter[];
}
export interface DisplayPlacement extends Placement {
  charId: number;
  matrix: Matrix;
  bornFrame: number;
}
export interface SpriteInfo {
  id: number;
  frameCount: number;
  placements: Placement[];
}
interface ShapeInfo {
  id: number;
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
}
const identity: Matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
function union(bounds: Bounds[]): Bounds {
  if (!bounds.length) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.min(...bounds.map((b) => b.x)),
    y = Math.min(...bounds.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...bounds.map((b) => b.x + b.width)) - x,
    height: Math.max(...bounds.map((b) => b.y + b.height)) - y,
  };
}
function intersect(a: Bounds, b: Bounds): Bounds {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}
function transformBounds(b: Bounds, m: Matrix): Bounds {
  const ps = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height],
  ].map(([x, y]) => ({ x: x * m.a + y * m.c + m.tx / 20, y: x * m.b + y * m.d + m.ty / 20 }));
  const x = Math.min(...ps.map((p) => p.x)),
    y = Math.min(...ps.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...ps.map((p) => p.x)) - x,
    height: Math.max(...ps.map((p) => p.y)) - y,
  };
}
function matrixAttr(m: Matrix) {
  return `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.tx / 20} ${m.ty / 20})`;
}

export class AssetPack {
  readonly mode: 'mock';
  frames = new Map<number, Raster[]>();
  extras = new Map<number, Raster>();
  uiFrames = new Map<number, Raster[]>();
  creatorFrames = new Map<string, Raster>();
  leaves = new Map<number, Raster>();
  private sprites = new Map<number, SpriteInfo>();
  private shapes = new Map<number, ShapeInfo>();
  private displayCache = new DisplayListCache();
  private classFrames = new Map<number, Raster>();
  private classPoses = new Map<number, SwfClip>();
  private positivePosters = new Map<number, Raster>();
  private partClips = new WeakMap<Tank, MountedParts>();
  private infections = new WeakMap<Tank, { startedAt: number; clip: SwfClip }>();
  private statuses = new StatusPlayback(this);
  private forcefieldClones = new WeakMap<
    Tank,
    {
      design: TankDesign;
      generation: number;
      parts: Map<string, SwfClip>;
      radius: number;
    }
  >();
  private scriptGeometry: ScriptBoundsSource = {
    leafBounds: (id) => {
      const rect = this.shapes.get(id)?.bounds;
      return rect
        ? {
            x: rect.xMin / 20,
            y: rect.yMin / 20,
            width: (rect.xMax - rect.xMin) / 20,
            height: (rect.yMax - rect.yMin) / 20,
          }
        : undefined;
    },
    displayList: (id, age) => this.displayList(id, age),
    childAge: (id, age, p) => this.childAge(id, age, p),
  };
  constructor(mode: 'mock') {
    this.mode = mode;
  }
  static async mock(onProgress: (n: number, label: string) => void = () => {}) {
    const pack = new AssetPack('mock');
    pack.sprites = new Map(mockPartTimelines.sprites.map((s) => [s.id, s as SpriteInfo]));
    pack.shapes = new Map(mockPartTimelines.shapes.map((s) => [s.id, s]));
    // Numeric bounds/playback; procedural mock paint remains separate.
    for (const sprite of attachmentGeometry.sprites)
      pack.sprites.set(sprite.id, sprite as SpriteInfo);
    for (const shape of attachmentGeometry.shapes) pack.shapes.set(shape.id, shape);
    for (const sprite of CREDITS.sprites) pack.sprites.set(sprite.id, sprite as SpriteInfo);
    for (const shape of CREDITS.shapes) pack.shapes.set(shape.id, shape);
    for (const leaf of [...CREDITS.shapes, ...CREDITS.texts]) {
      const b = leaf.bounds;
      const bounds =
        'xMin' in b
          ? {
              x: b.xMin / 20,
              y: b.yMin / 20,
              width: (b.xMax - b.xMin) / 20,
              height: (b.yMax - b.yMin) / 20,
            }
          : b;
      pack.leaves.set(leaf.id, mockCreditsLeaf(leaf.id, bounds));
    }
    for (const { id, bounds: b } of mockPartTimelines.shapes) {
      const raster = mockPartLeaf(id, {
        x: b.xMin / 20,
        y: b.yMin / 20,
        width: (b.xMax - b.xMin) / 20,
        height: (b.yMax - b.yMin) / 20,
      });
      if (raster) pack.leaves.set(id, raster);
    }
    for (const [i, part] of PARTS.entries()) {
      if (part.id < 2000) {
        const pose = partSnapshot(part, pack),
          poster = await pack.rasterClip(pose);
        if (!poster && pose.placements.length)
          throw new Error(`No procedural body poster for ${part.id}.`);
        pack.frames.set(part.id, [poster ?? emptyRaster()]);
        const positive = partSnapshot(part, pack, 'poster', 1);
        if (positive.frame !== pose.frame) {
          const variant = await pack.rasterClip(positive);
          if (variant) pack.positivePosters.set(part.id, variant);
        }
        const classPose = partSnapshot(part, pack, 'class');
        pack.classPoses.set(part.id, classPose);
        const sample = await pack.rasterClip(classPose);
        if (sample) pack.classFrames.set(part.id, sample);
      } else pack.frames.set(part.id, [mockPart(part.id)]);
      onProgress((i + 1) / PARTS.length, 'Drawing mock bubbles');
    }
    return pack;
  }
  private compile(
    id: number,
    frame = 1,
    seen = new Set<number>(),
    pose?: SwfClip,
  ): { body: string; bounds: Bounds } | null {
    if (seen.has(id) || seen.size > 24) return null;
    const next = new Set(seen);
    next.add(id);
    const procedural = this.leaves.get(id);
    if (procedural) {
      const b = this.shapes.get(id)?.bounds;
      return {
        body: `<image x="${procedural.x}" y="${procedural.y}" width="${procedural.width}" height="${procedural.height}" xlink:href="${procedural.url}"/>`,
        bounds: b
          ? {
              x: b.xMin / 20,
              y: b.yMin / 20,
              width: (b.xMax - b.xMin) / 20,
              height: (b.yMax - b.yMin) / 20,
            }
          : procedural,
      };
    }
    if (!this.sprites.has(id)) return null;
    const placements = pose?.placements ?? this.displayList(id, frame);
    const children: { body: string; bounds: Bounds }[] = [];
    const masks: { id: string; depth: number; end: number; bounds: Bounds; body: string }[] = [];
    for (const p of placements) {
      const childPose = pose?.children.get(p.depth)?.clip;
      const m = p.matrix ?? identity;
      const child = this.compile(p.charId, frame, next, childPose);
      if (!child) continue;
      if (p.clipDepth !== undefined) {
        masks.push({
          id: `mask${id}_${p.depth}_${seen.size}`,
          depth: p.depth,
          end: p.clipDepth,
          bounds: transformBounds(child.bounds, m),
          body: `<g transform="${matrixAttr(m)}">${child.body}</g>`,
        });
        continue;
      }
      let attrs = `transform="${matrixAttr(m)}"`,
        filter = '';
      if (p.color) {
        const { mult, add } = p.color;
        if (mult.slice(0, 3).every((n) => n === 1) && add.every((n) => n === 0))
          attrs += ` opacity="${mult[3]}"`;
        else {
          const fid = `cx${id}_${p.depth}_${seen.size}`;
          const values = [
            mult[0],
            0,
            0,
            0,
            add[0] / 255,
            0,
            mult[1],
            0,
            0,
            add[1] / 255,
            0,
            0,
            mult[2],
            0,
            add[2] / 255,
            0,
            0,
            0,
            mult[3],
            add[3] / 255,
          ].join(' ');
          filter = `<defs><filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${values}"/></filter></defs>`;
          attrs += ` filter="url(#${fid})"`;
        }
      }
      let body = `${filter}<g ${attrs}>${child.body}</g>`,
        bounds = transformBounds(child.bounds, m);
      for (const mask of masks.filter((mask) => p.depth > mask.depth && p.depth <= mask.end)) {
        body = `<g mask="url(#${mask.id})">${body}</g>`;
        bounds = intersect(bounds, mask.bounds);
      }
      if (bounds.width > 0 && bounds.height > 0) children.push({ body, bounds });
    }
    const definitions = masks.length
      ? `<defs>${masks.map((mask) => svgMaskDefinition(mask.id, mask.body, mask.bounds)).join('')}</defs>`
      : '';
    return children.length
      ? {
          body: definitions + children.map((c) => c.body).join(''),
          bounds: union(children.map((c) => c.bounds)),
        }
      : null;
  }
  async rasterSymbol(id: number, frame = 1): Promise<Raster | null> {
    return this.rasterCompiled(this.compile(id, frame));
  }
  /** Freeze each retained child at its own frame; raw rasterSymbol remains authored-frame access. */
  async rasterClip(clip: SwfClip): Promise<Raster | null> {
    return this.rasterCompiled(this.compile(clip.id, clip.frame, new Set(), clip));
  }
  private async rasterCompiled(compiled: { body: string; bounds: Bounds } | null) {
    if (!compiled) return null;
    const b = compiled.bounds;
    if (b.width <= 0 || b.height <= 0 || b.width > 2500 || b.height > 2500) return null;
    const pad = 2,
      bounds = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">${compiled.body}</svg>`;
    return rasterSvg(svg, bounds);
  }
  part(id: number, frame = 0, y = 0): Raster {
    id = id === 2013 ? 5003 : id;
    const variant = y > 0 && this.positivePosters.get(id);
    if (variant) return variant;
    const frames = this.frames.get(id) ?? this.frames.get(1001)!;
    return frames[Math.floor(frame / 5) % frames.length];
  }
  classBody(id: number) {
    return this.classFrames.get(id) ?? this.part(id);
  }
  classBodyBounds(part: TankPart) {
    const angle = (part.rotation * Math.PI) / 180;
    const matrix = {
      a: Math.cos(angle) * part.scale,
      b: Math.sin(angle) * part.scale,
      c: -Math.sin(angle) * part.scale,
      d: Math.cos(angle) * part.scale,
      tx: part.x * 20,
      ty: part.y * 20,
    };
    const pose = this.classPoses.get(part.type);
    if (pose)
      return scriptBounds(this.scriptGeometry, pose.id, pose.age, matrix, undefined, [], 0, pose);
    const raster = this.classBody(part.type),
      pad = 3;
    return transformBounds(
      {
        x: raster.x + pad,
        y: raster.y + pad,
        width: raster.width - pad * 2,
        height: raster.height - pad * 2,
      },
      matrix,
    );
  }
  spriteInfo(id: number) {
    return this.sprites.get(id);
  }
  hasPartTimeline(id: number) {
    const symbol = partById(id)?.symbol;
    return symbol !== undefined && this.sprites.has(symbol);
  }
  symbolBounds(id: number, frame = 1) {
    return this.compile(id, frame)?.bounds;
  }
  symbolScriptBounds(id: number, frame = 1) {
    return scriptBounds(this.scriptGeometry, id, frame);
  }
  displayList(id: number, age: number): DisplayPlacement[] {
    const sp = this.sprites.get(id);
    if (!sp) return [];
    return this.displayCache.get(sp, age);
  }
  childAge(parentId: number, age: number, p: DisplayPlacement) {
    const count = this.sprites.get(parentId)?.frameCount ?? 1;
    const local = count === 1 ? age : ((Math.max(1, Math.floor(age)) - 1) % count) + 1;
    const phase = this.sprites.get(p.charId)?.frameCount === 40 ? (p.depth + p.charId) % 11 : 0;
    return Math.max(1, local - p.bornFrame + 1) + phase;
  }
  partClip(tank: Tank, part: TankPart) {
    let owner = this.partClips.get(tank);
    if (!owner || owner.design !== tank.design) {
      owner = new MountedParts(tank.design);
      this.partClips.set(tank, owner);
      observeActorArtwork(tank, owner);
    }
    const state = readActorArtworkPhase(tank);
    const age = tank.artAge + 1;
    let playback = owner.parts.get(part.key)?.playback;
    if (!playback || (!state && playback.clip.age > age)) {
      // Painting/contact queries share a private stream rather than consuming gameplay RNG.
      playback = new PartPlayback(this.newPartClip(tank, part));
      owner.parts.set(part.key, { part, playback });
    }
    const play = tank.guns.find((g) => g.part.key === part.key)?.mountedPlay;
    if (state) return playback.present(state, part.y, play);
    return playback.advance(
      age,
      part.y,
      tank.guns.find((g) => g.part.key === part.key)?.mountedPlay,
    );
  }
  livePart(tank: Tank, part: TankPart) {
    return this.part(part.type, tank.artAge + tank.phase, part.y);
  }
  private newPartClip(tank: Tank, part: TankPart, clone = false) {
    let seed = Math.imul(tank.uid + 1, 0x9e3779b1) ^ (clone ? 0x46f13d : 0);
    if (clone) seed ^= Math.imul(tank.forcefieldGeneration, 0x85ebca6b);
    for (const c of part.key) seed = Math.imul(seed, 31) + c.charCodeAt(0);
    const random = new Random(seed >>> 0 || 1);
    return new SwfClip(partById(part.type)!.symbol, this, () => random.next());
  }
  private partSize(tank: Tank, part: TankPart, pose?: SwfClip, clone = false) {
    const angle =
      ((clone
        ? part.rotation
        : (tank.guns.find((g) => g.part.key === part.key)?.angle ?? part.rotation)) *
        Math.PI) /
      180;
    const matrix = {
      a: Math.cos(angle) * part.scale,
      b: Math.sin(angle) * part.scale,
      c: -Math.sin(angle) * part.scale,
      d: Math.cos(angle) * part.scale,
      tx: 0,
      ty: 0,
    };
    if (this.hasPartTimeline(part.type)) {
      const bounds = scriptBounds(
        this.scriptGeometry,
        partById(part.type)!.symbol,
        pose?.age ?? 1,
        matrix,
        undefined,
        [],
        0,
        pose,
      );
      return { width: bounds?.width ?? 0, height: bounds?.height ?? 0 };
    }
    const bounds = clone ? this.part(part.type) : this.livePart(tank, part);
    return {
      width: Math.abs(matrix.a) * bounds.width + Math.abs(matrix.c) * bounds.height,
      height: Math.abs(matrix.b) * bounds.width + Math.abs(matrix.d) * bounds.height,
    };
  }
  protectionRadius = (tank: Tank) =>
    protectionRadius(
      tank.design.parts
        .filter((p) => !tank.removedParts.has(p.key))
        .map((p) => ({
          x: p.x,
          y: p.y,
          ...this.partSize(
            tank,
            p,
            this.hasPartTimeline(p.type) ? this.partClip(tank, p) : undefined,
          ),
        })),
    );
  private forcefieldClone(tank: Tank) {
    let clone = this.forcefieldClones.get(tank);
    if (!clone || clone.design !== tank.design || clone.generation !== tank.forcefieldGeneration) {
      const parts = new Map<string, SwfClip>();
      const children = tank.design.parts.map((part) => {
        const pose = this.hasPartTimeline(part.type)
          ? this.newPartClip(tank, part, true)
          : undefined;
        pose?.advance(1, part.y);
        if (pose) parts.set(part.key, pose);
        return { x: part.x, y: part.y, ...this.partSize(tank, part, pose, true) };
      });
      clone = {
        design: tank.design,
        generation: tank.forcefieldGeneration,
        parts,
        radius: protectionRadius(children),
      };
      this.forcefieldClones.set(tank, clone);
    }
    return clone;
  }
  forcefieldRadius(tank: Tank) {
    return this.forcefieldClone(tank).radius;
  }
  forcefieldPartClip(tank: Tank, part: TankPart) {
    const pose = this.forcefieldClone(tank).parts.get(part.key)!;
    pose.advance(tank.artAge - tank.forcefieldStartedAt + 1, part.y);
    return pose;
  }
  /** Exact width/height bounds for a qualified retained clip and its parent-space matrix.
   * Separate from legacy continuous metrics; field population/ownership is the caller's work.
   */
  clipScriptTwipBounds(pose: SwfClip, matrix?: SwfMatrix) {
    return scriptTwipBounds(this.scriptGeometry, pose.id, pose.age, matrix, undefined, [], 0, pose);
  }
  clipScriptBounds(pose: SwfClip) {
    return scriptBounds(this.scriptGeometry, pose.id, pose.age, undefined, undefined, [], 0, pose);
  }
  tankDisplayBounds = (tank: Tank) =>
    tankScriptBounds(tank, this.scriptGeometry, {
      part: (t, p) => (this.hasPartTimeline(p.type) ? this.partClip(t, p) : undefined),
      status: (t, i) => this.statusClip(t, i),
      infection: (t) => this.infectionClip(t),
      forcefieldPart: (t, p) => this.forcefieldPartClip(t, p),
      forcefieldRadius: (t) => this.forcefieldRadius(t),
      protectionRadius: (t) => this.protectionRadius(t),
    });
  tankDisplayWidth = (tank: Tank) => this.tankDisplayBounds(tank)?.width ?? 0;
  /** Stopped root frames retain independent children; stun roots keep playing. */
  statusClip(tank: Tank, index: number) {
    return this.statuses.clip(tank, index);
  }
  /** Nine independently initialized infectedbubblepop_398 clips share paint/contact identity. */
  infectionClip(tank: Tank) {
    const age = tank.artAge - tank.infectStartedAt + 1;
    let state = this.infections.get(tank);
    if (!state || state.startedAt !== tank.infectStartedAt || state.clip.age > age) {
      const random = new Random(
        (Math.imul(tank.uid + 1, 0x9e3779b1) ^ tank.infectStartedAt ^ 0x1f3ec7ed) >>> 0 || 1,
      );
      state = {
        startedAt: tank.infectStartedAt,
        clip: new SwfClip(INFECTED_ART, this, () => random.next()),
      };
      this.infections.set(tank, state);
    }
    state.clip.advance(age);
    return state.clip;
  }
  private leafContact(id: number, x: number, y: number): boolean | undefined {
    const hit = mockPartLeafHit(id, x, y);
    if (hit !== undefined) return hit;
    // Invisible green muzzle helper23 has geometry despite its zero-alpha placement.
    if (id === 23) return Math.hypot(x, y) <= 1.45;
    return undefined;
  }
  hitClip(clip: SwfClip, x: number, y: number, inverse: ContactMatrix = CONTACT_IDENTITY): boolean {
    const geometric = this.leafContact(clip.id, x, y);
    if (geometric !== undefined) return geometric;
    const leaf = this.leaves.get(clip.id);
    if (leaf) return alphaHit(leaf, x, y);
    const hit = (p: DisplayPlacement) => {
      const child = clip.children.get(p.depth)?.clip;
      if (!child) return false;
      const m = p.matrix,
        det = m.a * m.d - m.b * m.c,
        childInverse = descendContact(inverse, m);
      if (!childInverse) return false;
      const dx = x - m.tx / 20,
        dy = y - m.ty / 20;
      return this.hitClip(
        child,
        (m.d * dx - m.c * dy) / det,
        (-m.b * dx + m.a * dy) / det,
        childInverse,
      );
    };
    const masks: DisplayPlacement[] = [];
    for (const p of clip.placements) {
      if (p.clipDepth !== undefined) {
        masks.push(p);
        continue;
      }
      if (masks.some((mask) => p.depth > mask.depth && p.depth <= mask.clipDepth! && !hit(mask)))
        continue;
      if (hit(p)) return true;
    }
    return false;
  }
  hitTest = (t: Tank, x: number, y: number, stageScale = 1) => {
    if (!t.displayChildren.length) return false;
    const inverse = descendContact(CONTACT_IDENTITY, contactTransform(t.rotation, stageScale));
    if (!inverse) return false;
    for (const p of t.design.parts) {
      if (this.hitPart(t, p, x, y, stageScale)) return true;
    }
    const local = rotate({ x: x - t.x, y: y - t.y }, -t.rotation);
    return this.hitAttachments(t, local.x, local.y, inverse);
  };
  private hitAttachments(tank: Tank, x: number, y: number, inverse: ContactMatrix) {
    const film = tank.displayChildren.includes('shield-film');
    const diameter = !film
      ? 0
      : tank.side === 'player'
        ? (tank.shieldDiameter ?? this.protectionRadius(tank) * 2)
        : tank.radius * 2;
    for (const clip of tank.shieldClips) {
      if (!tank.displayChildren.includes(clip.key)) continue;
      if (
        clip.kind === 'film' &&
        Math.hypot(x, y) <= (Number.isNaN(clip.diameter) ? 130 : clip.diameter) / 2
      )
        return true;
    }
    if (film && Math.hypot(x, y) <= (Number.isNaN(diameter) ? 130 : diameter) / 2) return true;
    if (
      tank.forcefieldAttached &&
      tank.displayChildren.includes('forcefield') &&
      tank.design.parts.some((part) => part.type === 5005)
    ) {
      const maskHit = tank.design.parts.some((part) => {
        const point = rotate(
          { x: (x - part.x) / part.scale, y: (y - part.y) / part.scale },
          -part.rotation,
        );
        const childInverse = descendContact(inverse, contactTransform(part.rotation, part.scale));
        return (
          !!childInverse &&
          this.hitClip(this.forcefieldPartClip(tank, part), point.x, point.y, childInverse)
        );
      });
      if (maskHit) {
        const diameter = this.forcefieldRadius(tank) * 2.1;
        return Math.hypot(x, y) <= (Number.isNaN(diameter) ? 130 : diameter) / 2;
      }
    }
    return false;
  }
  hitDesignPart(p: TankPart, x: number, y: number) {
    const local = rotate({ x: (x - p.x) / p.scale, y: (y - p.y) / p.scale }, -p.rotation);
    return alphaHit(this.part(p.type, 0, p.y), local.x, local.y);
  }
  hitProjectile = (b: Projectile, x: number, y: number) => mockProjectileHit(b, x, y);
  projectileWidth = (b: Projectile) => {
    return this.projectileBounds(b).width;
  };
  projectileBounds = (b: Projectile, owner?: { x: number; y: number }): Bounds =>
    authoredProjectileBounds(b, owner) ?? mockProjectileBounds(b);
  hitPart = (t: Tank, p: TankPart, x: number, y: number, stageScale = 1) => {
    if (t.removedParts.has(p.key) || !t.displayChildren.includes(`part:${p.key}`)) return false;
    const pt = rotate({ x: x - t.x, y: y - t.y }, -t.rotation);
    const gun = t.guns.find((g) => g.part.key === p.key);
    const tankInverse = descendContact(CONTACT_IDENTITY, contactTransform(t.rotation, stageScale));
    const inverse =
      tankInverse &&
      descendContact(tankInverse, contactTransform(gun?.angle ?? p.rotation, p.scale));
    if (!inverse) return false;
    const local = rotate(
      { x: (pt.x - p.x) / p.scale, y: (pt.y - p.y) / p.scale },
      -(gun?.angle ?? p.rotation),
    );
    if (this.hasPartTimeline(p.type))
      return this.hitClip(this.partClip(t, p), local.x, local.y, inverse);
    return alphaHit(this.livePart(t, p), local.x, local.y);
  };
  preview(design: TankDesign, size = 130): string {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * 2;
    const ctx = canvas.getContext('2d')!;
    const extent = Math.max(
      24,
      ...design.parts.map((p) => Math.hypot(p.x, p.y) + p.radius * p.scale),
    );
    const s = Math.min(1.5, (size - 16) / (extent * 2));
    ctx.translate(size, size);
    ctx.scale(s * 2, s * 2);
    for (const p of design.parts) this.drawPart(ctx, p);
    return canvas.toDataURL('image/png');
  }
  drawPart(ctx: CanvasRenderingContext2D, p: TankPart, purpose: 'poster' | 'class' = 'poster') {
    const r = purpose === 'class' ? this.classBody(p.type) : this.part(p.type, 0, p.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    ctx.drawImage(r.canvas, r.x, r.y, r.width, r.height);
    ctx.restore();
  }
  dispose() {
    this.frames.clear();
    this.leaves.clear();
    this.displayCache.clear();
    this.classFrames.clear();
    this.classPoses.clear();
    this.positivePosters.clear();
    this.partClips = new WeakMap();
    this.infections = new WeakMap();
    this.forcefieldClones = new WeakMap();
    this.extras.clear();
    this.uiFrames.clear();
    this.creatorFrames.clear();
  }
}
export function alphaHit(r: Raster, x: number, y: number) {
  const px = Math.floor((x - r.x) * r.resolution),
    py = Math.floor((y - r.y) * r.resolution);
  return (
    px >= 0 &&
    py >= 0 &&
    px < r.canvas.width &&
    py < r.canvas.height &&
    (r.pixels[(py * r.canvas.width + px) * 4 + 3] ?? 0) > 16
  );
}
/** An authored empty frame stays empty; never substitute a generic body. */
function emptyRaster(): Raster {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return {
    canvas,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pixels: new Uint8ClampedArray(4),
    resolution: 1,
    url: canvas.toDataURL(),
  };
}
async function rasterSvg(svg: string, bounds: Bounds): Promise<Raster> {
  const url = svgUrl(svg),
    img = new Image();
  img.src = url;
  await img.decode();
  const resolution = 2,
    canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bounds.width * resolution);
  canvas.height = Math.ceil(bounds.height * resolution);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return {
    ...bounds,
    canvas,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    resolution,
    url,
  };
}
