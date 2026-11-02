import { execFileSync } from 'node:child_process';
import type { TankDesign } from '../../src/game/core/types';
/** Use the production codec in Bun; Node ESM requires attributes on the catalog JSON imports. */
export const encodeFixtureTank = (tank: TankDesign) =>
  execFileSync(
    'bun',
    [
      '-e',
      "import { encodeTankCode } from './src/game/services/tank-code'; console.log(await encodeTankCode(await Bun.stdin.json()));",
    ],
    { input: JSON.stringify(tank), encoding: 'utf8' },
  ).trim();
