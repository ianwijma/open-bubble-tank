import { expect, test } from 'bun:test';
import { AVATARS, BOSSES, ENEMIES, costs, gunBudget, partById } from '../src/game/data/catalog';
import { CREATOR_PALETTE } from '../src/game/core/creator-palette';
import { creatorSavePrerequisite } from '../src/game/core/creator-save';
import { creatorEditError } from '../src/game/simulation/editor-validation';
import { paletteState } from '../src/game/simulation/editor-palette';
import { validateBuild } from '../src/game/simulation/designer';
import { defaultProfile, submitCreatedTank, validateDesign } from '../src/game/services/profile';
import { matchesRule, rollWave } from '../src/game/simulation/waves';
import rules from '../src/game/data/rules.json';
import { World } from '../src/game/simulation/world';
import { shieldTurretCaller } from './fixtures/shield-turret-caller';

test('4032 is an unlocked enemy creator row, absent from all builtin tank catalogs', () => {
  expect(
    [...AVATARS, ...ENEMIES, ...BOSSES].some((tank) =>
      tank.parts.some((part) => part.type === 4032),
    ),
  ).toBe(false);
  const design = shieldTurretCaller(),
    total = costs(design.parts),
    budget = Math.floor(gunBudget(design.classId, 6) * 1.5);
  expect(CREATOR_PALETTE.row.codes[4032]).toBe(3); // Indicator frame, not an access gate.
  expect(
    paletteState(partById(4032)!, {
      avatar: false,
      level: 6,
      classId: 3,
      budget,
      gp: 0,
      bp: total.bp - 3,
    }),
  ).toEqual({ locked: false, affordable: true, reason: null });
  expect(total).toEqual({ gp: 3, bp: 31 });
  expect(creatorEditError(design.parts, design.classId, 6, budget)).toBe(0);
  expect(creatorSavePrerequisite(design)).toBeNull();
  expect(validateBuild(design, 6, 6)).toEqual([]);
});

test('a valid creator save reaches the optional local roster and a literal Balanced wave', () => {
  const result = submitCreatedTank(defaultProfile(), shieldTurretCaller());
  expect(result.tank).not.toBeNull();
  const saved = JSON.parse(JSON.stringify(result.profile)).tanks.filter(validateDesign);
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe('L10000001');
  expect(saved[0].avatar).toBe(false);
  expect(matchesRule(saved[0], rules.Balanced)).toBe(true);
  // GameShell.startRun passes precisely these records only when My enemy tanks is enabled.
  const world = new World(
    saved.filter((tank: { avatar: boolean }) => !tank.avatar),
    [],
    6,
  );
  expect(world.roster.units.get('Balanced')).toEqual([saved[0]]);
  const wave = rollWave(7, world.rng, saved, world.roster);
  expect(wave.designs.filter((tank) => tank.id === saved[0].id)).toHaveLength(2);
  expect(wave.designs.find((tank) => tank.id === saved[0].id)!.parts.at(-1)!.type).toBe(4032);
  const builtinOnly = new World([], [], 6);
  expect(
    [...builtinOnly.roster.units.values()]
      .flat()
      .some((tank) => tank.parts.some((part) => part.type === 4032)),
  ).toBe(false);
});
