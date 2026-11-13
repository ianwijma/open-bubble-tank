import type { World } from '../../src/game/simulation/world';

/** Keep unrelated wave draws out of lifecycle fixtures with pinned combat randomness. */
export function cacheEmptyField(world: World, col = 1, row = 0) {
  world.cache.store({
    col,
    row,
    scale: 1,
    enemies: [],
    cleared: false,
    boss: false,
    tutorial: 0,
  });
}
