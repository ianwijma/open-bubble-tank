import { Container, Graphics } from 'pixi.js';
import { MINIMAP, mapCenter, mapDotFrame } from '../core/minimap';
import type { World } from '../simulation/world';

/** The compact / large / hidden map, fixed in stage coordinates. */
export class MinimapView {
  root = new Container();
  private paint = new Graphics();
  constructor() {
    this.root.position.set(MINIMAP.origin.x, MINIMAP.origin.y);
    this.root.addChild(this.paint);
  }
  update(world: World) {
    this.drawMock(world);
  }
  private drawMock(world: World) {
    const g = this.paint,
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
      // The simple fallback uses the same viewport and cell spacing as the authored map.
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
    this.root.destroy({ children: true });
  }
}
