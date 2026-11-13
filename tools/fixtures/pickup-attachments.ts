import type { Pickup } from '../../src/game/core/types';
import type { World } from '../../src/game/simulation/world';

const imported = new WeakSet<Pickup>();

/** Supply only the omitted constructor/addChild/Setup of raw host fixtures.
 * Never use Run-array discovery in production, or repair later explicit removals.
 */
export function importPickupFixtures(world: World) {
  for (const { field, runtime } of world.attachedFields())
    for (const pickup of runtime.pickups) {
      if (imported.has(pickup)) continue;
      imported.add(pickup);
      if (world.pickupDisplays.read(pickup)) continue;
      world.pickupDisplays.construct(pickup);
      world.pickupDisplays.attach(pickup, field);
      world.pickupDisplays.setup(pickup, pickup.value, field, world.player);
    }
}
