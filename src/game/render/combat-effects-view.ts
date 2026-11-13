import { Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Effect } from '../core/types';
import { readEffectPlayback } from '../simulation/effect-playback';
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
      const playback = readEffectPlayback(identity);
      const layer =
        effect.layer === 'screen'
          ? this.screen
          : effect.layer === 'bottom'
            ? this.bottom
            : this.top;
      const index = order.get(layer) ?? 0;
      order.set(layer, index + 1);
      if (
        playback.status === 'retained' &&
        this.assets.mode === 'swf' &&
        this.assets.hasSymbol(playback.symbol)
      ) {
        active.add(identity);
        let view = this.nodes.get(identity);
        if (!view) {
          view = new SwfSymbolView(playback.symbol, this.assets, this.textures);
          this.nodes.set(identity, view);
        }
        if (view.root.parent !== layer) layer.addChild(view.root);
        layer.setChildIndex(view.root, index);
        view.root.position.set(effect.x, effect.y);
        view.root.angle = effect.rotation ?? 0;
        view.root.scale.set(effect.scale ?? 1);
        view.setBlendMode(effect.blendMode === 'layer' ? 2 : 1);
        view.setParentAlpha(alpha);
        view.updatePose(playback.pose);
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
      const duration = playback.status === 'retained' ? playback.totalFrames : effect.duration;
      const age =
        playback.status === 'retained'
          ? playback.currentFrame - 1
          : effect.frame !== undefined
            ? effect.frame - 1
            : effect.age % duration;
      const progress = age / Math.max(1, duration - 1);
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
        const placement =
          playback.status === 'retained'
            ? playback.pose.placements.find(
                (p) => playback.pose.children.get(p.depth)?.clip === playback.lineTarget,
              )
            : undefined;
        const lines =
          placement && playback.status === 'retained' ? (playback.lineTarget?.lines ?? []) : [];
        graphics.moveTo(0, 0);
        for (const line of lines)
          graphics.lineTo(line.x, line.y).stroke({
            color: line.color,
            width: line.width,
            alpha: line.alpha * (placement?.color?.mult[3] ?? 1),
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
