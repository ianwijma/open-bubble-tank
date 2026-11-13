import type { World } from '../../src/game/simulation/world';

/** Explicitly supply PlaceAvatar/UpdateAvatar after a raw fixture replacement.
 * Production uses World.rebuildPlayer; drawing must never discover or attach a new avatar.
 */
export function importAvatarFixture(world: World) {
  world.actorArtwork.construct(world.player);
  if (!world.fieldDisplays.readAvatar(world.player)?.rooted)
    world.fieldDisplays.updateAvatar(
      world.player,
      world.currentWrapper,
      world.transit?.next,
      world.stats.frames,
    );
  world.actorParents.setAvatar(world.player);
}
