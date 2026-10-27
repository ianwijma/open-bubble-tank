import { Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Effect } from '../core/types';
import { Random } from '../core/math';
import { STAGE } from '../core/constants';
import screenArt from '../data/screen-effect-art.json';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** Separate under-field and over-projectile layers, sharing the engine's effect identities. */
export class CombatEffectsView {
  bottom = new Container();
  top = new Container();
  screen = new Container();
  private mockBottom = new Graphics();
  private mockTop = new Graphics();
  private mockScreen = new Graphics();
  private nodes = new Map<number, SwfSymbolView>();
  private lines = new Map<number, Graphics>();
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {
    this.bottom.addChild(this.mockBottom);
    this.top.addChild(this.mockTop);
    this.screen.position.set(STAGE.cx, STAGE.cy);
    this.screen.addChild(this.mockScreen);
  }
  update(effects: readonly Effect[]) {
    const active = new Set<number>();
    this.mockBottom.clear();
    this.mockTop.clear();
    this.mockScreen.clear();
    for (const effect of effects) {
      const layer =
        effect.layer === 'screen'
          ? this.screen
          : effect.layer === 'bottom'
            ? this.bottom
            : this.top;
      if (effect.symbol && this.assets.mode === 'swf' && this.assets.hasSymbol(effect.symbol)) {
        active.add(effect.uid);
        let view = this.nodes.get(effect.uid);
        if (!view) {
          const random = new Random(effect.uid);
          view = new SwfSymbolView(effect.symbol, this.assets, this.textures, {
            random: () => random.next(),
          });
          this.nodes.set(effect.uid, view);
          layer.addChild(view.root);
        }
        view.root.position.set(effect.x, effect.y);
        view.root.angle = effect.rotation ?? 0;
        view.root.scale.set(effect.scale ?? 1);
        view.setBlendMode(effect.blendMode === 'layer' ? 2 : 1);
        view.update(effect.frame ?? effect.age + 1);
        const line = view.namedChild('line_mc')?.root;
        if (effect.line && line && !this.lines.has(effect.uid)) {
          const drawing = new Graphics()
            .moveTo(0, 0)
            .lineTo(effect.line.x, effect.line.y)
            .stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
          line.addChild(drawing);
          this.lines.set(effect.uid, drawing);
        }
        continue;
      }
      const graphics =
        layer === this.screen
          ? this.mockScreen
          : layer === this.bottom
            ? this.mockBottom
            : this.mockTop;
      const age = effect.frame !== undefined ? effect.frame - 1 : effect.age % effect.duration;
      const progress = age / Math.max(1, effect.duration - 1);
      const screenClip = Object.values(screenArt).find((clip) => clip.symbol === effect.symbol);
      if (effect.symbol === screenArt.collapse.symbol) {
        // Procedural substitute for the authored isolated erase/glow animation.
        const scale = effect.scale ?? 1,
          radius = 423.75 * scale * (0.35 + progress);
        graphics.circle(effect.x, effect.y, radius).stroke({
          color: 0xe3fcff,
          alpha: (1 - progress) * 0.65,
          width: Math.max(1, 35 * scale * (1 - progress)),
        });
      } else if (screenClip) {
        graphics.rect(-STAGE.cx, -STAGE.cy, STAGE.width, STAGE.height).fill({
          color: effect.symbol === screenArt.ink.symbol ? 0x101c36 : 0xffffff,
          alpha: screenClip.opacity[age] * (effect.symbol === screenArt.ink.symbol ? 0.85 : 1),
        });
      } else if (effect.symbol === 2175) {
        if (effect.line)
          graphics
            .moveTo(effect.x, effect.y)
            .lineTo(
              effect.x + effect.line.x * (effect.scale ?? 1),
              effect.y + effect.line.y * (effect.scale ?? 1),
            )
            .stroke({
              color: 0xffffff,
              width: 2 * (effect.scale ?? 1),
              alpha: 0.3 * (1 - progress),
            });
      } else {
        graphics
          .circle(effect.x, effect.y, Math.max(0.1, effect.radius * progress * (effect.scale ?? 1)))
          .stroke({
            color: effect.color,
            width: (effect.symbol === 1723 ? 2 : 1.3) * (effect.scale ?? 1),
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
  }
  destroy() {
    this.update([]);
    this.bottom.destroy({ children: true });
    this.top.destroy({ children: true });
    this.screen.destroy({ children: true });
  }
}
