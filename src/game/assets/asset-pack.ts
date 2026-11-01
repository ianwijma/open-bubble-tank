import { PARTS, partById } from '../data/catalog';
import { SETTINGS_SCREEN } from '../core/settings-screen';
import { CREDITS } from '../core/credits-screen';
import { mockCreditsLeaf } from './mock-credits';
import type { Projectile, Rect, Tank, TankDesign, TankPart } from '../core/types';
import { Random, rotate } from '../core/math';
import { SwfClip } from './swf-clip';
import { partSnapshot } from './part-snapshot';
import { PartPlayback } from './part-playback';
import {
  mockProjectileBounds,
  projectileScriptBounds,
  scriptBounds,
  type ScriptBoundsSource,
} from './projectile-bounds';
import { protectionRadius, protectionScale } from '../core/protection-size';
import { legacyShieldFilm, shieldClipFrame } from '../core/shield-art';
import { MINIMAP } from '../core/minimap';
import { HUD } from '../core/hud';
import { WIN_SCREEN } from '../core/win-screen';
import { TUTORIAL } from '../core/tutorial';
import { extractAssets } from './swf.mjs';
import {
  extractSymbols,
  morphShapeAtRatio,
  parseMorphShapeTag,
  shapeToSVG,
} from './swf-symbols.mjs';
import { rasterMorphSVG } from './morph-raster';
import projectileArt from '../data/projectile-art.json';
import effectArt from '../data/effect-art.json';
import screenEffectArt from '../data/screen-effect-art.json';
import mineArt from '../data/mine-art.json';
import { buildDisplayList } from './display-list';
import { mockPart, mockPartLeaf, mockPartLeafHit } from './mock-part';
import { ShapeContact } from './shape-contact';
import {
  CONTACT_IDENTITY,
  contactTransform,
  descendContact,
  type ContactMatrix,
} from './contact-transform';
import mockPartTimelines from '../data/mock-part-timelines.json';
import { mockProjectileHit } from './mock-projectile';
import { authoredProjectileBounds } from './projectile-geometry';
import { INFECTED_ART, STATUS_ART, PROTECTION_ART, shieldClipSymbol } from '../data/status-art';
import { buttonDisplayList, type ButtonInfo, type ButtonState } from './button-display-list';
import { CREATOR_CONTROLS } from '../core/creator-controls';

export interface Bounds extends Rect {}
export interface Raster extends Bounds {
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
  resolution: number;
  url: string;
  morph?: boolean;
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
  startBounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
  runs?: unknown[];
}
interface FontInfo {
  id: number;
  name: string;
  bold?: number;
  italic?: number;
  codeTable: number[];
  glyphs: string[];
  advances?: number[];
  ascent?: number;
  descent?: number;
}
interface TextInfo {
  id: number;
  bounds: { xMin: number; yMin: number; xMax: number; yMax: number };
  matrix: Matrix;
  records: {
    fontId?: number;
    color?: number[];
    x?: number;
    y?: number;
    height?: number;
    glyphs: { index: number; advance: number }[];
  }[];
}
export interface SymbolResult {
  symbols: {
    sprites: SpriteInfo[];
    buttons?: ButtonInfo[];
    shapes: ShapeInfo[];
    morphs: ReturnType<typeof parseMorphShapeTag>[];
    fonts: FontInfo[];
    texts: TextInfo[];
    editTexts: {
      id: number;
      bounds: { xMin: number; yMin: number; xMax: number; yMax: number };
      fontHeight: number;
      fontId?: number;
      align: number;
      text: string;
      color?: number[];
      leading?: number;
      margins?: number[];
      flags?: { wordWrap: boolean; multiline: boolean; readOnly: boolean; html: boolean };
    }[];
    symbolNames: Record<string, string>;
  };
  svgByCid: Map<number, string>;
  errors: string[];
}
export interface AssetReport {
  filename: string;
  images: number;
  sounds: number;
  vectors: number;
  sprites: number;
  warnings: string[];
}
const identity: Matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const escapeXml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
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
  readonly mode: 'swf' | 'mock';
  report: AssetReport | null = null;
  frames = new Map<number, Raster[]>();
  extras = new Map<number, Raster>();
  uiFrames = new Map<number, Raster[]>();
  creatorFrames = new Map<string, Raster>();
  leaves = new Map<number, Raster>();
  sounds = new Map<number, Blob>();
  private symbols: SymbolResult | null = null;
  private sprites = new Map<number, SpriteInfo>();
  private buttons = new Map<number, ButtonInfo>();
  private shapes = new Map<number, ShapeInfo>();
  private morphs = new Map<number, ReturnType<typeof parseMorphShapeTag>>();
  private morphRasters = new Map<string, Raster>();
  private morphPixels = 0;
  private shapeContacts = new Map<string, ShapeContact>();
  private contactContext?: CanvasRenderingContext2D;
  static readonly SHAPE_CONTACT_LIMIT = 256;
  static readonly MORPH_CACHE_PIXELS = 8 * 1024 * 1024;
  private texts = new Map<number, TextInfo>();
  private fonts = new Map<number, FontInfo>();
  private sourceUrls: string[] = [];
  private displayCache = new Map<string, DisplayPlacement[]>();
  private dynamicWidths = new Map<number, number>();
  private classFrames = new Map<number, Raster>();
  private classPoses = new Map<number, SwfClip>();
  private positivePosters = new Map<number, Raster>();
  private partClips = new WeakMap<Tank, { design: TankDesign; parts: Map<string, PartPlayback> }>();
  private infections = new WeakMap<Tank, { startedAt: number; clip: SwfClip }>();
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
      const shape = this.shapes.get(id),
        rect = shape?.startBounds ?? shape?.bounds ?? this.texts.get(id)?.bounds;
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
  constructor(mode: 'swf' | 'mock') {
    this.mode = mode;
  }
  static async mock(onProgress: (n: number, label: string) => void = () => {}) {
    const pack = new AssetPack('mock');
    pack.sprites = new Map(mockPartTimelines.sprites.map((s) => [s.id, s as SpriteInfo]));
    pack.shapes = new Map(mockPartTimelines.shapes.map((s) => [s.id, s]));
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
  static async fromSWF(file: File, onProgress: (n: number, label: string) => void = () => {}) {
    if (file.size < 32 || file.size > 20 * 1024 * 1024)
      throw new Error('Choose a Bubble Tanks 3 SWF smaller than 20 MB.');
    const raw = new Uint8Array(await file.arrayBuffer());
    const sig = String.fromCharCode(...raw.slice(0, 3));
    if (!['CWS', 'FWS'].includes(sig))
      throw new Error(
        sig === 'ZWS'
          ? 'LZMA-compressed SWFs are unsupported. Use the original CWS or an uncompressed FWS file.'
          : 'This file is not a supported Flash SWF.',
      );
    const declared = new DataView(raw.buffer).getUint32(4, true);
    if (declared > 32 * 1024 * 1024 || declared < 32)
      throw new Error('The SWF declares an unsupported size.');
    onProgress(0.03, 'Reading Flash container');
    // This imports artwork and audio only. ActionScript is never executed.
    const result = await extractAssets(raw, () => {});
    if (result.header.stageWidthPx !== 550 || result.header.stageHeightPx !== 450)
      throw new Error('Expected the 550 × 450 Bubble Tanks 3 game file.');
    onProgress(0.12, 'Extracting vectors and sprite timelines');
    const symbols = (await extractSymbols(result.bytes, {
      images: result.images,
    })) as unknown as SymbolResult;
    if (!Object.values(symbols.symbols.symbolNames).some((n) => n.endsWith('.AGunBasicCannon')))
      throw new Error('This SWF does not contain the expected Bubble Tanks 3 symbols.');
    const pack = new AssetPack('swf');
    pack.symbols = symbols;
    pack.sprites = new Map(symbols.symbols.sprites.map((s) => [s.id, s]));
    pack.buttons = new Map((symbols.symbols.buttons ?? []).map((s) => [s.id, s]));
    pack.shapes = new Map(
      [...symbols.symbols.shapes, ...symbols.symbols.morphs].map((s) => [s.id, s]),
    );
    pack.morphs = new Map(symbols.symbols.morphs.map((morph) => [morph.id, morph]));
    pack.fonts = new Map(symbols.symbols.fonts.map((f) => [f.id, f]));
    pack.texts = new Map(symbols.symbols.texts.map((t) => [t.id, t]));
    for (const s of result.sounds as { id: number; blob?: Blob }[])
      if (s.blob) pack.sounds.set(s.id, s.blob);
    pack.report = {
      filename: file.name,
      images: result.images.length,
      sounds: result.sounds.length,
      vectors: symbols.svgByCid.size,
      sprites: symbols.symbols.sprites.length,
      warnings: [...result.errors, ...symbols.errors],
    };
    try {
      for (const [i, part] of PARTS.entries()) {
        const pose = partSnapshot(part, pack),
          raster = await pack.rasterClip(pose);
        pack.frames.set(part.id, [
          raster ?? (pose.placements.length ? mockPart(part.id) : emptyRaster()),
        ]);
        // Wiggle Cluster's root branches on its own Y. Child Y is already retained
        // in the pose, so only a different root frame needs another cached poster.
        const positive = partSnapshot(part, pack, 'poster', 1);
        if (positive.frame !== pose.frame) {
          const variant = await pack.rasterClip(positive);
          if (variant) pack.positivePosters.set(part.id, variant);
        }
        if (part.id < 2000) {
          const classPose = partSnapshot(part, pack, 'class');
          pack.classPoses.set(part.id, classPose);
          const sample = await pack.rasterClip(classPose);
          if (sample) pack.classFrames.set(part.id, sample);
        }
        onProgress(0.2 + (0.35 * (i + 1)) / PARTS.length, `Composing ${part.name}`);
        if (i % 6 === 0)
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      const reachable = new Set<number>();
      const visit = (id: number) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        for (const p of pack.sprites.get(id)?.placements ?? []) if (p.charId) visit(p.charId);
      };
      for (const p of PARTS) visit(p.symbol);
      for (const id of [487, 524, 545, 492, 494, 496, 498, 500, 502]) visit(id);
      visit(CREDITS.symbol);
      for (const art of Object.values(projectileArt)) visit(art.symbol);
      for (const art of Object.values(effectArt)) visit(art.symbol);
      for (const art of Object.values(screenEffectArt)) visit(art.symbol);
      for (const art of Object.values(mineArt)) visit(art.symbol);
      for (const id of [...Object.values(STATUS_ART), INFECTED_ART]) visit(id);
      for (const id of Object.values(PROTECTION_ART)) visit(id);
      for (const id of [1816, 1817, 1820, 2173, 1780]) visit(id);
      for (const id of [MINIMAP.symbol, MINIMAP.button, MINIMAP.dot, MINIMAP.connector]) visit(id);
      for (const id of [HUD.life.symbol, HUD.fire.symbol, HUD.edit.symbol]) visit(id);
      for (const { symbol } of Object.values(HUD.tactical)) visit(symbol);
      visit(TUTORIAL.symbol);
      const leafIds = [...reachable].filter(
        (id) => (pack.shapes.has(id) && !pack.morphs.has(id)) || pack.texts.has(id),
      );
      for (const [i, id] of leafIds.entries()) {
        const raster = await pack.rasterSymbol(id, 1);
        if (raster) pack.leaves.set(id, raster);
        onProgress(0.55 + (0.35 * (i + 1)) / leafIds.length, 'Preparing original sprite timelines');
        if (i % 12 === 0)
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      for (const id of [
        1537, 1672, 1721, 1717, 492, 494, 498, 500, 496, 1816, 1817, 1820, 1535, 1536, 2034, 1626,
        1628, 1630, 1633,
      ]) {
        const raster = await pack.rasterSymbol(id, 1);
        if (raster) pack.extras.set(id, raster);
      }
      const settingsArtwork = Object.values(SETTINGS_SCREEN)
        .flatMap((layouts) =>
          Object.values(layouts).flatMap((layout) =>
            layout.pieces.flatMap((piece) => (piece.children.length ? piece.children : [piece])),
          ),
        )
        .filter((piece) => !piece.field);
      for (const piece of [
        ...settingsArtwork,
        ...HUD.editConfirm,
        ...HUD.secondaryHelp,
        ...HUD.pause.pieces.filter(
          (piece) => piece.name !== 'rollover_txt' && piece.name !== 'btnPlayMoreGames_mc',
        ),
        ...HUD.tankInfo.pieces.filter((piece) => piece.name !== 'TankImage_mc'),
        WIN_SCREEN.backdrop,
        ...WIN_SCREEN.pieces,
      ]) {
        if (pack.uiFrames.has(piece.symbol)) continue;
        const frames: Raster[] = [];
        const hover = piece.name && (pack.sprites.get(piece.symbol)?.frameCount ?? 1) > 1;
        for (const frame of hover ? [1, 2] : [1]) {
          const raster = await pack.rasterSymbol(piece.symbol, frame);
          if (raster) frames.push(raster);
        }
        if (piece.name && !hover && frames[0]) frames.push(frames[0]);
        pack.uiFrames.set(piece.symbol, frames);
      }
      for (const control of CREATOR_CONTROLS.controls) {
        const frames =
          control.name === 'SymmetricMode_mc' || control.name === 'Undo_mc' ? [1, 2] : [1];
        for (const frame of frames)
          for (const state of ['up', 'over', 'down'] as const) {
            const pose = new SwfClip(control.symbol, pack);
            pose.start(frame, false);
            const raster = await pack.rasterClip(pose, state);
            if (raster) pack.creatorFrames.set(`${control.name}:${frame}:${state}`, raster);
          }
      }
      for (const slider of CREATOR_CONTROLS.sliders) {
        const pose = new SwfClip(slider.symbol, pack);
        pose.advance(1);
        pose.placements = pose.placements.filter((p) => !p.name);
        const track = await pack.rasterClip(pose);
        if (track) pack.creatorFrames.set(`${slider.name}:track`, track);
      }
      for (const frame of [1, 2]) {
        const slider = CREATOR_CONTROLS.sliders[0];
        const raster = await pack.rasterSymbol(slider.handle.symbol, frame);
        if (raster) pack.creatorFrames.set(`handle:${frame}`, raster);
      }
      for (let frame = 1; frame <= 6; frame++) {
        const raster = await pack.rasterSymbol(819, frame);
        if (raster) pack.creatorFrames.set(`rings:${frame}`, raster);
      }
      onProgress(1, 'Assets ready');
      return pack;
    } catch (e) {
      pack.dispose();
      throw e;
    }
  }
  private compile(
    id: number,
    frame = 1,
    seen = new Set<number>(),
    ratio = 0,
    pose?: SwfClip,
    buttonState: ButtonState = 'up',
  ): { body: string; bounds: Bounds } | null {
    if (seen.has(id) || seen.size > 24) return null;
    const next = new Set(seen);
    next.add(id);
    const procedural = this.mode === 'mock' && this.leaves.get(id);
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
    const morph = this.morphs.get(id);
    const shape = morph ? morphShapeAtRatio(morph, ratio) : this.shapes.get(id),
      svg = morph
        ? shapeToSVG({ ...shape, id: `${id}_${ratio}` }, undefined)
        : this.symbols?.svgByCid.get(id);
    if (shape && svg) {
      const b = shape.bounds!;
      const bounds = {
        x: b.xMin / 20,
        y: b.yMin / 20,
        width: (b.xMax - b.xMin) / 20,
        height: (b.yMax - b.yMin) / 20,
      };
      const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      return { body: `<g transform="translate(${bounds.x} ${bounds.y})">${body}</g>`, bounds };
    }
    const text = this.texts.get(id);
    if (text) return this.compileText(text);
    const sp = this.sprites.get(id);
    const button = this.buttons.get(id);
    if (!sp && !button) return null;
    const placements = button
      ? buttonDisplayList(button, buttonState)
      : (pose?.placements ?? this.displayList(id, frame));
    const children: { body: string; bounds: Bounds }[] = [];
    const masks: { id: string; depth: number; end: number; bounds: Bounds; body: string }[] = [];
    for (const p of placements) {
      const childPose = pose?.children.get(p.depth)?.clip;
      const child = this.compile(p.charId, frame, next, p.ratio ?? 0, childPose, buttonState);
      if (!child) continue;
      const m = p.matrix ?? identity;
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
        body = `<g clip-path="url(#${mask.id})">${body}</g>`;
        bounds = intersect(bounds, mask.bounds);
      }
      if (bounds.width > 0 && bounds.height > 0) children.push({ body, bounds });
    }
    const definitions = masks.length
      ? `<defs>${masks.map((mask) => `<clipPath id="${mask.id}" clipPathUnits="userSpaceOnUse">${mask.body}</clipPath>`).join('')}</defs>`
      : '';
    return children.length
      ? {
          body: definitions + children.map((c) => c.body).join(''),
          bounds: union(children.map((c) => c.bounds)),
        }
      : null;
  }
  private compileText(t: TextInfo) {
    let font: FontInfo | undefined,
      height = 240,
      x = 0,
      y = 0,
      color = [255, 255, 255, 255];
    let body = '';
    for (const rec of t.records) {
      if (rec.fontId) font = this.fonts.get(rec.fontId);
      if (rec.height) height = rec.height;
      if (rec.x !== undefined) x = rec.x;
      if (rec.y !== undefined) y = rec.y;
      if (rec.color) color = rec.color;
      for (const glyph of rec.glyphs) {
        const path = font?.glyphs[glyph.index];
        if (path)
          body += `<path fill="rgb(${color.slice(0, 3).join(',')})" fill-opacity="${(color[3] ?? 255) / 255}" transform="translate(${x / 20} ${y / 20}) scale(${height / 20 / 1024})" d="${path}"/>`;
        x += glyph.advance;
      }
    }
    const b = t.bounds;
    return {
      body: `<g transform="${matrixAttr(t.matrix)}">${body}</g>`,
      bounds: {
        x: b.xMin / 20,
        y: b.yMin / 20,
        width: (b.xMax - b.xMin) / 20,
        height: (b.yMax - b.yMin) / 20,
      },
    };
  }
  async rasterSymbol(
    id: number,
    frame = 1,
    ratio = 0,
    buttonState: ButtonState = 'up',
  ): Promise<Raster | null> {
    const compiled = this.compile(id, frame, new Set(), ratio, undefined, buttonState);
    return this.rasterCompiled(compiled);
  }
  /** Freeze each retained child at its own frame; raw rasterSymbol remains authored-frame access. */
  async rasterClip(clip: SwfClip, buttonState: ButtonState = 'up'): Promise<Raster | null> {
    return this.rasterCompiled(this.compile(clip.id, clip.frame, new Set(), 0, clip, buttonState));
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
      pad = this.mode === 'swf' ? 2 : 3;
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
  isMorph(id: number) {
    return this.morphs.has(id);
  }
  get morphCachePixels() {
    return this.morphPixels;
  }
  get shapeContactCount() {
    return this.shapeContacts.size;
  }
  morphRaster(id: number, ratio = 0): Raster | null {
    const morph = this.morphs.get(id);
    if (!morph) return null;
    ratio = Number.isFinite(ratio) ? Math.max(0, Math.min(65535, Math.round(ratio))) : 0;
    const key = `${id}:${ratio}`;
    const cached = this.morphRasters.get(key);
    if (cached) {
      this.morphRasters.delete(key);
      this.morphRasters.set(key, cached);
      return cached;
    }
    const shape = morphShapeAtRatio(morph, ratio),
      b = shape.bounds;
    const raster = rasterMorphSVG(shapeToSVG(shape, undefined), {
      x: b.xMin / 20,
      y: b.yMin / 20,
      width: (b.xMax - b.xMin) / 20,
      height: (b.yMax - b.yMin) / 20,
    });
    this.morphRasters.set(key, raster);
    this.morphPixels += raster.canvas.width * raster.canvas.height;
    while (this.morphPixels > AssetPack.MORPH_CACHE_PIXELS && this.morphRasters.size > 1) {
      const oldest = this.morphRasters.entries().next().value!;
      this.morphPixels -= oldest[1].canvas.width * oldest[1].canvas.height;
      this.morphRasters.delete(oldest[0]);
    }
    return raster;
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
    const frame = ((Math.max(1, Math.floor(age)) - 1) % sp.frameCount) + 1,
      key = `${id}:${frame}`;
    const cached = this.displayCache.get(key);
    if (cached) return cached;
    const result = buildDisplayList(sp, frame);
    this.displayCache.set(key, result);
    return result;
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
      owner = { design: tank.design, parts: new Map() };
      this.partClips.set(tank, owner);
    }
    const age = tank.artAge + 1;
    let playback = owner.parts.get(part.key);
    if (!playback || playback.clip.age > age) {
      // Painting/contact queries share a private stream rather than consuming gameplay RNG.
      playback = new PartPlayback(this.newPartClip(tank, part));
      owner.parts.set(part.key, playback);
    }
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
    if (this.mode === 'swf' || this.hasPartTimeline(part.type)) {
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
  clipScriptBounds(pose: SwfClip) {
    return scriptBounds(this.scriptGeometry, pose.id, pose.age, undefined, undefined, [], 0, pose);
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
  private leafContact(
    id: number,
    x: number,
    y: number,
    ratio: number,
    inverse: ContactMatrix,
  ): boolean | undefined {
    if (this.mode === 'mock') {
      const hit = mockPartLeafHit(id, x, y);
      if (hit !== undefined) return hit;
      // Invisible green muzzle helper23 has geometry despite its zero-alpha placement.
      if (id === 23) return Math.hypot(x, y) <= 1.45;
    }
    const morph = this.morphs.get(id);
    ratio = Number.isFinite(ratio) ? Math.max(0, Math.min(65535, Math.round(ratio))) : 0;
    const shape = morph ? undefined : this.shapes.get(id);
    if (!morph && !shape?.runs) return undefined;
    const bounds = shape?.bounds;
    // Same declared-bounds gate as ShapeContact, before allocating paths for distant UI glyphs.
    if (
      bounds &&
      (x < bounds.xMin / 20 || x > bounds.xMax / 20 || y < bounds.yMin / 20 || y > bounds.yMax / 20)
    )
      return false;
    const key = `${id}:${morph ? ratio : 0}`;
    let contact = this.shapeContacts.get(key);
    if (!contact) {
      contact = new ShapeContact(morph ? morphShapeAtRatio(morph, ratio) : shape);
      this.shapeContacts.set(key, contact);
      if (this.shapeContacts.size > AssetPack.SHAPE_CONTACT_LIMIT)
        this.shapeContacts.delete(this.shapeContacts.keys().next().value!);
    }
    this.contactContext ??= document.createElement('canvas').getContext('2d')!;
    return contact.hit(this.contactContext, x, y, inverse);
  }
  hitClip(
    clip: SwfClip,
    x: number,
    y: number,
    ratio = 0,
    inverse: ContactMatrix = CONTACT_IDENTITY,
  ): boolean {
    const geometric = this.leafContact(clip.id, x, y, ratio, inverse);
    if (geometric !== undefined) return geometric;
    if (this.morphs.has(clip.id)) return alphaHit(this.morphRaster(clip.id, ratio)!, x, y);
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
        p.ratio ?? 0,
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
  private symbolHit(
    id: number,
    age: number,
    x: number,
    y: number,
    depth = 0,
    beamLength?: number,
    ratio = 0,
    inverse: ContactMatrix = CONTACT_IDENTITY,
  ): boolean {
    if (depth > 24) return false;
    const geometric = this.leafContact(id, x, y, ratio, inverse);
    if (geometric !== undefined) return geometric;
    if (this.morphs.has(id)) return alphaHit(this.morphRaster(id, ratio)!, x, y);
    const leaf = this.leaves.get(id);
    if (leaf) return alphaHit(leaf, x, y);
    const hitPlacement = (p: DisplayPlacement, matrix = p.matrix) => {
      const m = matrix,
        det = m.a * m.d - m.b * m.c,
        childInverse = descendContact(inverse, m);
      if (!childInverse) return false;
      const dx = x - m.tx / 20,
        dy = y - m.ty / 20;
      return this.symbolHit(
        p.charId,
        this.childAge(id, age, p),
        (m.d * dx - m.c * dy) / det,
        (-m.b * dx + m.a * dy) / det,
        depth + 1,
        undefined,
        p.ratio ?? 0,
        childInverse,
      );
    };
    const masks: DisplayPlacement[] = [];
    for (const p of this.displayList(id, age)) {
      if (p.clipDepth !== undefined) {
        masks.push(p);
        continue;
      }
      if (
        masks.some(
          (mask) => p.depth > mask.depth && p.depth <= mask.clipDepth! && !hitPlacement(mask),
        )
      )
        continue;
      let matrix = p.matrix;
      if (beamLength !== undefined) {
        if (p.name === 'mask_mc') continue;
        if (p.name === 'beam_mc' && (x < -4 || x > beamLength)) continue;
        if (p.name === 'endCap_mc') matrix = { ...matrix, tx: beamLength * 20 };
        if (p.name === 'line_mc') {
          let width = this.dynamicWidths.get(p.charId);
          if (!width) {
            width = this.compile(p.charId, 1)?.bounds.width || 1;
            this.dynamicWidths.set(p.charId, width);
          }
          matrix = { ...matrix, a: Math.max(0.01, beamLength) / width };
        }
      }
      if (hitPlacement(p, matrix)) return true;
    }
    return false;
  }
  textSvg(text: string, size: number, color = '#ffffff', fontName = 'Billo'): string | null {
    const font = [...this.fonts.values()].find(
      (f) => f.name.startsWith(fontName) && f.advances?.length,
    );
    if (!font) return null;
    let x = 0,
      body = '';
    const scale = size / 1024;
    for (const ch of text) {
      const index = font.codeTable.indexOf(ch.charCodeAt(0));
      if (index < 0) {
        x += size * 0.4;
        continue;
      }
      body += `<path transform="translate(${x} ${size}) scale(${scale})" d="${font.glyphs[index]}"/>`;
      x += ((font.advances?.[index] ?? 10240) / 20) * scale;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, x)}" height="${size * 1.4}" viewBox="0 0 ${Math.max(1, x)} ${size * 1.4}"><g fill="${escapeXml(color)}">${body}</g></svg>`;
  }
  hasSymbol(id: number) {
    return this.sprites.has(id) || this.shapes.has(id);
  }
  hitTest = (t: Tank, x: number, y: number, stageScale = 1) => {
    const inverse = descendContact(CONTACT_IDENTITY, contactTransform(t.rotation, stageScale));
    if (!inverse) return false;
    for (const p of t.design.parts) {
      if (this.hitPart(t, p, x, y, stageScale)) return true;
    }
    const local = rotate({ x: x - t.x, y: y - t.y }, -t.rotation);
    return this.hitAttachments(t, local.x, local.y, inverse);
  };
  private hitAttachments(tank: Tank, x: number, y: number, inverse: ContactMatrix) {
    const scaled = (id: number, age: number, angle: number, diameter: number, uniform = false) => {
      const point = rotate({ x, y }, -angle);
      const scale = protectionScale(this.symbolScriptBounds(id), diameter, uniform);
      const childInverse = descendContact(inverse, contactTransform(angle, scale.x, scale.y));
      return (
        !!childInverse &&
        this.symbolHit(id, age, point.x / scale.x, point.y / scale.y, 0, undefined, 0, childInverse)
      );
    };
    const film = legacyShieldFilm(tank);
    const hasHit = film || tank.displayChildren.includes('shield-hit');
    const diameter = !hasHit
      ? 0
      : tank.side === 'player'
        ? (tank.shieldDiameter ?? this.protectionRadius(tank) * 2)
        : tank.radius * 2;
    for (const clip of tank.shieldClips) {
      if (!tank.displayChildren.includes(clip.key)) continue;
      if (this.mode === 'swf') {
        if (scaled(shieldClipSymbol(clip), shieldClipFrame(clip), clip.angle, clip.diameter))
          return true;
      } else if (
        clip.kind === 'film' &&
        Math.hypot(x, y) <= (Number.isNaN(clip.diameter) ? 130 : clip.diameter) / 2
      )
        return true;
    }
    if (this.mode === 'swf') {
      if (tank.statusDecoration) {
        const decoration = tank.statusDecoration;
        for (const mark of decoration.marks) {
          const point = rotate({ x: x - mark.x, y: y - mark.y }, -mark.angle);
          const age = decoration.kind === 'stun' ? mark.frame + decoration.artAge : mark.frame;
          const childInverse = descendContact(inverse, contactTransform(mark.angle));
          if (
            childInverse &&
            this.symbolHit(
              STATUS_ART[decoration.kind],
              age,
              point.x,
              point.y,
              0,
              undefined,
              0,
              childInverse,
            )
          )
            return true;
        }
      }
      if (tank.status.infect > 0) {
        const point = rotate({ x, y }, -tank.infectionAngle),
          scale = (tank.radius * 1.5) / 36;
        const childInverse = descendContact(inverse, contactTransform(tank.infectionAngle, scale));
        if (
          childInverse &&
          this.hitClip(this.infectionClip(tank), point.x / scale, point.y / scale, 0, childInverse)
        )
          return true;
      }
      const turret = tank.side !== 'player';
      if (
        film &&
        scaled(
          turret ? PROTECTION_ART.turretShield : PROTECTION_ART.shield,
          turret ? Math.min(25, tank.shieldAge + 1) : tank.shieldAge + 1,
          0,
          diameter,
        )
      )
        return true;
      if (
        hasHit &&
        scaled(
          turret ? PROTECTION_ART.turretShieldHit : PROTECTION_ART.shieldHit,
          Math.min(16, tank.shieldHitAge + 1),
          tank.shieldHitAngle,
          tank.shieldHitDiameter ?? diameter,
        )
      )
        return true;
    } else if (film && Math.hypot(x, y) <= (Number.isNaN(diameter) ? 130 : diameter) / 2)
      return true;
    if (tank.forcefieldAttached && tank.design.parts.some((part) => part.type === 5005)) {
      const maskHit = tank.design.parts.some((part) => {
        const point = rotate(
          { x: (x - part.x) / part.scale, y: (y - part.y) / part.scale },
          -part.rotation,
        );
        const childInverse = descendContact(inverse, contactTransform(part.rotation, part.scale));
        return (
          !!childInverse &&
          this.hitClip(this.forcefieldPartClip(tank, part), point.x, point.y, 0, childInverse)
        );
      });
      if (maskHit) {
        const diameter = this.forcefieldRadius(tank) * 2.1;
        if (this.mode === 'swf')
          return scaled(
            PROTECTION_ART.forcefield,
            tank.forcefieldFrame,
            tank.forcefieldAngle,
            diameter,
            true,
          );
        return Math.hypot(x, y) <= (Number.isNaN(diameter) ? 130 : diameter) / 2;
      }
    }
    return false;
  }
  hitDesignPart(p: TankPart, x: number, y: number, age?: number) {
    const local = rotate({ x: (x - p.x) / p.scale, y: (y - p.y) / p.scale }, -p.rotation);
    const symbol = partById(p.type)?.symbol;
    if (this.mode === 'swf' && age !== undefined && symbol) {
      const inverse = descendContact(CONTACT_IDENTITY, contactTransform(p.rotation, p.scale));
      return !!inverse && this.symbolHit(symbol, age, local.x, local.y, 0, undefined, 0, inverse);
    }
    return alphaHit(this.part(p.type, 0, p.y), local.x, local.y);
  }
  hitProjectile = (b: Projectile, x: number, y: number, stageScale = 1) => {
    if (this.mode !== 'swf' || !this.hasSymbol(b.symbol)) return mockProjectileHit(b, x, y);
    const scale = b.artScale ?? 1;
    const angle = b.kind === 'grow' ? b.heading : b.angle;
    const inverse = descendContact(CONTACT_IDENTITY, contactTransform(angle, scale * stageScale));
    if (!inverse) return false;
    const local = rotate({ x: (x - b.x) / scale, y: (y - b.y) / scale }, -angle);
    if (b.artPose?.id === b.symbol) return this.hitClip(b.artPose, local.x, local.y, 0, inverse);
    return this.symbolHit(
      b.symbol,
      b.artFrame ?? b.age + 1,
      local.x,
      local.y,
      0,
      b.kind === 'beam' || b.kind === 'healBeam' ? (b.beamLength ?? 0) : undefined,
      0,
      inverse,
    );
  };
  projectileWidth = (b: Projectile) => {
    return this.projectileBounds(b).width;
  };
  projectileBounds = (b: Projectile, owner?: { x: number; y: number }): Bounds => {
    const bounds =
      this.mode === 'swf' ? projectileScriptBounds(this.scriptGeometry, b, owner) : undefined;
    if (bounds) return bounds;
    // Empty authored frames (notably the ally mine's blink) have invalid Script
    // bounds. Falling back to a mock circle would invent collision geometry.
    if (this.mode === 'swf' && this.hasSymbol(b.symbol))
      return { x: b.x, y: b.y, width: 0, height: 0, empty: true };
    return authoredProjectileBounds(b, owner) ?? mockProjectileBounds(b);
  };
  hitPart = (t: Tank, p: TankPart, x: number, y: number, stageScale = 1) => {
    if (t.removedParts.has(p.key)) return false;
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
    if (this.mode === 'swf' || this.hasPartTimeline(p.type)) {
      const symbol = partById(p.type)?.symbol;
      if (symbol) return this.hitClip(this.partClip(t, p), local.x, local.y, 0, inverse);
    }
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
    for (const url of this.sourceUrls) URL.revokeObjectURL(url);
    this.frames.clear();
    this.leaves.clear();
    this.displayCache.clear();
    this.dynamicWidths.clear();
    this.classFrames.clear();
    this.classPoses.clear();
    this.positivePosters.clear();
    this.partClips = new WeakMap();
    this.infections = new WeakMap();
    this.forcefieldClones = new WeakMap();
    this.morphRasters.clear();
    this.shapeContacts.clear();
    this.contactContext = undefined;
    this.morphPixels = 0;
    this.morphs.clear();
    this.extras.clear();
    this.uiFrames.clear();
    this.creatorFrames.clear();
    this.buttons.clear();
    this.sounds.clear();
    this.symbols = null;
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
