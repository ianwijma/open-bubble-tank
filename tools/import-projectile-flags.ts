/** Recover constructor flags through projectile inheritance; no artwork is exported. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import art from '../src/game/data/projectile-art.json';
import mines from '../src/game/data/mine-art.json';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const source = `${root}/re/bt3/export_scripts_deobf/scripts`;
const classes = new Map<string, { parent?: string; constructor: string }>();
for (const entry of await readdir(source, { recursive: true })) {
  if (!entry.endsWith('.as')) continue;
  const text = await readFile(join(source, entry), 'utf8');
  const header = text.match(
    /public\s+(?:dynamic\s+|final\s+)?class\s+([\w-]+)(?:\s+extends\s+([\w-]+))?/,
  );
  if (!header) continue;
  const start = text.indexOf(`function ${header[1]}(`);
  let constructor = '';
  if (start >= 0) {
    const brace = text.indexOf('{', start);
    let depth = 1,
      end = brace + 1;
    for (; end < text.length && depth; end++) {
      if (text[end] === '{') depth++;
      else if (text[end] === '}') depth--;
    }
    constructor = text.slice(brace + 1, end - 1);
  }
  classes.set(header[1], { parent: header[2], constructor });
}
const symbols = JSON.parse(await readFile('src/game/data/symbols.json', 'utf8')) as Record<
  string,
  number
>;
function flags(name: string): Record<string, boolean> {
  const info = classes.get(name);
  if (!info) return {};
  const values = info.parent ? flags(info.parent) : {};
  for (const match of info.constructor.matchAll(
    /(?:this\.)?(blnDestroyable|blnSeeker|blnBeam|blnRotateTowardTarget)\s*=\s*(true|false)/g,
  ))
    values[match[1]] = match[2] === 'true';
  return values;
}
const result = Object.fromEntries(
  [...new Set([...Object.values(art), ...Object.values(mines)].map((a) => a.symbol))].map(
    (symbol) => {
      const name = Object.entries(symbols)
        .find(([, id]) => id === symbol)?.[0]
        .split('.')
        .at(-1);
      if (!name) throw new Error(`Missing class for ${symbol}`);
      const values = flags(name);
      if (values.blnBeam === undefined) throw new Error(`Missing bullet inheritance for ${name}`);
      return [
        symbol,
        {
          className: name,
          destroyable: values.blnDestroyable,
          seeker: values.blnSeeker,
          beam: values.blnBeam,
          rotatesTowardTarget: values.blnRotateTowardTarget,
        },
      ];
    },
  ),
);
await writeFile('src/game/data/projectile-flags.json', JSON.stringify(result) + '\n');
console.log(`Imported ${Object.keys(result).length} projectile flag sets.`);
