/** Recover a bounded set of MovieClip frame actions; never evaluate ActionScript. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FrameAction, RoundedRandom } from '../src/game/assets/clip-timeline';
import type { SymbolResult } from '../src/game/assets/asset-pack';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import parts from '../src/game/data/parts.json';
import projectileClips from '../src/game/data/projectile-clips.json';
import { STATUS_ART, PROTECTION_ART, INFECTED_ART } from '../src/game/data/status-art';

const root = resolve(process.argv[2] ?? '../documented-bubble-tank-3', 're/bt3');
const symbols = JSON.parse(readFileSync(resolve(root, 'symbol_map.json'), 'utf8')) as Record<
  string,
  { class: string }
>;
const scripts: Record<string, Record<number, FrameAction>> = {};
const unsupported: string[] = [];
const scriptedIds = new Set<number>();
const classes = new Map<string, { id: string; parent?: string; constructor: string }>();

function roundedRandom(expression: string): RoundedRandom | null {
  const match = /^Math\.round\(Math\.random\(\) \* (\([^()]+\)|[\d.]+)((?: [+-] [\d.]+)*)\)$/.exec(
    expression,
  );
  if (!match) return null;
  const factor = match[1].replace(/[()]/g, '');
  if (!/^\d+(?:\.\d+)?(?: [+-] \d+(?:\.\d+)?)*$/.test(factor)) return null;
  const values = factor.match(/[+-]? ?[\d.]+/g)!.map((n) => Number(n.replaceAll(' ', '')));
  return {
    scale: values.reduce((a, b) => a + b, 0),
    offsets: (match[2].match(/[+-] [\d.]+/g) ?? []).map((n) => Number(n.replaceAll(' ', ''))),
  };
}
function action(body: string): FrameAction | null {
  if (body === 'stop();') return { type: 'stop' };
  const jump = /^gotoAnd(Play|Stop)\((\d+)\);$/.exec(body);
  if (jump) return { type: 'jump', frame: Number(jump[2]), playing: jump[1] === 'Play' };
  const y =
    /^if\(this.y > 0\) \{ gotoAndPlay\((\d+)\); \}(?: else \{ gotoAndPlay\((\d+)\); \})?$/.exec(
      body,
    );
  if (y)
    return {
      type: 'y-branch',
      positive: Number(y[1]),
      ...(y[2] ? { nonPositive: Number(y[2]) } : {}),
    };
  const direct = /^gotoAndPlay\((Math\.round\(.+\))\);$/.exec(body);
  if (direct) {
    const random = roundedRandom(direct[1]);
    if (random) return { type: 'random-jump', random };
  }
  const variable = /^this\.([\w-]+) = (Math\.round\(.+?\)); (.+)$/.exec(body);
  if (!variable) return null;
  const random = roundedRandom(variable[2]);
  if (!random) return null;
  if (variable[3] === `gotoAndPlay(this.${variable[1]});`) return { type: 'random-jump', random };
  const property = variable[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const branch = new RegExp(
    `(?:else )?if\\(this\\.${property} == (\\d+)\\) \\{ gotoAndPlay\\((\\d+)\\); \\}`,
    'g',
  );
  const matches = [...variable[3].matchAll(branch)];
  if (!matches.length || variable[3].replace(branch, '').trim()) return null;
  return {
    type: 'random-branch',
    random,
    targets: Object.fromEntries(matches.map((m) => [m[1], Number(m[2])])),
  };
}
for (const [id, symbol] of Object.entries(symbols)) {
  const path = resolve(
    root,
    'export_scripts_deobf/scripts',
    `${symbol.class.replaceAll('.', '/')}.as`,
  );
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const header = /class\s+([\w-]+)(?:\s+extends\s+([\w-]+))?/.exec(source);
  if (header) {
    const start = source.indexOf(`function ${header[1]}(`);
    let constructor = '';
    if (start >= 0) {
      const open = source.indexOf('{', start);
      let end = open + 1,
        depth = 1;
      for (; depth && end < source.length; end++) {
        if (source[end] === '{') depth++;
        else if (source[end] === '}') depth--;
      }
      constructor = source.slice(open + 1, end - 1);
    }
    classes.set(header[1], { id, parent: header[2], constructor });
  }
  const bindings = [...source.matchAll(/addFrameScript\(([^;]+)\);/g)];
  if (!bindings.length) continue;
  scriptedIds.add(Number(id));
  const result: Record<number, FrameAction> = {};
  let complete = true;
  for (const binding of bindings) {
    const fields = binding[1].split(',').map((s) => s.trim());
    for (let i = 0; i < fields.length; i += 2) {
      const method = fields[i + 1]?.replace(/^this\./, '');
      if (!/^\d+$/.test(fields[i]) || !method || !/^[\w-]+$/.test(method)) {
        complete = false;
        break;
      }
      const escaped = method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const definition = new RegExp(`function ${escaped}\\([^)]*\\)[^{]*\\{`).exec(source);
      if (!definition) {
        complete = false;
        break;
      }
      const start = definition.index + definition[0].length;
      let end = start,
        depth = 1;
      while (depth && end < source.length) {
        if (source[end] === '{') depth++;
        if (source[end] === '}') depth--;
        end++;
      }
      const recovered = action(
        source
          .slice(start, end - 1)
          .replace(/\s+/g, ' ')
          .trim(),
      );
      if (!recovered) {
        complete = false;
        break;
      }
      result[Number(fields[i]) + 1] = recovered;
    }
  }
  if (complete) scripts[id] = result;
  else unsupported.push(`${id}:${symbol.class}`);
}
const { bytes } = await decompressSWF(readFileSync(resolve(root, 'uncompressed.swf')));
const movie = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(movie.symbols.sprites.map((sprite) => [sprite.id, sprite]));
const reachable = new Set<number>();
function visit(id: number) {
  if (reachable.has(id)) return;
  reachable.add(id);
  for (const p of sprites.get(id)?.placements ?? []) if (p.charId !== undefined) visit(p.charId);
}
for (const part of parts) visit(part.symbol);
const partScripts = [...reachable].filter((id) => scriptedIds.has(id));
for (const id of [...Object.values(STATUS_ART), ...Object.values(PROTECTION_ART), INFECTED_ART])
  visit(id);
const attachmentScripts = [...reachable].filter(
  (id) => scriptedIds.has(id) && !partScripts.includes(id),
);
// Replay binding registration around super(), rather than assuming the derived
// table wins. _-Rx registers stop(1) BEFORE _-BL replaces that slot with random play.
const own = { ...scripts };
function effective(name: string): Record<number, FrameAction> {
  const info = classes.get(name);
  if (!info) return {};
  if (scriptedIds.has(Number(info.id)) && !own[info.id])
    throw new Error(`Unsupported inherited frame script: ${name}`);
  const inherited = info.parent ? effective(info.parent) : {};
  let table: Record<number, FrameAction> = {};
  let sawSuper = false;
  for (const call of info.constructor.matchAll(/\bsuper\(\);|addFrameScript\(([^;]+)\);/g)) {
    if (call[0] === 'super();') {
      Object.assign(table, inherited);
      sawSuper = true;
    } else {
      const fields = call[1].split(',').map((field) => field.trim());
      for (let i = 0; i < fields.length; i += 2) {
        const frame = Number(fields[i]) + 1,
          action = own[info.id]?.[frame];
        if (!action) throw new Error(`Missing frame ${frame}: ${name}`);
        table[frame] = action;
      }
    }
  }
  if (!sawSuper) table = { ...inherited, ...table };
  return table;
}
for (const id of Object.values(projectileClips.roots)) {
  const name = symbols[id]?.class.split('.').at(-1);
  if (!name) throw new Error(`Missing managed projectile class: ${id}`);
  scripts[id] = effective(name);
}
const missing = partScripts.filter((id) => !scripts[id]);
missing.push(...attachmentScripts.filter((id) => !scripts[id]));
for (const id of Object.keys(projectileClips.sprites).map(Number))
  if (scriptedIds.has(id) && !scripts[id]) missing.push(id);
if (missing.length)
  throw new Error(`Unrecovered frame scripts in the part catalog: ${missing.join(', ')}`);
writeFileSync('src/game/data/timeline-scripts.json', JSON.stringify(scripts) + '\n');
console.log(
  JSON.stringify({
    imported: Object.keys(scripts).length,
    partClips: partScripts.length,
    attachmentClips: attachmentScripts.length,
    unsupported: unsupported.length,
    skipped: unsupported,
  }),
);
