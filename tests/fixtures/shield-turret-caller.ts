import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../../src/game/core/types';

// Playwright's Node loader requires explicit file reads for the source JSON tables.
const catalog = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8')) as {
  enemy_tanks: TankDesign[];
  avatar_defaults: TankDesign[];
};

/** Valid offline enemy build: Cruiser bodies, one launcher and manual creator stats. */
export function shieldTurretCaller(): TankDesign {
  const cruiser = catalog.enemy_tanks.find((tank) => tank.name === 'Cruiser')!;
  return {
    ...cruiser,
    sourceCode: undefined,
    id: 'shield-caller-import',
    name: 'Shield Caller',
    life: 20,
    reward: 5,
    speed: 2,
    parts: [
      ...cruiser.parts.filter((part) => part.type < 2000),
      { ...catalog.avatar_defaults[0].parts[1], key: 'launcher', type: 4032, x: 0, y: 0 },
    ],
  };
}
