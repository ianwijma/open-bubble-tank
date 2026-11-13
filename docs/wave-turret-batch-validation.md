# Field generation, retained turrets and status placement

This five-layer batch follows master `073657829df51f35cf6c2787331a3377c22138d5`.
The final branch contains the four preceding published heads by ancestry. Its
combined current-head Actions/review gate is required before one master merge;
intermediate green checks do not establish that final gate.

| Layer | Recovered contract | Evidence and limits |
| --- | --- | --- |
| PR135, `18e1946a70a335bc3476518879fdf2d795abf947` | Prepare all option counts before choosing a wave; preserve rounded tickets and repeated-index rejection. | [Wave reference](wave-selection-reference.md): failing-before rules and an independent bounded pcode audit of 1,344 cases / 99 constructor sites. The audit is not AVM2 execution. |
| PR136, `88424001fa829eb3b825678bda66a7136d06737a` | Finish enemy construction/Setup before consuming field-pose draws. | [Birth reference](cross-field-weapons-reference.md#field-births-finish-construction-before-their-display-pose): builtin-boss regression retains choices and pose while asserting draw order. Complete constructor/art entropy remains unproved. |
| PR137, `cd8100dcab5e821cc8820266078de6b274467a76` | Round roster candidate indices and consume boss selection before Setup, including a singleton. | [Candidate reference](wave-selection-reference.md#roster-candidate-indices-and-boss-selection): builtin/saved boundary and boss-prefix regressions fail before correction. Offline roster policy remains an adapter. |
| PR138, `4353d497f518e1e0f3e8aff8243fabebe6b3cddd` | Keep direct turret targets/homes, physical parentage, rejected raw births and cached-avatar read interruption. | [Turret reference](shield-turret-retention-reference.md): six failing-before regressions, an additional home case, and three controlled original-code Ruffle probes. These are not ordinary cached encounters or Adobe proof. |
| Final layer | Use the source rounded part index when status decoration samples five marks with replacement. | The source/bytecode audit and boundary regressions below; aggregate local validation covers the complete branch. |

## Status placement and random draw order

`_-Zx.EffectMeCrazy` at AS lines1338–1435 has two paths. Fewer than five
details receive one mark each in detail order, with no part-selection draw. Five
or more details receive five independent selections with replacement. Each mark
calls `_‑Wq(0, length - 1)` before choosing its rotation and variant; it does not
floor `Math.random() * length`. `_‑Wq` at lines353–355 is the same rounded inclusive
helper used elsewhere in the simulation.

The matching exported pcode method starts at line5874. Its `ofs01b0` block
calls `_‑Wq` with zero and detail length minus one, converts the result to int,
then follows `ofs024b` → `ofs0235` → `ofs021e` → `ofs0204` for X, Y, rotation
and the stopped/playing variant. This independently confirms the decompiled
selection and per-mark ordering. No deduplication or repeated-index rejection
occurs here; the wave table's rejection rule does not apply to status marks.

For five details, raw0.19 selects index1 instead of the previous floor index0;
raw0.81 selects index3 instead of4. For seven details, raw0.14 selects1 instead
of0, and0.86 selects5 instead of6. Two regressions replay both boundaries,
retain duplicate first/second marks, and require the complete position/rotation/
variant sequence with exactly15 explicit simulation draws. A third regression
requires four marks in detail order with exactly8 draws. Both boundary tests
fail on the previous production code and pass with the rounded selection.

Only part-index selection changes. Existing replacement/lifetime, forcefield
guard, detail coordinates, variant clocks and rendering/contact ownership stay
in their respective modules. The marks participate in whole-tank contact, so
this correction affects their geometric positions as well as their paint.

Source files, relative to the local research `re/bt3` directory:

| File | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-Zx.as` | `3a5c16a3f14e1ceae76b93185a8c4a974b9e2b9326b6021526f2320d89522f16` |
| `export_pcode/scripts/_-Zx.pcode` | `2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea` |

These tests cover explicit simulation draws. They do not establish a complete
original constructor/frame-script entropy stream, display-setter precision,
event scheduling or a synchronized original-runtime differential.

## Combined local validation

The final validation uses the local research SWF through `BT3_SWF_FILE`; the
application still requires the player's locally supplied file. No artwork,
SWF, dependency output, build output or captures are committed.

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-final-validation/playwright.config.ts
```

Ignored evidence is under `test-results/wave-final-validation/`. The private
config owns3165/3166 with server reuse disabled. Ten copied specs change only
the fixture transport URL3102→3166; every assertion is retained, and
`spec-copy-verification.json` records their digests and reverse comparison.
The original public creator/save/source-option pair runs from `e2e` with its
private production baseURL. The combined selection contains24 mock/supplied-art
cases covering actors, Buster, crossing, accelerated boss/win, ink, turrets,
weapon targets, tank art, geometric contact, combat effects and the public
saved-enemy caller.

Formatting, TypeScript and932 unit tests /8,549 assertions pass. The production
build is `mf-6euyRvsFkXhAn_zcLe`; all24 browser cases pass in4.3minutes, with
zero skips, flaky cases or page errors. Both seeded pilots reach six upgrades,
boss defeat, badge and Continue (mock80,162 / supplied-art79,000 frames). Those
are accelerated fixture runs. Native crossing, combat effects, status/contact,
tank-art, turret, win and history captures were inspected. Both owned servers
exited; no listeners remain on3165/3166, and fresh socket checks confirm the
ports are available. `validation-summary.json` and `provenance.json` record
results, cleanup, source/test/tool hashes and build identity. The final source
files still match the manifest recorded against the built code.

The 1,344-case /99-site template audit also passes on the combined branch. The
first concurrent typecheck encountered missing `.next/types` while the build
regenerated them; after generation the full serial `bun run check` passed.
No assertion, compiler option or suite was removed to obtain the result. Native
contact/art fixtures validate adjacent retained-status rendering; the new
five-/seven-detail selection boundaries are covered directly by unit/source
evidence rather than claimed as an original pixel differential.

The final hosted Actions/review gate remains pending publication and inspection.
The ordinary supplied-art session on the fourth-layer head is a separate
normal-time/public-input investigation; its eventual results must retain that
exact code/build identity. It is not the seeded accelerated pilot, does not
include this final status-index correction, and cannot establish original/Adobe
or complete-game parity. Do not replace incomplete ordinary boss/win evidence
with an accelerated fixture result.

All branches retain the `stack/**` deployment rule. No Vercel build or provider
setting is triggered or changed by this local validation. An absent provider
check alone does not prove that Vercel honored the rule. The full goal remains
open, including ordinary boss/win, arbitrary retained matrices, full constructor/
event/RNG scheduling, pixels/fonts/filters, sound and original/Adobe comparisons.
