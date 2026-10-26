import { ColorMatrixFilter, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import { HUD } from '../core/hud';
import type { EditSliderState } from '../core/edit-slider';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

export class EditSliderView {
  root = new Container();
  private native?: SwfSymbolView;
  private boost = new ColorMatrixFilter();
  private lastFrame = -1;
  private lastHovered = false;
  private shape = new Graphics();
  private text = new Text({
    text: '',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0xffffff },
  });
  constructor(assets: AssetPack, textures: RasterTextures) {
    this.boost.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0];
    if (assets.mode === 'swf') {
      this.native = new SwfSymbolView(HUD.edit.symbol, assets, textures);
      this.root.addChild(this.native.root);
    } else this.root.addChild(this.shape, this.text);
  }
  update(state: EditSliderState) {
    this.root.position.set(state.x, state.y);
    const hovered = state.hovered && state.enabled;
    if (this.native) {
      this.native.update(1, state.layout.frame);
      if (this.lastFrame !== state.layout.frame || this.lastHovered !== hovered) {
        // Flash carries alpha=2 as a color-transform multiplier to each leaf. Pixi clamps container alpha.
        const visit = (node: Container) => {
          if (node instanceof Sprite) node.filters = hovered ? [this.boost] : null;
          else for (const child of node.children) visit(child);
        };
        visit(this.native.root);
        this.lastFrame = state.layout.frame;
        this.lastHovered = hovered;
      }
    } else {
      const b = state.layout.bounds;
      this.shape
        .clear()
        .roundRect(b.x, b.y, b.width, b.height, 6)
        .fill({ color: 0xffffff, alpha: hovered ? 0.4 : 0.2 });
      this.text.text = state.layout.frame === 1 ? 'E' : 'EDIT YOUR TANK';
      this.text.alpha = hovered ? 1 : 0.8;
      this.text.anchor.set(0.5);
      this.text.position.set(b.x + b.width / 2, 0);
    }
  }
  destroy() {
    this.native?.destroy();
    this.root.destroy({ children: true });
    // These are unattached in native mode.
    if (!this.shape.destroyed) this.shape.destroy();
    if (!this.text.destroyed) this.text.destroy();
    this.boost.destroy();
  }
}
