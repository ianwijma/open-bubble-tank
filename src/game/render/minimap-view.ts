import { ColorMatrixFilter, Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import { MINIMAP, mapDotFrame, mapCenter, type MapMode } from '../core/minimap';
import type { World } from '../simulation/world';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** AvatarInterface's compact / large / hidden map, fixed in stage coordinates. */
export class MinimapView {
  root = new Container();
  private widget?: SwfSymbolView;
  private button?: SwfSymbolView;
  private entries = new Container();
  private dots = new Map<string, SwfSymbolView>();
  private links = new Graphics();
  private mock = new Graphics();
  private maskAlpha = new ColorMatrixFilter();
  private lastMode?: MapMode;
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {
    this.root.position.set(MINIMAP.origin.x, MINIMAP.origin.y);
    this.entries.addChild(this.links);
    if (assets.mode === 'swf') {
      this.widget = new SwfSymbolView(MINIMAP.symbol, assets, textures);
      this.button = new SwfSymbolView(MINIMAP.button, assets, textures);
      this.root.addChild(this.widget.root, this.button.root);
      // The authored vector mask has 128 alpha. Flash clips by its geometry, not that opacity.
      this.maskAlpha.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 255 / 128, 0];
    } else this.root.addChild(this.mock);
  }
  update(world: World) {
    const mode = world.mapMode,
      layout = MINIMAP.modes[mode - 1];
    const center = mapCenter(world);
    if (!this.widget || !this.button) {
      this.drawMock(world);
      return;
    }
    // External entries must survive replacement of the authored map_mc at a frame change.
    if (this.lastMode !== mode) this.entries.removeFromParent();
    this.widget.update(1, mode);
    this.lastMode = mode;
    this.widget.root.visible = mode !== 3;
    this.button.update(1, world.mapHovered ? 2 : 1);
    this.button.namedChild('icon_mc')?.update(1, mode);
    const map = this.widget.namedChild('map_mc');
    if (!map) return;
    map.root.position.set(
      layout.center.x - center.col * 25 * layout.scale,
      layout.center.y - center.row * 25 * layout.scale,
    );
    if (map.root.mask instanceof Container) map.root.mask.filters = [this.maskAlpha];
    const origin = world.fields.get('0,0');
    map.namedChild('homeBubble_mc')?.update(1, origin ? mapDotFrame(origin) : 1);
    this.links.clear();
    for (const { from, to } of world.connections.values()) {
      const dx = to.col - from.col,
        dy = to.row - from.row,
        distance = Math.hypot(dx, dy);
      if (!distance) continue;
      this.links
        .moveTo(from.col * 25 + (dx / distance) * 7.5, from.row * 25 + (dy / distance) * 7.5)
        .lineTo(to.col * 25 - (dx / distance) * 7.5, to.row * 25 - (dy / distance) * 7.5)
        .stroke({ color: 0xffffff, width: 2, cap: 'butt' });
    }
    for (const [key, dot] of this.dots)
      if (!world.fields.has(key)) {
        dot.destroy();
        this.dots.delete(key);
      }
    for (const [key, field] of world.fields) {
      if (field.col === 0 && field.row === 0) continue;
      let dot = this.dots.get(key);
      if (!dot) {
        dot = new SwfSymbolView(MINIMAP.dot, this.assets, this.textures);
        this.dots.set(key, dot);
        this.entries.addChild(dot.root);
      }
      dot.root.position.set(field.col * 25, field.row * 25);
      dot.update(1, mapDotFrame(field));
    }
    if (this.entries.parent !== map.root) map.root.addChild(this.entries);
  }
  private drawMock(world: World) {
    const g = this.mock,
      mode = world.mapMode,
      layout = MINIMAP.modes[mode - 1];
    const center = mapCenter(world);
    g.clear();
    if (layout.size) {
      g.roundRect(0, 0, layout.size.width, layout.size.height, 8)
        .fill({ color: 0xffffff, alpha: 0.05 })
        .stroke({ color: 0xffffff, alpha: 0.2, width: 5 });
      const x = (col: number) => layout.center.x + (col - center.col) * 25 * layout.scale;
      const y = (row: number) => layout.center.y + (row - center.row) * 25 * layout.scale;
      // The simple fallback uses the same viewport and cell spacing as the native map.
      const inside = (col: number, row: number) =>
        x(col) > 8 &&
        y(row) > 8 &&
        x(col) < layout.size!.width - 8 &&
        y(row) < layout.size!.height - 8;
      for (const { from, to } of world.connections.values()) {
        if (inside(from.col, from.row) && inside(to.col, to.row))
          g.moveTo(x(from.col), y(from.row))
            .lineTo(x(to.col), y(to.row))
            .stroke({ color: 0xffffff, width: 2 * layout.scale });
      }
      for (const field of world.fields.values()) {
        if (!inside(field.col, field.row)) continue;
        const cx = x(field.col),
          cy = y(field.row),
          r = 7.5 * layout.scale;
        g.circle(cx, cy, r)
          .fill({ color: 0xffffff, alpha: mapDotFrame(field) === 1 ? 0.3 : 0 })
          .stroke({ color: 0xffffff, width: layout.scale });
        if (field.destroyed)
          g.moveTo(cx - r, cy - r)
            .lineTo(cx + r, cy + r)
            .moveTo(cx + r, cy - r)
            .lineTo(cx - r, cy + r)
            .stroke({ color: 0xffffff, width: 1.5 * layout.scale });
      }
      g.circle(layout.center.x, layout.center.y, 1.75).fill({ color: 0xffffff, alpha: 0.75 });
    }
    g.roundRect(0, 0, 24.5, 24, 6).fill({ color: 0xffffff, alpha: world.mapHovered ? 0.5 : 0.2 });
    if (mode === 2) g.moveTo(6, 6.5).lineTo(17.4, 6.5).stroke({ color: 0xffffff, width: 1 });
    else {
      g.rect(6, 6.5, 11.4, 11).stroke({ color: 0xffffff, width: 1 });
      if (mode === 1) g.circle(11.7, 11.75, 1.75).stroke({ color: 0xffffff, width: 1 });
      else
        g.moveTo(11.7, 6.5)
          .lineTo(11.7, 17.5)
          .moveTo(6, 12)
          .lineTo(17.4, 12)
          .stroke({ color: 0xffffff, width: 1 });
    }
  }
  destroy() {
    this.entries.removeFromParent();
    this.widget?.destroy();
    this.button?.destroy();
    for (const dot of this.dots.values()) dot.destroy();
    this.entries.destroy({ children: true });
    this.root.destroy({ children: true });
    this.maskAlpha.destroy();
  }
}
