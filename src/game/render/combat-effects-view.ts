import { Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Effect } from '../core/types';
import { Random } from '../core/math';
import { STAGE } from '../core/constants';
import screenArt from '../data/screen-effect-art.json';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** Paint projection retains the actual engine object independently of its transformed values. */
export interface EffectPaint extends Effect {
  readonly clip?: Effect;
  readonly parentAlpha?: number;
}

/** Separate under-field and over-projectile layers, sharing the engine's effect identities. */
export class CombatEffectsView {
  bottom = new Container();
  top = new Container();
  screen = new Container();
  private mockNodes = new Map<Effect, Graphics>();
  private nodes = new Map<Effect, SwfSymbolView>();
  private lines = new Map<Effect, Graphics>();
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {
    this.screen.position.set(STAGE.cx, STAGE.cy);
  }
  update(effects: readonly EffectPaint[]) {
    const active = new Set<Effect>();
    const mockActive = new Set<Effect>();
    const order = new Map<Container, number>();
    for (const effect of effects) {
      const identity = effect.clip ?? effect;
      const alpha = effect.parentAlpha ?? 1;
      const layer =
        effect.layer === 'screen'
          ? this.screen
          : effect.layer === 'bottom'
            ? this.bottom
            : this.top;
      const index = order.get(layer) ?? 0;
      order.set(layer, index + 1);
      if (effect.symbol && this.assets.mode === 'swf' && this.assets.hasSymbol(effect.symbol)) {
        active.add(identity);
        let view = this.nodes.get(identity);
        if (!view) {
          const random = new Random(effect.uid);
          view = new SwfSymbolView(effect.symbol, this.assets, this.textures, {
            random: () => random.next(),
          });
          this.nodes.set(identity, view);
        }
        if (view.root.parent !== layer) layer.addChild(view.root);
        layer.setChildIndex(view.root, index);
        view.root.position.set(effect.x, effect.y);
        view.root.angle = effect.rotation ?? 0;
        view.root.scale.set(effect.scale ?? 1);
        view.setBlendMode(effect.blendMode === 'layer' ? 2 : 1);
        view.setParentAlpha(alpha);
        view.update(effect.frame ?? effect.age + 1);
        const line = view.namedChild('line_mc')?.root;
        if (effect.line && line && !this.lines.has(identity)) {
          const drawing = new Graphics()
            .moveTo(0, 0)
            .lineTo(effect.line.x, effect.line.y)
            .stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
          line.addChild(drawing);
          this.lines.set(identity, drawing);
        }
        continue;
      }
      mockActive.add(identity);
      let graphics = this.mockNodes.get(identity);
      if (!graphics) this.mockNodes.set(identity, (graphics = new Graphics()));
      if (graphics.parent !== layer) layer.addChild(graphics);
      layer.setChildIndex(graphics, index);
      graphics.clear();
      graphics.position.set(effect.x, effect.y);
      graphics.angle = effect.rotation ?? 0;
      graphics.scale.set(effect.scale ?? 1);
      graphics.alpha = alpha;
      const age = effect.frame !== undefined ? effect.frame - 1 : effect.age % effect.duration;
      const progress = age / Math.max(1, effect.duration - 1);
      const screenClip = Object.values(screenArt).find((clip) => clip.symbol === effect.symbol);
      if (effect.symbol === screenArt.collapse.symbol) {
        // Procedural substitute for the authored isolated erase/glow animation.
        const radius = 423.75 * (0.35 + progress);
        graphics.circle(0, 0, radius).stroke({
          color: 0xe3fcff,
          alpha: (1 - progress) * 0.65,
          width: Math.max(1, 35 * (1 - progress)),
        });
      } else if (screenClip) {
        graphics.rect(-STAGE.cx, -STAGE.cy, STAGE.width, STAGE.height).fill({
          color: effect.symbol === screenArt.ink.symbol ? 0x101c36 : 0xffffff,
          alpha: screenClip.opacity[age] * (effect.symbol === screenArt.ink.symbol ? 0.85 : 1),
        });
      } else if (effect.symbol === 2175) {
        if (effect.line)
          graphics
            .moveTo(0, 0)
            .lineTo(effect.line.x, effect.line.y)
            .stroke({
              color: 0xffffff,
              width: 2,
              alpha: 0.3 * (1 - progress),
            });
      } else {
        graphics.circle(0, 0, Math.max(0.1, effect.radius * progress)).stroke({
          color: effect.color,
          width: effect.symbol === 1723 ? 2 : 1.3,
          alpha: (1 - progress) * 0.7,
        });
      }
    }
    for (const [uid, view] of this.nodes)
      if (!active.has(uid)) {
        view.destroy();
        this.nodes.delete(uid);
        this.lines.delete(uid);
      }
    for (const [clip, graphics] of this.mockNodes)
      if (!mockActive.has(clip)) {
        graphics.destroy();
        this.mockNodes.delete(clip);
      }
  }
  destroy() {
    this.update([]);
    this.bottom.destroy({ children: true });
    this.top.destroy({ children: true });
    this.screen.destroy({ children: true });
  }
}
