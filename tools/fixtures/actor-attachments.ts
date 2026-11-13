import type { Tank } from '../../src/game/core/types';
import type { World } from '../../src/game/simulation/world';

const imported = new WeakSet<Tank>();

/** Explicitly supply omitted construction/addChild/SetCallback steps of raw host fixtures.
 * Later removals/reparenting must use the actual operations, never array edits.
 * Production code must not discover display membership from its Run arrays.
 */
export function importActorFixtures(world: World) {
  for (const { field, runtime } of world.attachedFields())
    for (const tank of [...field.enemies, ...runtime.allies]) {
      if (imported.has(tank)) continue;
      imported.add(tank);
      world.actorArtwork.construct(tank);
      if (!world.actorParents.hasParent(tank)) world.attachActor(tank, field);
    }
  world.actorParents.sync(world);
}
