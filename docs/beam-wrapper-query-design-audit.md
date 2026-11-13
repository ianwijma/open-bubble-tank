# Damage-beam wrapper query: local design audit

This local follow-up starts at `1ca0d1d91ac8bc4614e1565d62a3f50a5c9790e5`.
It extends the [original wrapper controls](beam-wrapper-geometry-reference.md),
without changing production geometry or claiming to repair the remaining beam
mismatch. PR144 and its combined gate remain the parent's work. There is no
sixth PR, push, merge, deployment, dependency installation or provider change.

The defensible design is a query over a retained field display tree, with
separate geometric-hit and Script-bounds traversal. Current helpers are useful
building blocks, but do not yet supply that complete tree or its exact bounds
arithmetic. Attaching only a background contour and actor hit callbacks would
leave fundamental display-population and transform coverage missing. No partial
replacement is integrated here.

## Source scope and authored geometry

Source paths below are relative to
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
Matching qualified pcode remains authoritative over decompiler ordering.

- `_‑14/_‑CO.pcode` retains the per-loop `_‑W.width` read at `ofs03cc` and
  line/mask/cap writes before `_‑W.hitTestPoint(..., true)`. The bullet's parent
  is the world-owned sibling layer; `_‑W` is the field receiver. Neither raw
  damage candidates nor the bullet's own hit result define field membership.
- `BTAGameWorld.as:400–420` / `BTAGameWorld.pcode:1462–1584` place the first
  authored field, attach tutorial artwork, call Setup, rotate `_‑SQ` to180 and
  construct the sibling bullet/effect layers. This probe still does not execute
  that complete Setup or the tutorial's frame scripts.
- New-field setup at `BTAGameWorld.as:1812–1815`, qualified pcode `ofs0591`
  (`8433–8477`), assigns **scaleY then scaleX to four children**:
  `effect_mask_under`, `_‑SQ`, `BF_over_detail_mc`, `BF_BG_mc`. It overwrites the
  authored `_‑SQ` scale; it does not uniformly scale the field root or enemy
  layer. The following source reads `currentBFTarget.width` and the new wrapper's
  width when calculating separation. No transit-spacing production change is
  made here.
- Collapse is a different transform: `_‑0D.as:181–199` changes root scale and
  the separate sibling layers/avatar together. Root-only controls below do not
  reproduce that complete lifecycle.

Re-extraction with existing `decompressSWF` / `extractSymbols(...,{svg:false})`
and `buildDisplayList` confirms symbol1551's relevant frame1 topology:

| Depth | Named child / symbol         | Mask range           |
| ----- | ---------------------------- | -------------------- |
| 1     | `BF_BG_mc` /1537             | none                 |
| 4     | `effect_mask_under` /1539    | through depth8       |
| 6     | `effectLayer_under_mc` /1540 | inside depth4 mask   |
| 10    | `_‑SQ` /1542                 | through depth14      |
| 12    | `avatarUnderBubble_mc` /1544 | inside depth10 mask  |
| 16    | `lifeBubbleLayer_mc` /1545   | outside those ranges |
| 18    | `enemyLayer_mc` /1547        | outside those ranges |
| 20    | `BF_over_detail_mc` /1550    | outside those ranges |

Background shape1536 declares ±8505twips, including a60twip stroke. Exterior
mask shape1541 declares ±13919twips. The mask's authored placement has scale
`0.9924774169921875`, translation(-1,-1)twips. Its raw1391.9px diameter is
therefore not the first field's observed1381.4px width. The existing
`tools/import-swf-geometry.ts` writes the **raw leaf diameter** into
`field-geometry.json`; that value must not be reused as a first-field Script
width or proof of current transit-spacing fidelity.

## New preserved-original controls

`beam-wrapper-probe.py ... --geometry-audit` adds27 ordered rows before DONE,
retaining all43 baseline rows and their assertions. Without the flag, emitted
bytes remain identical to the previous probe, SHA-256
`cff34e6c2edf6913e214952fb7a17ef8b6ef90a27c0705bcc42b12dd9c1a8f69`.
The extension reuses the previously constructed Basic avatar root. No original
method, RNG function, clock, frame script or original ABC payload is patched.
Source-equivalent setter controls are distinct from full new-field Setup.

All horizontal sweeps use the existing canonically spawned Aggressor2017 beam,
requested/read-back x5.2,y0,rotation0, empty raw candidates and source sibling
ownership. Child scaling changes the four children above; root scaling leaves
the sibling bullet layer unscaled deliberately to isolate the receiver transform.

| Receiver control             | Scale | Original field width | Final line/mask/cap |
| ---------------------------- | ----: | -------------------: | ------------------- |
| First authored field         |     1 |               1381.4 | 421/425/421         |
| Four child setters           |   0.5 |                  696 | 205/209/205         |
| Four child setters           |     1 |               1391.9 | 421/425/421         |
| Four child setters           |  1.25 |               1739.9 | 523/527/523         |
| Four child setters           |     2 |               2783.8 | 841/845/841         |
| Authored children, root only |   0.5 |                690.7 | 205/209/205         |
| Authored children, root only |  1.25 |               1726.8 | 523/527/523         |
| Authored children, root only |     2 |               2762.9 | 841/845/841         |

The original Basic-root center hits its own shape at x0,430,600,900. With that
display-only root in the enemy layer, the field also hits all four points.
Reparenting the same root under `avatarUnderBubble_mc` makes the field miss900,
while its own query remains true. Reparenting under `effectLayer_under_mc` makes
the field miss430,600,900. The field's width at900 stays1610 in all three
parentages. Masks affect field shape contribution without cutting Script bounds.
The x0 observations do not establish the masked actor's individual contribution:
the background also hits there. These are artificial placements, not ordinary
EnemyAI encounters, Adobe behavior or reachability evidence.

Restoring authored scales, sibling ownership and removing the actor restores the
original421/425/421 and1381.4 width. Original StopFiring and probe-world detachment
finish before DONE. Both old actor-extension/distant-width controls remain intact.

## Native helper comparison and objections

An isolated owned Chrome context uses the current `AssetPack.hitClip`, `SwfClip`,
`clipScriptBounds` and the actual extracted field shapes/placements. It does not
load the whole production game or an original AVM2 simulation.

The seven horizontal background edge booleans agree with the original:
424.9,425,425.05,425.2,425.25 hit;425.3,425.5 miss. Retained native field queries
also give the same four child-scale and three root-scale final line lengths
listed above, using direct local numeric queries rather than claiming complete
native Point-conversion equivalence. This supports preserving authored contours
and the existing mask traversal instead of fitting a circle to one phase.

Script bounds do **not** agree exactly. Current `clipScriptBounds` returns
1381.4293167114258 for the authored field; child scales0.5 and1.25 return695.95
and1739.875, versus original696 and1739.9. Even multiplying a previously observed
width is insufficient:1381.4×2 is2762.8, while the original root2 query is2762.9.
The existing visitor composes Number matrices and transforms corners without the
display runtime's complete float32/twip behavior. These controls constrain a
future implementation; they do not establish a general rounding rule.

A separate native mask test inserts a small authored shape leaf at each center
under the same three original layers. Its center-hit booleans agree with the
original reparenting controls. This **synthetic native child is not the Basic
recipe**; its different width is deliberately excluded from equality claims.

Remaining structural objections:

1. `SwfClip` retains authored depth children and independent timeline poses;
   it has no general runtime add/remove/reparent ownership API. Its placements
   come from shared authored display-list objects. Runtime scale/matrix overrides
   must be per-instance state, not writes into AssetPack's cached placements.
2. `AssetPack.hitClip` / private `symbolHit` already traverse depth masks and
   shape paths, but neither is an assembled live field query. The renderer paints
   background1537 and actors/effects separately; it does not retain a complete
   symbol1551 tree. `symbolScriptBounds(1551)` alone is static and its arithmetic
   already differs above.
3. `ActorParents` tracks actual links separately from raw enemy/allied arrays,
   including retained and reparented actors. Its membership sets are private and
   `sync` reconciles arrays. A new query needs an explicit, phase-correct view of
   display membership; enumerating damage candidates is incorrect. Rendering's
   array filtering is not an independent source of truth either.
4. Field children also include tutorial artwork, life pickups, under-avatar
   artwork, detail/helpers and effects. Actor status/protection children have
   their own retained bounds/geometry. A background-plus-enemy implementation
   leaves these source-backed populations and their frame ownership unaccounted
   for. Source setup changes children and masks; a single `field.scale` cannot
   encode the first-field, later-field and collapse states.

These are required state/coverage decisions for a faithful wrapper, so this draft
does not wire a partly populated field into `tickDamageBeam`. The existing radius
adapter's origin5.2 result remains415 versus original421; there is no repaired
production after-result in this commit. Accepted-shot entropy, canonical birth,
raw target grid/carrier contracts and retained beam lifetime are unchanged.

## Proposed narrow boundary, pending those decisions

The simulation can depend on a numeric service with two operations:
`scriptWidth(field)` in the receiver's parent coordinates, and
`hitPoint(field, globalPoint)` for the receiver's complete shape query. Keep the
source loop's width read at every iteration and the line/mask/cap assignments
before the hit query. Do not include the sibling bullet layer in either traversal.

The service should consume a simulation-owned retained field/display snapshot,
actual-parent actor membership and per-instance matrices/poses. AssetPack should
supply leaf geometry and timeline placement data; browser canvas/Pixi objects
remain outside simulation. Mock mode needs repeatably imported numeric field
contours/hierarchy and the same query semantics. Mask hits and Script bounds must
remain separate traversals, with Script bounds transforming leaves before union
and including masked/invisible geometry. Preserve actor display ownership rather
than cloning it into a second array-derived field tree.

Before integration, qualify actual Setup/new-field/collapse transforms and full
display populations, validate the bounds arithmetic against independent original
controls, then add failing-before cases through the real avatar trigger and field
Run. Exercise reparenting, raw queued deaths, masks and dynamic widths together.
Run literal affected `bun run test:e2e` in mock/SWF on private3335/3336, without
assertion/suite changes, after formatting/check. That integration is not claimed
by this audit.

## Reproduction and verification

```sh
python3 tools/reference/beam-wrapper-probe.py ORIGINAL.swf AUDIT.swf --geometry-audit
BT3_REFERENCE_PORT=3345 BT3_SWF_FILE=AUDIT.swf bun run reference
BT3_REFERENCE_CDP_PORT=9345 BT3_REFERENCE_URL=http://127.0.0.1:3345 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9345 BT3_REFERENCE_URL=http://127.0.0.1:3345 BT3_PROBE_OUT=CAPTURE node tools/reference/beam-wrapper-observe.ts
node tools/reference/beam-wrapper-verify.mjs ORIGINAL.swf AUDIT.swf CAPTURE --geometry-audit
```

Arm the collector before the declared REA load/ready/settle/focus/F8/done scenario,
as in the preceding reference. The observer now accepts a private reference URL;
its default3305 behavior is preserved. The verifier checks the complete27-row
extension in order, all43 unchanged baseline assertions, original payload/order,
loaded probe response, viewer/runtime module identities and independent REA DOM.
The opt-in verifier does not discard unknown rows or loosen baseline checks.

Extended probe SHA-256:
`83d31c7fae9aa557dd8cc92fb782fb80babfb08d49234eab41e8d6c8e2161046`.
Second emission is byte-identical. All3022 original tags retain payload/order;
output has3023 tags. Both original ABC payloads and non-document bindings are
preserved. Missing audit row, flipped masked900 hit and changed module digest
mutation controls all fail. The default43-row verifier also passes against the
retained original capture copied read-only into this checkout.

REA evidence `ev_f6cd2c9b053439d5892ad8937e6ba048f73df379e06099b0e34a0bd75b73c49d`
completes every declared action, retaining DOM independently. It still reports
incomplete/missing events and `equality_eligible=false`; no complete event, RNG,
timing or scenario-equality claim is made. The collector reports no page errors or
AVM failures. Chrome157.0.8103.38/V8 15.7.112.23, Ruffle0.7.1, Linux x86_64,
Bun1.3.9 and Node26.11.1 identify this bounded replay; loaded module hashes are
retained rather than asserting a Ruffle source/build revision.

Ignored artifacts in this checkout: `test-results/beam-wrapper-audit/` contains
source hashes, authored hierarchy/extraction script, original probe/emissions,
`runtime/{observation,scenario,scenario-input,verified-preservation}.json`, raw
trace/module records, mutation results, native scripts/results, check/format logs
and process identities. The first native attempt on the already-used reference
browser was closed during a pending evaluation; it is not positive evidence.
A fresh isolated context completed, and reducing serialization to the relevant
authored hierarchy repeated that result. Earlier missing retained-capture paths
and scratch `.ts` typecheck errors remain logged; final checks use ignored `.mts`
audit scripts, without changing tsconfig, production files or test assertions.

Final `bun run format` and `bun run check` pass:987 tests,8,791 assertions,
zero failures. No production rule or browser flow changes, build, production E2E
or full-game parity claim is included. The original server PID2802442 and owned
reference Chrome root2802488 (launcher2802474) were identified before shutdown;
the final native context's root2857201 is recorded separately. F8/click actions
completed, StopFiring detached the probe, owned contexts/browsers/server exited,
and3345/9345 plus unused3335/3336 are free. The temporary local dependency symlink
is removed before commit. All `src/`, unit/browser test files, parent checkout
sources/builds/processes, original inputs and protected master/legacy refs remain
unchanged.
