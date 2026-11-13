import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { AssetPack, Raster } from '../assets/asset-pack';
import { STAGE } from '../core/constants';
import { DEG } from '../core/math';
import { MainBackgroundView } from './main-background-view';
import type { Field, Pickup, Settings, Tank } from '../core/types';
import type { World } from '../simulation/world';
import { whipSamples } from '../simulation/whip';
import { drawMockProjectile } from './mock-projectile-view';
import { SwfSymbolView } from './swf-symbol-view';
import { SwfTextures } from './swf-textures';
import { setBeamLength } from './swf-beam-view';
import { MinimapView } from './minimap-view';
import { HudView } from './hud-view';
import { EditSliderView } from './edit-slider-view';
import { FieldCaptions } from './field-captions';
import { TacticalHudView } from './tactical-hud-view';
import { TankView } from './tank-view';
import { CombatEffectsView } from './combat-effects-view';
import {
  avatarTransform,
  fieldPoint,
  fieldTransform,
  worldLayerTransform,
  type FieldTransform,
} from './field-transform';
import { projectEffects } from './effect-projection';
import { FieldUnderAvatarView } from './field-under-avatar-view';

export class GameRenderer {
  app = new Application();
  root = new Container();
  fields = new Container();
  entities = new Container();
  underAvatars = new Container();
  private underAvatarNodes = new Map<Field, FieldUnderAvatarView>();
  projectiles = new Container();
  nativeShots = new Container();
  nativePickups = new Container();
  pickupArt = new Container();
  private mockShots = new Map<Field, Graphics>();
  private mockPickups = new Map<Pickup, Graphics>();
  private combatEffects?: CombatEffectsView;
  mapArt = new Container();
  private minimap?: MinimapView;
  private hud?: HudView;
  private editSlider?: EditSliderView;
  private captions?: FieldCaptions;
  private tacticalHud?: TacticalHudView;
  overlay = new Graphics();
  screenEffects = new Container();
  private rasterTextures = new SwfTextures();
  private ownedTextures: Texture[] = [];
  private tankNodes = new Map<Tank, TankView>();
  private actorLayers = new Map<Field, Container>();
  private bulletNodes = new Map<number, SwfSymbolView>();
  private pickupNodes = new Map<Pickup, SwfSymbolView>();
  private fieldNodes = new Map<Field, Sprite>();
  highlights = new Container();
  private highlightNodes = new Map<Field, SwfSymbolView>();
  private fieldTexture: Texture | null = null;
  private background: Sprite | null = null;
  private destroyed = false;
  private quality: Settings['quality'] | null = null;
  constructor(
    public assets: AssetPack,
    private externalMainEffects = false,
  ) {}
  /** WebGL's default framebuffer may clear between RAFs: render and copy synchronously. */
  capture(context: CanvasRenderingContext2D) {
    this.app.render();
    context.drawImage(this.app.canvas, 0, 0, 550, 450);
  }
  async init(host: HTMLElement, settings: Settings) {
    await this.app.init({
      width: 550,
      height: 450,
      backgroundAlpha: 0,
      antialias: settings.quality === 'high',
      resolution: settings.quality === 'high' ? 2 : 1,
      autoDensity: true,
      autoStart: false,
      preference: 'webgl',
      powerPreference: 'low-power',
    });
    this.app.canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(this.app.canvas);
    this.quality = settings.quality;
    if (!this.externalMainEffects) {
      const texture = Texture.from(new MainBackgroundView().canvas);
      this.ownedTextures.push(texture);
      this.background = new Sprite(texture);
      this.app.stage.addChild(this.background);
    }
    this.app.stage.addChild(this.root, this.screenEffects, this.mapArt, this.overlay);
    this.minimap = new MinimapView(this.assets, this.rasterTextures);
    this.mapArt.addChild(this.minimap.root);
    this.hud = new HudView(this.assets, this.rasterTextures);
    this.mapArt.addChild(this.hud.root);
    this.editSlider = new EditSliderView(this.assets, this.rasterTextures);
    this.mapArt.addChild(this.editSlider.root);
    this.tacticalHud = new TacticalHudView(this.assets, this.rasterTextures);
    this.mapArt.addChild(this.tacticalHud.root);
    this.captions = new FieldCaptions(this.assets, this.rasterTextures);
    this.combatEffects = new CombatEffectsView(this.assets, this.rasterTextures);
    this.screenEffects.addChild(this.combatEffects.screen);
    this.root.addChild(
      this.fields,
      this.captions.root,
      this.combatEffects.bottom,
      this.underAvatars,
      this.pickupArt,
      this.nativePickups,
      this.entities,
      this.projectiles,
      this.nativeShots,
      this.combatEffects.top,
      this.highlights,
    );
    const field = this.assets.extras.get(1537);
    if (field) this.fieldTexture = this.texture(field);
    else {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 860;
      const c = cv.getContext('2d')!;
      const g = c.createLinearGradient(0, 0, 0, 860);
      g.addColorStop(0, '#0ba5b5');
      g.addColorStop(1, '#084366');
      c.beginPath();
      c.arc(430, 430, 423.75, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      const rim = c.createRadialGradient(430, 430, 400, 430, 430, 424);
      rim.addColorStop(0, 'rgba(180,245,255,0)');
      rim.addColorStop(0.8, 'rgba(180,245,255,.07)');
      rim.addColorStop(1, 'rgba(210,250,255,.45)');
      c.fillStyle = rim;
      c.fill();
      this.fieldTexture = Texture.from(cv);
      this.ownedTextures.push(this.fieldTexture);
    }
  }
  private texture(r: Raster) {
    return this.rasterTextures.get(r);
  }
  private fieldNode(field: Field) {
    let node = this.fieldNodes.get(field);
    if (!node) {
      node = new Sprite(this.fieldTexture!);
      const raster = this.assets.extras.get(1537);
      if (raster) {
        node.position.set(raster.x * field.scale, raster.y * field.scale);
        node.width = raster.width * field.scale;
        node.height = raster.height * field.scale;
      } else {
        node.anchor.set(0.5);
        node.scale.set(field.scale);
      }
      this.fields.addChild(node);
      this.fieldNodes.set(field, node);
    }
    return node;
  }
  private nativeSymbol<Key>(
    id: number,
    uid: Key,
    nodes: Map<Key, SwfSymbolView>,
    layer: Container,
  ) {
    let view = nodes.get(uid);
    if (view && view.id !== id) {
      view.destroy();
      nodes.delete(uid);
      view = undefined;
    }
    if (!view) {
      view = new SwfSymbolView(id, this.assets, this.rasterTextures);
      nodes.set(uid, view);
      layer.addChild(view.root);
    }
    return view;
  }
  private pruneSymbols<Key>(nodes: Map<Key, SwfSymbolView>, active: Set<Key>) {
    for (const [uid, view] of nodes)
      if (!active.has(uid)) {
        view.destroy();
        nodes.delete(uid);
      }
  }
  private tank(t: Tank, transform: FieldTransform, parent: Container) {
    let node = this.tankNodes.get(t);
    if (node && node.design !== t.design) {
      node.destroy();
      this.tankNodes.delete(t);
      node = undefined;
    }
    if (!node) {
      node = new TankView(t.design, this.assets, this.rasterTextures);
      this.tankNodes.set(t, node);
    }
    if (node.container.parent !== parent) parent.addChild(node.container);
    node.update(t);
    const point = fieldPoint(t, transform);
    node.container.position.set(point.x, point.y);
    node.container.scale.set(transform.scale);
    return node;
  }
  draw(world: World, settings: Settings) {
    if (settings.quality !== this.quality) {
      this.quality = settings.quality;
      this.app.renderer.resize(550, 450, settings.quality === 'high' ? 2 : 1);
      this.app.canvas.style.imageRendering = settings.quality === 'low' ? 'pixelated' : 'auto';
    }
    this.overlay.clear();
    const main = world.mainEffects;
    this.app.stage.position.set(
      this.externalMainEffects ? 0 : main.position.x,
      this.externalMainEffects ? 0 : main.position.y,
    );
    this.root.position.set(STAGE.cx, STAGE.cy);
    this.root.scale.set(settings.zoom);
    const activeFields = world.attachedFields().map(({ field }) => field);
    this.captions?.update(world);
    // Retain detached wrappers' display identities. Rooted orphan wrappers still paint.
    for (const view of this.underAvatarNodes.values()) view.root.visible = false;
    if (this.assets.mode === 'swf')
      for (const field of activeFields) {
        world.fieldDisplays.requireResolvedGeometry(field);
        const read = world.fieldDisplays.read(field);
        let view = this.underAvatarNodes.get(field);
        if (!view) {
          view = new FieldUnderAvatarView(read, this.assets, this.rasterTextures);
          this.underAvatarNodes.set(field, view);
          this.underAvatars.addChild(view.root);
        }
        view.update(read, fieldTransform(world, field));
      }

    for (const [field, node] of this.fieldNodes)
      if (!activeFields.includes(field)) {
        node.destroy();
        this.fieldNodes.delete(field);
      }
    for (const [field, view] of this.highlightNodes)
      if (!activeFields.includes(field)) {
        view.destroy();
        this.highlightNodes.delete(field);
      }
    const states = world.attachedFields().map((state) => ({
      ...state,
      transform: fieldTransform(world, state.field, 'actors'),
    }));
    for (const { field } of states) {
      const node = this.fieldNode(field),
        raster = this.assets.extras.get(1537),
        transform = fieldTransform(world, field, 'background'),
        scale = transform.scale;
      node.visible = world.fieldDisplays.read(field).root.rooted;
      node.alpha = transform.alpha ?? 1;
      if (raster) {
        node.position.set(transform.x + raster.x * scale, transform.y + raster.y * scale);
        node.width = raster.width * scale;
        node.height = raster.height * scale;
      } else {
        node.position.set(transform.x, transform.y);
        node.scale.set(scale);
      }
      if (this.assets.mode === 'swf' && this.assets.hasSymbol(1780)) {
        let highlight = this.highlightNodes.get(field);
        if (!highlight) {
          highlight = new SwfSymbolView(1780, this.assets, this.rasterTextures);
          this.highlightNodes.set(field, highlight);
          this.highlights.addChild(highlight.root);
        }
        const source = world.worldDisplays.read(field, 'highlight');
        const pose = worldLayerTransform(world, field, 'highlight');
        const point = fieldPoint({ x: 0, y: 0 }, pose);
        highlight.root.position.set(point.x, point.y);
        highlight.root.scale.set(pose.scale);
        highlight.setAlpha(source.pose.alpha);
        highlight.root.visible = source.rooted;
        highlight.update(1);
      }
    }
    // Setup places HUD last; AttachNewBubblefield raises the screen layer at first crossing.
    const screenInFront = world.transit !== null || world.connections.size > 0;
    if (
      this.app.stage.getChildIndex(this.screenEffects) >
        this.app.stage.getChildIndex(this.mapArt) !==
      screenInFront
    )
      this.app.stage.swapChildren(this.screenEffects, this.mapArt);
    // Actual enemyLayer children, including empty/deactivated and display-only clips.
    // Field transforms remain the separate presentation adapter above.
    const tanks = states.flatMap(({ field, transform }, index) => {
      let layer = this.actorLayers.get(field);
      if (!layer) {
        layer = new Container();
        this.actorLayers.set(field, layer);
        this.entities.addChild(layer);
      }
      this.entities.setChildIndex(layer, index);
      layer.visible = (transform.alpha ?? 1) !== 0;
      return [...world.actorParents.owned(field)].map((tank, childIndex) => {
        const view = this.tank(tank, transform, layer);
        layer.setChildIndex(view.container, childIndex);
        return { tank, transform };
      });
    });
    const playerTransform = avatarTransform(world);
    const playerNode = this.tank(world.player, playerTransform, this.entities);
    tanks.push({ tank: world.player, transform: playerTransform });
    const retained = new Set(tanks.map(({ tank }) => tank));
    for (const [tank, node] of this.tankNodes)
      if (!retained.has(tank)) {
        node.destroy();
        this.tankNodes.delete(tank);
      }
    for (const [field, layer] of this.actorLayers)
      if (!activeFields.includes(field)) {
        layer.destroy();
        this.actorLayers.delete(field);
      }
    // The avatar is a sibling above the field enemy layers, not one of their children.
    this.entities.setChildIndex(playerNode.container, this.entities.children.length - 1);
    for (const nodes of [this.mockShots])
      for (const [field, graphics] of nodes)
        if (!activeFields.includes(field)) {
          graphics.destroy();
          nodes.delete(field);
        }
    for (const graphics of this.mockShots.values()) graphics.clear();
    const nativeBulletIds = new Set<number>();
    for (const { runtime, field } of states) {
      const transform = worldLayerTransform(world, field, 'bullet');
      let drawing = this.mockShots.get(field);
      if (!drawing) {
        drawing = new Graphics();
        this.mockShots.set(field, drawing);
        this.projectiles.addChild(drawing);
      }
      drawing.position.set(transform.x, transform.y);
      drawing.scale.set(transform.scale);
      for (const b of runtime.bullets) {
        if (b.dead) continue;
        if (this.assets.mode === 'swf' && this.assets.hasSymbol(b.symbol)) {
          const view = this.nativeSymbol(b.symbol, b.uid, this.bulletNodes, this.nativeShots);
          const point = fieldPoint(b, transform);
          view.root.position.set(point.x, point.y);
          view.root.angle = b.kind === 'grow' ? b.heading : b.angle;
          view.root.scale.set((b.artScale ?? 1) * transform.scale);
          view.setAlpha(b.artAlpha ?? 1);
          if (b.artPose) view.updatePose(b.artPose);
          else view.update(b.artFrame ?? b.age + 1);
          if (b.kind === 'beam' || b.kind === 'healBeam') setBeamLength(view, b.beamLength ?? 0);
          if (b.kind === 'turret' && b.build === 4 && b.stopped) {
            const record = tanks.find(({ tank }) => tank.uid === b.owner);
            const owner = record && fieldPoint(record.tank, record.transform);
            const turret = view.namedChild('inner_mc')?.namedChild('turret_mc');
            if (owner && turret)
              turret.root.angle = Math.atan2(owner.y - point.y, owner.x - point.x) / DEG - b.angle;
          }
          nativeBulletIds.add(b.uid);
          continue;
        }
        const owner =
          b.kind === 'turret' ? tanks.find(({ tank }) => tank.uid === b.owner) : undefined;
        if (drawMockProjectile(drawing, b, owner?.tank)) continue;
        if (b.artPose && !b.artPose.placements.length) continue;
        const color = b.enemy ? 0xdf6688 : 0xff503b;
        if (b.kind === 'whip') {
          for (const p of whipSamples(b)) {
            drawing
              .circle(p.x, p.y, 5)
              .fill({ color: 0xffcf46, alpha: 0.8 })
              .stroke({ color: 0xffffae, alpha: 0.7, width: 1 });
          }
        } else if (b.kind === 'beam' || b.kind === 'healBeam') {
          const ex = b.x + Math.cos(b.angle * DEG) * (b.beamLength ?? b.speed),
            ey = b.y + Math.sin(b.angle * DEG) * (b.beamLength ?? b.speed);
          drawing
            .moveTo(b.x, b.y)
            .lineTo(ex, ey)
            .stroke({ color: b.kind === 'beam' ? 0xc9faff : 0x7dffad, width: 2, alpha: 0.85 });
        } else if (b.kind === 'turret') {
          drawing
            .circle(b.x, b.y, 8)
            .fill({ color: 0xa9b4ee, alpha: 0.3 })
            .stroke({ color: 0xf5ebff, width: 1 });
          drawing
            .circle(b.x, b.y, Math.max(1, (b.build ?? 1) * 1.4))
            .fill({ color: 0xe1dbff, alpha: 0.6 });
        } else if (b.kind === 'mine' || b.kind === 'seekerMine') {
          drawing
            .circle(b.x, b.y, 4)
            .fill({
              color: b.kind === 'mine' ? 0xc7a5df : 0x79adb4,
              alpha: b.kind === 'seekerMine' ? 0.35 : 0.8,
            })
            .stroke({ color: 0xffffff, width: 0.5, alpha: 0.6 });
        } else {
          const dx = Math.cos(b.angle * DEG),
            dy = Math.sin(b.angle * DEG);
          drawing
            .moveTo(b.x - dx * 7, b.y - dy * 7)
            .lineTo(b.x, b.y)
            .stroke({
              color: b.status ? 0xba7cdf : color,
              width: Math.max(1, b.radius),
              alpha: 0.7 * (b.artAlpha ?? 1),
            });
          drawing
            .circle(b.x, b.y, Math.max(0.9, b.radius * 0.65))
            .fill({ color: b.enemy ? 0xf5c9e4 : 0xfff2bf, alpha: b.artAlpha ?? 1 });
        }
      }
    }
    this.pruneSymbols(this.bulletNodes, nativeBulletIds);
    const displayedPickups = new Set<Pickup>();
    let pickupIndex = 0;
    for (const { field } of states) {
      const transform = fieldTransform(world, field, 'life');
      for (const b of world.pickupDisplays.owned(field)) {
        const clip = world.pickupDisplays.read(b)!.clip;
        displayedPickups.add(b);
        if (this.assets.mode === 'swf') {
          const view = this.nativeSymbol(clip.symbol, b, this.pickupNodes, this.nativePickups);
          this.nativePickups.setChildIndex(view.root, pickupIndex++);
          const point = fieldPoint(b, transform);
          view.root.position.set(point.x, point.y);
          view.root.angle = b.rotation;
          view.root.scale.set(transform.scale);
          view.setParentAlpha(transform.alpha ?? 1);
          view.updatePose(clip.pose);
          continue;
        }
        let drawing = this.mockPickups.get(b);
        if (!drawing) {
          drawing = new Graphics();
          this.mockPickups.set(b, drawing);
          this.pickupArt.addChild(drawing);
        }
        this.pickupArt.setChildIndex(drawing, pickupIndex++);
        drawing.clear();
        const point = fieldPoint(b, transform);
        drawing.position.set(point.x, point.y);
        const authoredScale =
          clip.symbol === 1820 ? 2.2500152587890625 : clip.symbol === 1817 ? 1.6759185791015625 : 1;
        const pulse = (clip.pose.placements[0]?.matrix.a ?? authoredScale) / authoredScale;
        drawing.scale.set(transform.scale * pulse);
        drawing.alpha = transform.alpha ?? 1;
        const r = clip.symbol === 1820 ? 8 : clip.symbol === 1817 ? 4 : 2;
        drawing.circle(0, 0, r + 2).fill({ color: 0x9dff35, alpha: 0.08 });
        drawing
          .circle(0, 0, r)
          .fill({ color: 0x5bc52e, alpha: 0.4 })
          .stroke({ color: 0xb6ff63, alpha: 0.85, width: 0.7 });
        drawing.circle(-r * 0.35, -r * 0.35, Math.max(0.5, r * 0.18)).fill(0xeaffb9);
      }
    }
    this.pruneSymbols(this.pickupNodes, displayedPickups);
    for (const [pickup, drawing] of this.mockPickups)
      if (!displayedPickups.has(pickup)) {
        drawing.destroy();
        this.mockPickups.delete(pickup);
      }
    this.combatEffects?.update(projectEffects(world));
    this.tacticalHud?.update(world.tacticalHud);
    this.minimap?.update(world);
    this.hud?.update(world);
    this.editSlider?.update(world.editSlider);
    if (!this.externalMainEffects)
      for (const flash of main.flashes)
        this.overlay.rect(-40, -40, 630, 530).fill({
          color: flash.color,
          alpha: Math.max(0, flash.alpha) * flash.fillAlpha,
        });
    this.app.render();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pruneSymbols(this.bulletNodes, new Set());
    this.pruneSymbols(this.pickupNodes, new Set());
    this.minimap?.destroy();
    this.hud?.destroy();
    this.editSlider?.destroy();
    this.captions?.destroy();
    for (const view of this.underAvatarNodes.values()) view.destroy();
    this.underAvatarNodes.clear();
    this.tacticalHud?.destroy();
    this.combatEffects?.destroy();
    for (const view of this.highlightNodes.values()) view.destroy();
    this.highlightNodes.clear();
    for (const tank of this.tankNodes.values()) tank.destroy();
    this.app.destroy({ removeView: true }, { children: true });
    this.rasterTextures.destroy();
    for (const tex of this.ownedTextures) tex.destroy(true);
    this.tankNodes.clear();
    this.actorLayers.clear();
    this.mockPickups.clear();
    this.fieldNodes.clear();
  }
}
