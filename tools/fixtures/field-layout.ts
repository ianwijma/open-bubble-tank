import type { World } from '../../src/game/simulation/world';
import type { TutorialStage } from '../../src/game/core/tutorial';

/** Explicitly supply source pose/goto operations omitted by a raw scalar fixture layout.
 * Call only after artificial player/offset/scale/tutorial edits; never from production or drawing.
 */
export function setFieldFixtureLayout(world: World) {
  for (const { field, offset } of world.attachedFields()) {
    const read = world.fieldDisplays.read(field);
    world.fieldDisplays.moveCurrent(field, {
      x: read.root.pose.x - (offset.x - world.player.x),
      y: read.root.pose.y - (offset.y - world.player.y),
    });
    if (read.slots.background.pose.scaleX !== field.scale)
      world.fieldDisplays.setupChildren(field, field.scale);
    if (read.tutorial.stage !== field.tutorial)
      world.fieldDisplays.selectTutorial(field, field.tutorial as TutorialStage);
    world.worldDisplays.follow(field);
  }
}
