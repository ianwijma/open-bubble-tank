import { Container, Graphics, Text } from 'pixi.js';
import { HUD, fireLayout, type HudReadout } from '../core/hud';
import type { World } from '../simulation/world';

/** The native life/fire widgets remain in stage coordinates, independently of camera zoom. */
export class HudView {
  root = new Container();
  private mockLife = new Container();
  private mockFire = new Container();
  private mockLifeArt = new Graphics();
  private mockFireArt = new Graphics();
  private mockLabels = new Map<string, Text>();
  constructor() {
    this.mockLife.addChild(this.mockLifeArt);
    this.mockFire.addChild(this.mockFireArt);
    this.mockLife.alpha = HUD.life.alpha;
    this.root.addChild(this.mockLife, this.mockFire);
  }
  update(world: World) {
    this.drawMock(world, world.hud.readout(world.player, world.secondaryCounter));
  }
  private mockLabel(
    parent: Container,
    key: string,
    text: string,
    x: number,
    y: number,
    right = false,
  ) {
    let label = this.mockLabels.get(key);
    if (!label) {
      label = new Text({
        text,
        style: { fontFamily: 'Arial, sans-serif', fontSize: 10, letterSpacing: 1, fill: 0xffffff },
      });
      this.mockLabels.set(key, label);
      parent.addChild(label);
    }
    label.visible = true;
    label.text = text;
    label.anchor.x = right ? 1 : 0;
    label.position.set(x, y);
  }
  private drawMock(world: World, readout: HudReadout) {
    const { rows, rate, secondaryFill } = readout;
    for (const label of this.mockLabels.values()) label.visible = false;
    this.mockLife.position.set(HUD.life.x, world.hud.lifeY);
    this.mockFire.position.set(HUD.fire.x, world.hud.fireY);
    const l = this.mockLifeArt.clear(),
      f = this.mockFireArt.clear();
    l.roundRect(-17.7, 0, 524.2, 41, 7).fill({ color: 0xffffff, alpha: 0.2 });
    l.rect(-7.5, 22, (501.5 * readout.life) / readout.maxLife, 11).fill({
      color: 0xffffff,
      alpha: 0.7,
    });
    l.rect(-7.85, 21.65, 502.2, 11.7).stroke({ color: 0xffffff, alpha: 0.8, width: 0.75 });
    this.mockLabel(this.mockLife, 'name', readout.name, -5.5, 6.45);
    this.mockLabel(
      this.mockLife,
      'life',
      `${readout.maxLife - readout.life} Bubbles left`,
      492.95,
      6.45,
      true,
    );
    this.mockFire.visible = rows.length > 0 || rate > 0;
    const layout = fireLayout(rows.length);
    const count = Math.max(1, Math.min(9, rows.length));
    f.roundRect(-26.05, 0.45, 122.45, 24 + 15 * (count - 1), 7).fill({
      color: 0xffffff,
      alpha: 0.2,
    });
    for (let i = 0; i < count; i++) {
      const y = i ? 28.1 + 15 * (i - 1) : 12.85;
      f.rect(22, y - 5.5, 67.45 * (rows[i]?.fill ?? secondaryFill), 11).fill({
        color: 0xffffff,
        alpha: 0.7,
      });
      f.rect(21.65, y - 5.85, 67.65, 11.7).stroke({ color: 0xffffff, alpha: 0.8, width: 0.75 });
      const label = layout.labels[i];
      const textInfo = HUD.texts[String(label.id) as keyof typeof HUD.texts];
      this.mockLabel(
        this.mockFire,
        `primary${i}`,
        rows[i]?.label ?? '2nd',
        label.x + textInfo.bounds.xMax / 20 - 2,
        label.y,
        true,
      );
    }
    if (rows.length && rate) {
      const y = 42.45 + 15.4 * (rows.length - 1);
      f.roundRect(-26.05, y - 12, 122.45, 24, 7).fill({ color: 0xffffff, alpha: 0.2 });
      f.rect(22, y - 6.1, 67.45 * secondaryFill, 11).fill({ color: 0xffffff, alpha: 0.7 });
      f.rect(22, y - 6.1, 66.95, 11).stroke({ color: 0xffffff, alpha: 0.8, width: 0.75 });
      this.mockLabel(this.mockFire, 'secondary', '2nd', 18, y - 6.5, true);
    }
  }
  destroy() {
    this.root.destroy({ children: true });
  }
}
