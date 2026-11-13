/** Independent preservation and bounded observation verification.
 * node tools/reference/projectile-frame-verify.mjs ORIGINAL PROBE CAPTURE_DIR [RESEARCH_ROOT]
 * Uses the pre-existing project SWF parser, not the emitter's parsing/hashes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  decompressSWF,
  readHeader,
  iterTags,
  parseSymbolClass,
  u16,
} from '../../src/game/assets/swf.mjs';
import { parseSpriteTag } from '../../src/game/assets/swf-symbols.mjs';

const [originalPath, probePath, out, research] = process.argv.slice(2);
if (!out) throw new Error('Supply ORIGINAL PROBE CAPTURE_DIR [RESEARCH_ROOT].');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equal = (a, b, message) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(message);
};
const parse = async (path) => {
  const raw = await readFile(path);
  const sha256 = sha(raw);
  // The existing parser normalizes the known expanded-CWS carrier in place.
  const { bytes } = await decompressSWF(new Uint8Array(raw));
  const header = readHeader(bytes);
  return {
    sha256,
    bytes: raw.length,
    header,
    headerPayload: sha(bytes.slice(8, header.tagsOffset)),
    tags: [...iterTags(bytes, header.tagsOffset)],
  };
};
const original = await parse(originalPath),
  probe = await parse(probePath);
const abc = (t) => t.code === 72 || t.code === 82;
const other = (t) => !abc(t) && t.code !== 76;
const digestTags = (tags) =>
  tags.map((t) => ({ code: t.code, bytes: t.body.length, sha256: sha(t.body) }));
const originalAbc = digestTags(original.tags.filter(abc)),
  probeAbc = digestTags(probe.tags.filter(abc));
equal(probeAbc.slice(0, originalAbc.length), originalAbc, 'Original ABC changed or reordered.');
if (probeAbc.length !== originalAbc.length + 1) throw new Error('Expected one additional ABC.');
equal(
  digestTags(probe.tags.filter(other)),
  digestTags(original.tags.filter(other)),
  'Original nonbinding payload changed.',
);
equal(original.headerPayload, probe.headerPayload, 'Movie header payload changed.');
// Check the complete original tag sequence, allowing exactly one inserted DoABC
// and the CID0 name change inside SymbolClass, including all tag occurrences.
const binding = (body) => {
  const count = u16(body, 0),
    entries = [];
  let at = 2;
  for (let i = 0; i < count; i++) {
    const cid = u16(body, at);
    at += 2;
    const end = body.indexOf(0, at);
    if (end < 0) throw new Error('Unterminated SymbolClass.');
    entries.push([cid, new TextDecoder().decode(body.slice(at, end))]);
    at = end + 1;
  }
  if (at !== body.length) throw new Error('Trailing SymbolClass bytes.');
  return entries;
};
const originalSymbols = new Map(),
  probeSymbols = new Map();
let pi = 0,
  inserted = 0,
  documentChanges = 0;
for (const source of original.tags) {
  let dest = probe.tags[pi++];
  if (dest.code === 82 && sha(dest.body) === probeAbc.at(-1).sha256) {
    inserted++;
    dest = probe.tags[pi++];
  }
  equal(dest.code, source.code, 'Original tag order changed.');
  if (source.code === 76) {
    parseSymbolClass(source.body, originalSymbols);
    parseSymbolClass(dest.body, probeSymbols);
    const a = binding(source.body),
      b = binding(dest.body);
    equal(
      b.map(([id, name]) => [id, id === 0 ? 'Main' : name]),
      a,
      'Non-document binding changed.',
    );
    documentChanges += b.filter(
      ([id, name]) => id === 0 && name === 'BT3ProjectileFrameProbe',
    ).length;
  } else equal(sha(dest.body), sha(source.body), 'Original payload changed.');
}
equal(pi, probe.tags.length, 'Unexpected extra tags.');
equal(inserted, 1, 'Expected one insertion.');
equal(documentChanges, 1, 'Expected one CID0 binding change.');
const roots = ['_-U7', '_-14._-QM', '_-14._-XV', 'AvatarRocket', '_-14._-Kk', '_-BL'];
const rootInventory = roots.map((name) => {
  const ids = [...originalSymbols].filter(([, n]) => n === name).map(([id]) => id);
  return {
    name,
    ids,
    sprites: ids.map((id) => {
      const t = original.tags.find((t) => t.code === 39 && u16(t.body, 0) === id);
      return t
        ? {
            id,
            frames: u16(t.body, 2),
            tags: digestTags([...iterTags(t.body, 4)]),
            placements: parseSpriteTag(t.body).placements.map((p) => {
              const child = original.tags.find((t) => t.code === 39 && u16(t.body, 0) === p.charId);
              return {
                ...p,
                childClass: originalSymbols.get(p.charId) ?? null,
                childFrames: child ? u16(child.body, 2) : null,
              };
            }),
          }
        : null;
    }),
  };
});
const sourceHashes = [];
if (research) {
  for (const dir of ['export_scripts', 'export_pcode']) {
    for (const name of [
      '_-BL',
      '_-U7',
      '_-14/_-QM',
      '_-14/_-XV',
      'AvatarRocket',
      '_-14/_-Kk',
      'Main',
    ]) {
      const path = `${dir}/scripts/${name}.${dir === 'export_scripts' ? 'as' : 'pcode'}`;
      const bytes = await readFile(resolve(research, path));
      sourceHashes.push({ path, bytes: bytes.length, sha256: sha(bytes) });
    }
  }
}
const result = {
  original: { path: originalPath, sha256: original.sha256, bytes: original.bytes },
  probe: { path: probePath, sha256: probe.sha256, bytes: probe.bytes },
  proof: {
    independentParser: 'src/game/assets/swf.mjs',
    originalTagCount: original.tags.length,
    probeTagCount: probe.tags.length,
    originalAbc,
    addedAbc: probeAbc.at(-1),
    allOriginalPayloadsAndOrderPreserved: true,
    changedOriginalBinding: 0,
    nonbindingTags: original.tags.filter(other).length,
  },
  rootInventory,
  sourceHashes,
};
try {
  const observed = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
  const start = observed.trace.lastIndexOf('BT3_PROJECTILE_BEGIN');
  if (start < 0) throw new Error('Corrected probe begin marker absent.');
  const lines = observed.trace
    .slice(start + 1)
    .filter((line) => line.startsWith('BT3_PROJECTILE_SAMPLE '));
  const samples = lines.map((line) => {
    const [
      marker,
      phase,
      name,
      tick,
      actual,
      r,
      frame,
      total,
      playing,
      unparented,
      children,
      extra,
    ] = line.split(' ');
    if (extra !== undefined || marker !== 'BT3_PROJECTILE_SAMPLE')
      throw new Error('Malformed sample.');
    return {
      phase,
      name,
      tick: Number(tick),
      actual,
      r,
      frame: Number(frame),
      total: Number(total),
      playing,
      unparented,
      children: Number(children),
    };
  });
  const keys = samples.map((s) => `${s.name}/${s.phase}/${s.tick}`);
  // gotoAndPlay can coincide with multiple EXIT_FRAME deliveries in one tick.
  // Keep every delivery; require all 492 distinct expected sample coordinates.
  equal(new Set(keys).size, 492, 'Incomplete sample matrix or unexpected coordinates.');
  const byClass = roots.map((root) => {
    const name = root.split('.').at(-1),
      rows = samples.filter((s) => s.name === name);
    const expected = [
      'detached/0',
      'attached/0',
      ...Array.from({ length: 40 }, (_, i) => [`enter/${i + 1}`, `exit/${i + 1}`]).flat(),
    ];
    const coordinates = rows.map((s) => `${s.phase}/${s.tick}`);
    const collapsed = coordinates.filter((key, i) => !i || key !== coordinates[i - 1]);
    equal(collapsed, expected, `Incomplete or reordered sample matrix for ${root}.`);
    for (let i = 1; i < rows.length; i++)
      if (coordinates[i] === coordinates[i - 1] && rows[i].phase !== 'exit')
        throw new Error('Unexpected repeated non-exit sample.');
    const changes = rows.filter((s, i) => i && s.r !== rows[i - 1].r);
    return {
      root,
      samples: rows.length,
      initial: rows[0],
      attached: rows[1],
      final: rows.at(-1),
      finiteSamples: rows.filter((s) => Number.isFinite(Number(s.r))).length,
      repeatedExitCoordinates: [...new Set(coordinates)]
        .map((key) => ({ coordinate: key, count: coordinates.filter((c) => c === key).length }))
        .filter((c) => c.count > 1),
      observedRValueChanges: changes,
      observedRootFrames: [...new Set(rows.map((s) => s.frame))],
    };
  });
  if (!observed.trace.includes('BT3_PROJECTILE_DONE 40')) throw new Error('Missing DONE.');
  result.observation = {
    samples: samples.length,
    byClass,
    runtimeModules: observed.modules,
    browser: observed.version,
    errors: observed.errors,
    avmErrors: observed.messages.filter((m) => /Error #/.test(m.text)),
    otherRuntimeDiagnostics: observed.messages.filter(
      (m) => /ERROR|error|failed|violat|block/i.test(m.text) && !/Error #/.test(m.text),
    ),
  };
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  result.observation = { status: 'not supplied' };
}
await writeFile(resolve(out, 'verified-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      original: original.sha256,
      probe: probe.sha256,
      proof: result.proof,
      rootSymbols: rootInventory.map((r) => ({
        name: r.name,
        ids: r.ids,
        frames: r.sprites.map((s) => s?.frames),
      })),
      observation: result.observation.status ?? {
        samples: result.observation.samples,
        classes: result.observation.byClass.map((r) => ({
          root: r.root,
          initialR: r.initial.r,
          finalR: r.final.r,
          valueChanges: r.observedRValueChanges.length,
          frames: r.observedRootFrames,
        })),
      },
    },
    null,
    2,
  ),
);
