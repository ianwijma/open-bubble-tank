import { Container, Graphics, Text } from 'pixi.js';
import type { EditSliderState } from '../core/edit-slider';

export class EditSliderView {
  root = new Container();
  private shape = new Graphics();
  private text = new Text({
    text: '',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0xffffff },
  });
  constructor() {
    this.root.addChild(this.shape, this.text);
  }
  update(state: EditSliderState) {
    this.root.position.set(state.x, state.y);
    const hovered = state.hovered && state.enabled;
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
  destroy() {
    this.root.destroy({ children: true });
  }
}
