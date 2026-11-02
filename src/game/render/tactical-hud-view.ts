import { Container, Graphics } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import { STAGE } from '../core/constants';
import { HUD } from '../core/hud';
import { rotate } from '../core/math';
import type { TacticalHudState } from '../core/tactical-hud';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** _-GW rings, AInterfaceRadar arrows and _-Yb readouts are siblings of the fixed-stage HUD. */
export class TacticalHudView {
  root = new Container();
  private allies = new Container();
  private passives = new Container();
  private nodes = new Map<string, SwfSymbolView>();
  private mock = new Graphics();
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {
    this.root.addChild(this.allies, this.passives, this.mock);
  }
  private node(key: string, symbol: number, layer: Container, active: Set<string>) {
    active.add(key);
    let view = this.nodes.get(key);
    if (!view) {
      view = new SwfSymbolView(symbol, this.assets, this.textures);
      this.nodes.set(key, view);
      layer.addChild(view.root);
    }
    layer.setChildIndex(view.root, layer.children.length - 1);
    return view;
  }
  update(state: TacticalHudState) {
    if (this.assets.mode === 'mock') {
      this.drawMock(state);
      return;
    }
    const active = new Set<string>();
    for (const ally of state.allies) {
      const view = this.node(`ally:${ally.uid}`, HUD.tactical.allyLife.symbol, this.allies, active);
      view.update(1, ally.frame);
      view.root.position.set(ally.x, ally.y);
      view.root.scale.set(ally.width / HUD.tactical.allyLife.bounds.width);
    }
    for (const indicator of state.passives) {
      const info = indicator.kind === 'health' ? HUD.tactical.enemyLife : HUD.tactical.radar;
      const view = this.node(
        `${indicator.kind}:${indicator.uid}`,
        info.symbol,
        this.passives,
        active,
      );
      view.update(1, 1);
      if (indicator.kind === 'health') {
        view.root.position.set(indicator.x, indicator.y);
        // Flash changes only width; the five-pixel native bar keeps its original height.
        view.root.scale.x = indicator.width / info.bounds.width;
        const fill = view.namedChild('bar_mc');
        if (fill) fill.root.scale.x = indicator.fill;
      } else {
        view.root.position.set(STAGE.cx, STAGE.cy);
        view.root.angle = indicator.angle;
      }
    }
    for (const [key, view] of this.nodes)
      if (!active.has(key)) {
        view.destroy();
        this.nodes.delete(key);
      }
  }
  private drawMock(state: TacticalHudState) {
    const g = this.mock.clear();
    for (const ally of state.allies) {
      const radius = ally.width / 2;
      g.circle(ally.x, ally.y, radius).stroke({ color: 0xffffff, alpha: 0.15, width: 2 });
      g.moveTo(ally.x, ally.y - radius);
      g.arc(
        ally.x,
        ally.y,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + ((101 - ally.frame) / 100) * Math.PI * 2,
      ).stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
    }
    for (const indicator of state.passives) {
      if (indicator.kind === 'health') {
        const left = indicator.x - indicator.width / 2;
        g.rect(left, indicator.y - 2.5, indicator.width, 5).fill({ color: 0xffffff, alpha: 0.2 });
        g.rect(left, indicator.y - 2, indicator.width * indicator.fill, 4).fill({
          color: 0xffffff,
          alpha: 0.8,
        });
      } else {
        const points = [
          { x: 200, y: -10 },
          { x: 220, y: 0 },
          { x: 200, y: 10 },
        ].flatMap((point) => {
          const p = rotate(point, indicator.angle);
          return [STAGE.cx + p.x, STAGE.cy + p.y];
        });
        g.poly(points).fill({ color: 0xffffff, alpha: 0.6 });
      }
    }
  }
  destroy() {
    for (const view of this.nodes.values()) view.destroy();
    this.nodes.clear();
    this.root.destroy({ children: true });
  }
}
