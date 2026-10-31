import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { AssetPack, Raster } from '../assets/asset-pack';
import { STAGE } from '../core/constants';
import { DEG, Random } from '../core/math';
import type { Field, Settings, Tank } from '../core/types';
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
import { fieldPoint, fieldTransform, type FieldTransform } from './field-transform';

export class GameRenderer {
  app = new Application();
  root = new Container();
  fields = new Container();
  entities = new Container();
  projectiles = new Container();
  nativeShots = new Container();
  nativePickups = new Container();
  pickupArt = new Container();
  private mockShots = new Map<Field, Graphics>();
  private mockPickups = new Map<Field, Graphics>();
  private combatEffects?: CombatEffectsView;
  mapArt = new Container();
  private minimap?: MinimapView;
  private hud?: HudView;
  private editSlider?: EditSliderView;
  private captions?: FieldCaptions;
  private tacticalHud?: TacticalHudView;
  overlay = new Graphics();
  screenEffects = new Container();
  dust = new Graphics();
  private rasterTextures = new SwfTextures();
  private ownedTextures: Texture[] = [];
  private tankNodes = new Map<number, TankView>();
  private bulletNodes = new Map<number, SwfSymbolView>();
  private pickupNodes = new Map<number, SwfSymbolView>();
  private fieldNodes = new Map<Field, Sprite>();
  highlights = new Container();
  private highlightNodes = new Map<Field, SwfSymbolView>();
  private stars: { x: number; y: number; v: number; alpha: number }[] = [];
  private fieldTexture: Texture | null = null;
  private background: Sprite | null = null;
  private destroyed = false;
  private quality: Settings['quality'] | null = null;
  constructor(
    public assets: AssetPack,
    private externalMainEffects = false,
  ) {}
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
    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = 550;
    backgroundCanvas.height = 450;
    const ctx = backgroundCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, '#079fb0');
    gradient.addColorStop(1, '#0b3c5a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 550, 450);
    const texture = Texture.from(backgroundCanvas);
    this.ownedTextures.push(texture);
    this.background = new Sprite(texture);
    this.app.stage.addChild(
      this.background,
      this.dust,
      this.root,
      this.screenEffects,
      this.mapArt,
      this.overlay,
    );
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
      this.pickupArt,
      this.nativePickups,
      this.entities,
      this.projectiles,
      this.nativeShots,
      this.combatEffects.top,
      this.highlights,
    );
    const rng = new Random(390541);
    this.stars = Array.from({ length: 30 }, () => ({
      x: rng.next() * 550,
      y: rng.next() * 450,
      v: rng.next() * 0.3 + 0.1,
      alpha: rng.next() * 0.35 + 0.15,
    }));
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
  private nativeSymbol(
    id: number,
    uid: number,
    nodes: Map<number, SwfSymbolView>,
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
  private pruneSymbols(nodes: Map<number, SwfSymbolView>, active: Set<number>) {
    for (const [uid, view] of nodes)
      if (!active.has(uid)) {
        view.destroy();
        nodes.delete(uid);
      }
  }
  private tank(t: Tank, transform: FieldTransform) {
    let node = this.tankNodes.get(t.uid);
    if (node && node.design !== t.design) {
      node.destroy();
      this.tankNodes.delete(t.uid);
      node = undefined;
    }
    if (!node) {
      node = new TankView(t.design, this.assets, this.rasterTextures);
      this.entities.addChild(node.container);
      this.tankNodes.set(t.uid, node);
    }
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
    this.dust.clear();
    for (const s of settings.efficient ? this.stars.slice(0, 6) : this.stars) {
      const x =
        (((s.x - world.player.x * 0.15 + world.stats.frames * s.v * 0.15) % 550) + 550) % 550;
      const y =
        (((s.y - world.player.y * 0.15 + world.stats.frames * s.v * 0.1) % 450) + 450) % 450;
      this.dust.rect(x, y, 0.7, 0.7).fill({ color: 0xe3fdff, alpha: s.alpha });
    }
    this.root.position.set(STAGE.cx - world.player.x, STAGE.cy - world.player.y);
    this.root.scale.set(settings.zoom);
    this.root.position.set(
      STAGE.cx - world.player.x * settings.zoom,
      STAGE.cy - world.player.y * settings.zoom,
    );
    const activeFields = [world.field, ...(world.transit ? [world.transit.next] : [])];
    this.captions?.update(world);
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
    const states = world.activeFields().map((state) => ({
      ...state,
      transform: fieldTransform(world, state.field, state.offset),
    }));
    for (const { field, transform } of states) {
      const node = this.fieldNode(field),
        raster = this.assets.extras.get(1537),
        scale = field.scale * transform.scale;
      node.visible = !field.destroyed;
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
        highlight.root.position.set(transform.x, transform.y);
        highlight.root.scale.set(
          world.collapse?.field === field && world.collapse.age > 0 ? transform.scale : field.scale,
        );
        highlight.root.visible = !field.destroyed;
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
    const tanks = [
      { tank: world.player, transform: fieldTransform(world, world.currentWrapper) },
      ...states.flatMap(({ field, runtime, transform }) =>
        [...field.enemies, ...runtime.allies]
          .filter((tank) => !tank.dead)
          .map((tank) => ({ tank, transform })),
      ),
    ];
    for (const [id, node] of this.tankNodes)
      if (!tanks.some(({ tank }) => tank.uid === id)) {
        node.destroy();
        this.tankNodes.delete(id);
      }
    for (const { tank, transform } of tanks) this.tank(tank, transform);
    // Keep the avatar above the enemy layer, as in the Flash display list.
    const playerNode = this.tankNodes.get(world.player.uid);
    if (playerNode)
      this.entities.setChildIndex(playerNode.container, this.entities.children.length - 1);
    for (const nodes of [this.mockShots, this.mockPickups])
      for (const [field, graphics] of nodes)
        if (!activeFields.includes(field)) {
          graphics.destroy();
          nodes.delete(field);
        }
    for (const graphics of this.mockShots.values()) graphics.clear();
    const nativeBulletIds = new Set<number>();
    for (const { runtime, field, transform } of states) {
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
    for (const graphics of this.mockPickups.values()) graphics.clear();
    const nativePickupIds = new Set<number>();
    for (const { runtime, field, transform } of states) {
      let drawing = this.mockPickups.get(field);
      if (!drawing) {
        drawing = new Graphics();
        this.mockPickups.set(field, drawing);
        this.pickupArt.addChild(drawing);
      }
      drawing.position.set(transform.x, transform.y);
      drawing.scale.set(transform.scale);
      for (const b of runtime.pickups) {
        if (this.assets.mode === 'swf') {
          const view = this.nativeSymbol(
            b.value === 50 ? 1820 : b.value === 5 ? 1817 : 1816,
            b.uid,
            this.pickupNodes,
            this.nativePickups,
          );
          const point = fieldPoint(b, transform);
          view.root.position.set(point.x, point.y);
          view.root.angle = b.rotation;
          view.root.scale.set(transform.scale);
          view.update(world.stats.frames + b.uid);
          nativePickupIds.add(b.uid);
          continue;
        }
        const r = b.value === 50 ? 8 : b.value === 5 ? 4 : 2;
        drawing.circle(b.x, b.y, r + 2).fill({ color: 0x9dff35, alpha: 0.08 });
        drawing
          .circle(b.x, b.y, r)
          .fill({ color: 0x5bc52e, alpha: 0.4 })
          .stroke({ color: 0xb6ff63, alpha: 0.85, width: 0.7 });
        drawing.circle(b.x - r * 0.35, b.y - r * 0.35, Math.max(0.5, r * 0.18)).fill(0xeaffb9);
      }
    }
    this.pruneSymbols(this.pickupNodes, nativePickupIds);
    this.combatEffects?.update(
      states.flatMap(({ runtime, transform }) =>
        runtime.effects.map((effect) => {
          if (effect.layer === 'screen') return effect;
          const scale = effect.layer === 'bottom' ? transform.scale ** 2 : transform.scale;
          return {
            ...fieldPoint(effect, { ...transform, scale }),
            scale: (effect.scale ?? 1) * scale,
          };
        }),
      ),
    );
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
    this.tacticalHud?.destroy();
    this.combatEffects?.destroy();
    for (const view of this.highlightNodes.values()) view.destroy();
    this.highlightNodes.clear();
    for (const tank of this.tankNodes.values()) tank.destroy();
    this.app.destroy({ removeView: true }, { children: true });
    this.rasterTextures.destroy();
    for (const tex of this.ownedTextures) tex.destroy(true);
    this.tankNodes.clear();
    this.fieldNodes.clear();
  }
}
