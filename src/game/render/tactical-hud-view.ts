import { Container, Graphics } from 'pixi.js';
import { STAGE } from '../core/constants';
import { rotate } from '../core/math';
import type { TacticalHudState } from '../core/tactical-hud';

/** _-GW rings, AInterfaceRadar arrows and _-Yb readouts are siblings of the fixed-stage HUD. */
export class TacticalHudView {
  root = new Container();
  private mock = new Graphics();
  constructor() {
    this.root.addChild(this.mock);
  }
  update(state: TacticalHudState) {
    this.drawMock(state);
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
    this.root.destroy({ children: true });
  }
}
