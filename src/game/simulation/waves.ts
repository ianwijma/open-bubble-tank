import data from '../data/waves.json';
import rules from '../data/rules.json';
import batches from '../data/roster.json';
import { ENEMIES, costs, difficulty, isSupport } from '../data/catalog';
import type { TankDesign } from '../core/types';
import { Random } from '../core/math';
import { tankRosterIdentity } from '../core/tank-identity';

export interface WaveOption {
  chance: number;
  scale: number;
  conditions: string[];
  instructions: { key: string; min: number; max: number }[];
}
export function matchesRule(tank: TankDesign, rule: string): boolean {
  const c = costs(tank.parts);
  const stats: Record<string, number | boolean> = {
    6: tank.classId,
    7: c.gp,
    8: c.bp,
    11: difficulty(tank),
    12: tank.speed,
    13: tank.reward,
    15: isSupport(tank),
    16: tank.life,
  };
  return rule.split(';').every((clause) => {
    const [field, op, raw] = clause.split(',');
    const target = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
    const n = stats[field];
    return op === '1' ? n === target : op === '2' ? n > target : n < target;
  });
}
export function availableWaves(distance: number, includeLocal = false): WaveOption[] {
  const band = distance < 0 ? '_-Iy' : distance < 10 ? '_-Pb' : distance < 20 ? '_-ad' : '_-9k';
  const d = Math.floor(distance); // AS3 band functions accept uint.
  return (data[band] as WaveOption[]).filter((w) =>
    w.conditions.every((cond) => {
      if (cond.includes('_loc4_')) return includeLocal;
      return [...cond.matchAll(/param1\s*(<=|>=|==|<|>)\s*(\d+)/g)].every(([, op, raw]) => {
        const n = Number(raw);
        return op === '<='
          ? d <= n
          : op === '>='
            ? d >= n
            : op === '=='
              ? d === n
              : op === '<'
                ? d < n
                : d > n;
      });
    }),
  );
}
export function rollWave(
  distance: number,
  rng: Random,
  localTanks: readonly TankDesign[] = [],
  roster?: UnitRoster,
): { scale: number; designs: TankDesign[] } {
  // WaveOption.AddInstruction draws NUM while constructing every available option.
  const options = availableWaves(distance, localTanks.length > 0).map((option) => ({
    ...option,
    instructions: option.instructions.map((instruction) => ({
      key: instruction.key,
      count: rng.int(instruction.min, instruction.max),
    })),
  }));
  const ticket = rng.int(
    0,
    options.reduce((sum, option) => sum + option.chance, 0),
  );
  let option = options[options.length - 1],
    minimum = 0;
  for (const candidate of options) {
    const maximum = minimum + candidate.chance;
    if (ticket >= minimum && ticket < maximum) {
      option = candidate;
      break;
    }
    minimum = maximum;
  }
  const designs: TankDesign[] = [];
  let previousKey = '',
    previousIndex = -1;
  for (const instruction of option.instructions) {
    const rule = rules[instruction.key as keyof typeof rules];
    const pool =
      roster?.units.get(instruction.key) ??
      (roster ? [] : [...ENEMIES, ...localTanks].filter((t) => !t.avatar && matchesRule(t, rule)));
    // The offline adapter retains a resolved prefix; source missing-key failure is separate.
    if (!pool.length) break;
    if (instruction.key !== previousKey) previousIndex = -1;
    let index = 0;
    if (pool.length > 1)
      do {
        index = rng.int(0, pool.length - 1);
      } while (index === previousIndex);
    previousKey = instruction.key;
    previousIndex = index;
    for (let i = 0; i < instruction.count; i++) designs.push(pool[index]);
  }
  return { scale: option.scale, designs };
}
export class UnitRoster {
  units = new Map<string, TankDesign[]>();
  stage = 1;
  traversed = 0;
  private tenLoaded = false;
  constructor(
    private rng: Random,
    private localTanks: readonly TankDesign[] = [],
  ) {
    this.load(batches.initial);
  }
  /** _-3y._-0 walks the KEY-sorted unit table and returns its first exact DATA match. */
  lookupKey(identity: string): string {
    for (const key of [...this.units.keys()].sort())
      if (this.units.get(key)!.some((tank) => tankRosterIdentity(tank) === identity)) return key;
    return '';
  }
  private load(keys: readonly string[]) {
    for (const key of keys) {
      const rule = rules[key as keyof typeof rules];
      const local = this.localTanks.filter((t) => !t.avatar && matchesRule(t, rule));
      const builtin = ENEMIES.filter((t) => matchesRule(t, rule));
      const pool = local.length && this.rng.int(1, 2) === 1 ? local : builtin;
      if (!pool.length) continue;
      const list = this.units.get(key) ?? [],
        tank = this.rng.pick(pool);
      if (!list.some((t) => t.id === tank.id)) list.push(tank);
      this.units.set(key, list);
    }
  }
  update(distance: number) {
    this.traversed++;
    const suffix = this.localTanks.length ? 'Local' : 'Default';
    if (distance >= 7 && this.stage === 1) {
      this.load(batches[`seven${suffix}`]);
      this.stage = 2;
    } else if (distance >= 17 && this.stage === 2) {
      this.load(batches.seventeen);
      this.stage = 3;
    }
    if (this.traversed >= 10 && !this.tenLoaded) {
      this.load(batches[`ten${suffix}`]);
      this.tenLoaded = true;
    }
    if (this.traversed % 15 === 0 && distance >= 30) this.load(batches[`repeat${suffix}`]);
  }
}
