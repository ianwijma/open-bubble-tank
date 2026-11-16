import { Container, Text } from 'pixi.js';
import { TUTORIAL } from '../core/tutorial';
import type { Field } from '../core/types';
import type { World } from '../simulation/world';
import { fieldPoint, tutorialTransform } from './field-transform';

/** Caption clips live at field-local (0,0), not in the fixed HUD or the scaled bubble background. */
export class FieldCaptions {
  root = new Container();
  private nodes = new Map<Field, { stage: number; root: Container }>();
  update(world: World) {
    const states = world.attachedFields();
    const fields = states.map(({ field }) => field);
    for (const [field, node] of this.nodes)
      if (
        !fields.includes(field) ||
        node.stage !== world.fieldDisplays.read(field).tutorial.stage
      ) {
        node.root.destroy({ children: true });
        this.nodes.delete(field);
      }
    for (const { field } of states) {
      const source = world.fieldDisplays.read(field).tutorial;
      let node = this.nodes.get(field);
      if (!node) {
        const container = new Container(),
          layout = TUTORIAL.stages[source.stage];
        if (source.stage === 0) {
          const logo = new Text({
            text: 'SOAP TANK',
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
            if (source.stage === 1 && line.text === 'w') continue;
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
        node = { stage: source.stage, root: container };
        this.nodes.set(field, node);
        this.root.addChild(container);
      }
      const transform = tutorialTransform(world, field);
      const point = fieldPoint({ x: 0, y: 0 }, transform);
      node.root.visible = source.rooted;
      node.root.scale.set(transform.scale);
      node.root.position.set(point.x, point.y);
      node.root.alpha = transform.alpha ?? 1;
    }
  }
  destroy() {
    this.nodes.clear();
    this.root.destroy({ children: true });
  }
}
