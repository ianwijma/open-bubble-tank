/** Compare imported wave templates with bounded walks of the exported AVM2 methods.
 * This reads pcode; it does not run the SWF, AddInstruction's RNG, or AVM2 itself.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { availableWaves, type WaveOption } from '../src/game/simulation/waves';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const path = resolve(root, 're/bt3/export_pcode/scripts/_-3y.pcode');
const pcode = readFileSync(path, 'utf8');
const methods = ['_-Pb', '_-ad', '_-9k', '_-Iy'];
const flags = ['_-TO', '_-T2', '_-WG', '_-YZ', '_-2H'];
type Template = Omit<WaveOption, 'conditions'>;
const constructorSites = new Set<string>();

function decode(name: string) {
  const start = pcode.indexOf(`function §${name}§(`);
  if (start < 0) throw new Error(`Missing method ${name}`);
  const body = pcode
    .slice(start)
    .split(/\bcode\r?\n/, 2)[1]
    ?.split('end ; code', 1)[0];
  if (!body) throw new Error(`Missing code for ${name}`);
  const instructions: { op: string; argument: string }[] = [];
  const labels = new Map<string, number>();
  for (const line of body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)) {
    if (line.endsWith(':')) labels.set(line.slice(0, -1), instructions.length);
    else {
      const [op, ...rest] = line.split(' ');
      instructions.push({ op, argument: rest.join(' ') });
    }
  }
  return { name, instructions, labels };
}

function walk(
  method: ReturnType<typeof decode>,
  distance: number,
  profile: Record<string, boolean>,
) {
  const stack: unknown[] = [];
  const locals: unknown[] = [{ mainRef: { objCurrentPlayer: profile } }, distance];
  const pop = () => {
    if (!stack.length) throw new Error(`${method.name}: stack underflow`);
    return stack.pop();
  };
  const property = (argument: string) => {
    const match = argument.match(/,"([^"]+)"\)(?:, \d+)?$/);
    if (!match) throw new Error(`Unsupported property ${argument}`);
    return match[1];
  };
  let pc = 0;
  const branch = (label: string) => {
    const target = method.labels.get(label);
    if (target === undefined) throw new Error(`Missing label ${label}`);
    pc = target;
  };
  // Fail closed on unknown instructions or nontermination; never approximate a path.
  for (let steps = 0; steps < 100_000; steps++) {
    const instruction = method.instructions[pc++];
    if (!instruction) throw new Error(`${method.name}: fell past code`);
    const { op, argument } = instruction;
    if (/^getlocal[0-3]$/.test(op)) stack.push(locals[Number(op.at(-1))]);
    else if (/^setlocal[0-3]$/.test(op)) locals[Number(op.at(-1))] = pop();
    else if (op === 'getlocal') stack.push(locals[Number(argument)]);
    else if (op === 'setlocal') locals[Number(argument)] = pop();
    else if (op === 'pushscope' || op === 'pop') pop();
    else if (op === 'pushnull') stack.push(null);
    else if (op === 'pushtrue' || op === 'pushfalse') stack.push(op === 'pushtrue');
    else if (op === 'pushbyte' || op === 'pushdouble') stack.push(Number(argument));
    else if (op === 'pushstring') stack.push(JSON.parse(argument));
    else if (op === 'dup') {
      const value = pop();
      stack.push(value, value);
    } else if (op === 'getproperty') {
      const receiver = pop() as Record<string, unknown> | null;
      const key = property(argument);
      if (receiver === null || receiver === undefined || !(key in receiver))
        throw new Error(`Missing property ${key}`);
      stack.push(receiver[key]);
    } else if (op === 'findpropstrict') stack.push({ scope: true });
    else if (op === 'constructprop' || op === 'callpropvoid') {
      const count = Number(argument.match(/, (\d+)$/)?.[1]);
      if (!Number.isInteger(count)) throw new Error(`Missing argument count: ${argument}`);
      if (count >= stack.length) throw new Error(`${method.name}: missing call arguments`);
      const args = stack.splice(stack.length - count, count);
      const receiver = pop();
      const name = property(argument);
      if (op === 'constructprop') {
        if (name === 'Array' && count === 0) stack.push([]);
        else if (name === 'WaveOption' && (count === 1 || count === 2)) {
          constructorSites.add(`${method.name}:${pc - 1}`);
          stack.push({ chance: args[0], scale: args[1] ?? 1, instructions: [] });
        } else throw new Error(`Unsupported constructor ${name}/${count}`);
      } else if (name === 'push' && count === 1 && Array.isArray(receiver)) receiver.push(args[0]);
      else if (name === 'AddInstruction' && count === 3) {
        const template = receiver as Template;
        template.instructions.push({
          key: String(args[0]),
          min: Number(args[1]),
          max: Number(args[2]),
        });
      } else throw new Error(`Unsupported call ${name}/${count}`);
    } else if (op === 'jump') branch(argument);
    else if (op === 'iftrue' || op === 'iffalse') {
      if (Boolean(pop()) === (op === 'iftrue')) branch(argument);
    } else if (['equals', 'greaterequals', 'lessequals', 'ifne', 'ifnle', 'ifnge'].includes(op)) {
      const right = pop(),
        left = pop();
      if (op === 'equals') stack.push(left === right);
      else if (op === 'greaterequals') stack.push(Number(left) >= Number(right));
      else if (op === 'lessequals') stack.push(Number(left) <= Number(right));
      else if (
        (op === 'ifne' && left !== right) ||
        (op === 'ifnle' && !(Number(left) <= Number(right))) ||
        (op === 'ifnge' && !(Number(left) >= Number(right)))
      )
        branch(argument);
    } else if (op === 'returnvalue') {
      const result = pop();
      if (!Array.isArray(result) || stack.length) throw new Error(`${method.name}: invalid return`);
      return result as Template[];
    } else if (op !== 'label' && op !== 'coerce') throw new Error(`Unsupported opcode ${op}`);
  }
  throw new Error(`${method.name}: step budget exceeded`);
}

const decoded = new Map(methods.map((name) => [name, decode(name)]));
const coverage = new Set<string>();
let cases = 0;
for (let mask = 0; mask < 32; mask++) {
  const profile = Object.fromEntries(flags.map((name, bit) => [name, Boolean(mask & (1 << bit))]));
  // Offline includeLocal represents the complement of source's builtin-only profile.
  // This verifies the templates under that mapping, not the offline roster policy.
  const builtinOnly = profile['_-TO'] && !flags.slice(1).some((name) => profile[name]);
  for (let distance = -1; distance <= 40; distance++) {
    const name =
      distance === -1 ? '_-Iy' : distance < 10 ? '_-Pb' : distance < 20 ? '_-ad' : '_-9k';
    const actual = walk(decoded.get(name)!, distance, profile);
    const expected = availableWaves(distance, !builtinOnly).map(
      ({ chance, scale, instructions }) => ({
        chance,
        scale,
        instructions,
      }),
    );
    if (!isDeepStrictEqual(actual, expected))
      throw new Error(
        `Wave template mismatch: method ${name}, distance ${distance}, profile ${mask}`,
      );
    for (const template of actual) coverage.add(JSON.stringify(template));
    cases++;
  }
}
const totalConstructors = [...decoded.values()].reduce(
  (sum, method) =>
    sum +
    method.instructions.filter(
      ({ op, argument }) => op === 'constructprop' && argument.includes(',"WaveOption")'),
    ).length,
  0,
);
if (constructorSites.size !== totalConstructors)
  throw new Error(
    `Unvisited WaveOption constructors: ${constructorSites.size}/${totalConstructors}`,
  );
console.log(
  JSON.stringify(
    {
      pcode: path,
      sha256: createHash('sha256').update(pcode).digest('hex'),
      methods,
      cases,
      constructorSites: constructorSites.size,
      uniqueTemplates: coverage.size,
      distances: [-1, 40],
      profiles: 32,
      limits:
        'Bounded template/control-flow audit; no SWF execution, RNG, roster, constructor scheduling or runtime parity proof.',
    },
    null,
    2,
  ),
);
