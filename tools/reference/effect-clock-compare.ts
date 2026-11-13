/** Optional candidate comparison. Original frozen words remain the sole oracle.
 * bun tools/reference/effect-clock-compare.ts ORIGINAL OWNED_CAPTURE
 * This explicit epoch replay is not a production clock owner or global event proof.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decompressSWF } from '../../src/game/assets/swf.mjs';
import { extractSymbols } from '../../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../../src/game/assets/display-list';
import { SwfClip, type ClipSource } from '../../src/game/assets/swf-clip';
import type { SymbolResult } from '../../src/game/assets/asset-pack';
import original from '../../tests/fixtures/effect-clock-original.json';
import { rows, sha } from './effect-clock-evidence.mjs';

const [path, capture] = process.argv.slice(2);
if (!capture) throw new Error('Supply ORIGINAL OWNED_CAPTURE');
const raw = await readFile(path);
assert.equal(sha(raw), original.originalSha256);
const { bytes } = await decompressSWF(new Uint8Array(raw));
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const source: ClipSource = {
  spriteInfo: (id) => sprites.get(id),
  displayList: (id, frame) => {
    const sprite = sprites.get(id);
    return sprite ? buildDisplayList(sprite, frame) : [];
  },
};
const measured = rows(original.contract);
const differences: unknown[] = [],
  identities: unknown[] = [];
let comparisons = 0;
for (const cohort of ['before', 'inside'])
  for (const root of original.sourceAudit.roots) {
    const label = `${cohort}:${root.key}`;
    const clip = new SwfClip(root.symbol, source);
    clip.construct();
    const retained = new Map<number, SwfClip>(),
      aliases = new Map<SwfClip, Set<number>>();
    const samples = measured.filter((r) => r.label === label && r.phase === 'exit' && r.total > 1);
    for (const tick of [...new Set(samples.map((r) => r.tick))]) {
      // Candidate replay input, compared with original observations; never expected output.
      clip.advance(Math.max(1, tick - (cohort === 'inside' ? 1 : 0)));
      for (const row of samples.filter((r) => r.tick === tick && r.kind === 'tree')) {
        let current: SwfClip | undefined = clip;
        for (const index of row.path.split('/').slice(1).map(Number))
          current = current ? [...current.children.values()][index]?.clip : undefined;
        if (!current) {
          identities.push({ label, tick, id: row.id, path: row.path, missingCandidate: true });
          continue;
        }
        if (retained.has(row.id) && retained.get(row.id) !== current)
          identities.push({ label, tick, id: row.id, path: row.path, candidateReplaced: true });
        retained.set(row.id, current);
        const ids = aliases.get(current) ?? new Set<number>();
        ids.add(row.id);
        aliases.set(current, ids);
      }
      for (const row of samples.filter((r) => r.tick === tick && r.kind === 'retained')) {
        const candidate = retained.get(row.id);
        comparisons++;
        if (candidate?.frame !== row.frame)
          differences.push({
            label,
            tick,
            id: row.id,
            total: row.total,
            actualOriginal: row.frame,
            candidate: candidate?.frame ?? null,
          });
      }
    }
    for (const ids of aliases.values())
      if (ids.size > 1) identities.push({ label, candidateAliasesOriginalIds: [...ids] });
  }
await writeFile(
  resolve(capture, 'candidate-frame-comparison.json'),
  JSON.stringify(
    {
      scope:
        'Explicit constructor-epoch SwfClip replay over raw original SpriteInfo. EXIT multi-frame current/retained references only. No production migration, pose/matrix equality or global event/entropy claim.',
      comparisons,
      frameDifferences: differences,
      identityDifferences: identities,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    comparisons,
    frameDifferences: differences.length,
    identityDifferences: identities.length,
  }),
);
