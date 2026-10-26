import { Container, Text } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import { TUTORIAL } from '../core/tutorial';
import type { Field } from '../core/types';
import type { World } from '../simulation/world';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** Caption clips live at field-local (0,0), not in the fixed HUD or the scaled bubble background. */
export class FieldCaptions {
  root = new Container();
  private nodes = new Map<Field, { stage: number; root: Container; native?: SwfSymbolView }>();
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {}
  update(world: World) {
    const fields = [world.field, ...(world.transit ? [world.transit.next] : [])];
    for (const [field, node] of this.nodes)
      if (!fields.includes(field) || node.stage !== field.tutorial) {
        node.native?.destroy();
        node.root.destroy({ children: true });
        this.nodes.delete(field);
      }
    for (const field of fields) {
      let node = this.nodes.get(field);
      if (!node) {
        const container = new Container(),
          layout = TUTORIAL.stages[field.tutorial];
        let native: SwfSymbolView | undefined;
        if (this.assets.mode === 'swf') {
          native = new SwfSymbolView(TUTORIAL.symbol, this.assets, this.textures);
          native.update(1, layout.frame);
          container.addChild(native.root);
        } else if (field.tutorial === 0) {
          const logo = new Text({
            text: 'ARMOR GAMES',
            style: {
              fontFamily: 'Arial, sans-serif',
              fontSize: 29,
              fontWeight: 'bold',
              fill: 0xffffff,
            },
          });
          logo.alpha = 0.421875;
          logo.anchor.set(0.5);
          container.addChild(logo);
        } else
          for (const line of layout.texts) {
            if (field.tutorial === 1 && line.text === 'w') continue;
            const label = line.text
              .replace('Use asd', 'Use WASD')
              .replace('hold to shoot.', 'hold LMB to shoot.');
            const text = new Text({
              text: label,
              style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: line.size,
                fontWeight: 'bold',
                fill: (line.color[0] << 16) | (line.color[1] << 8) | line.color[2],
              },
            });
            text.alpha = line.color[3] / 255;
            text.position.set(line.x, line.y - line.size * 0.8);
            container.addChild(text);
          }
        node = { stage: field.tutorial, root: container, native };
        this.nodes.set(field, node);
        this.root.addChild(container);
      }
      node.root.visible = !field.destroyed;
      node.root.position.set(
        field === world.field ? 0 : world.transit!.offset.x,
        field === world.field ? 0 : world.transit!.offset.y,
      );
    }
  }
  destroy() {
    for (const node of this.nodes.values()) node.native?.destroy();
    this.nodes.clear();
    this.root.destroy({ children: true });
  }
}
