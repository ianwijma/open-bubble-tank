# Separate field bounds and shape traversals

`core/display-geometry.ts` composes a physical display tree without reading paint,
advancing a clip, or constructing artwork. `simulation/field-queries.ts` compiles
the existing [physical population](field-population-reference.md) through a
mandatory geometry provider. These modules have no application caller yet.

Script bounds transform each declared leaf's integer-twip rectangle before
union. Invisible children, masks and masked-out content still contribute. Empty
content remains distinct from nonempty content scaled to zero. World/Main
ancestry does not enter this parent-space width calculation.

Shape contact has a separate traversal. The qualified authored-depth policy is
a mutable latch: a later mask hit clears a preceding miss, and an ordinary child
exactly at a missed mask's end depth is admitted. Runtime masks are retained
references with their own parent transform, independently of physical child
membership. Assigned masks do not contribute ordinary hit content, but still
contribute bounds wherever physically parented. Hidden authored masks block;
hidden ordinary targets and hidden runtime masks retain geometry. Alpha is not
a geometric exclusion. These finite policies come from the
[preserved-original controls](field-mask-runtime-reference.md), not the rendered
alpha of the reconstruction.

The internal query accepts a stage-space Point. The public-query boundary also
requires explicit receiver attachment and argument-to-stage mapping. It does not
infer the player's root/loaded-root policy from a transform. Detached public
receivers miss, while an attached target can still use a detached mask reference
internally. Matrix/Point arithmetic reuses the independently qualified display
helpers, keeping transformed twips internal until the leaf contact callback.

## Frozen and synthetic controls

`tests/display-mask-original.test.ts` compares traversal results and Script
width/height directly with the unchanged binary fixture. It covers the original
overlap/end/nested wrappers, visibility phases and all measured runtime-reference
assignment/reparent/removal phases. Its leaf callback accepts only the original
measured centre and 1000px-displacement controls, throwing for any unqualified
Point. It is deliberately not an approximation of the original contours.

`tests/display-geometry.test.ts` also replays all frozen Script-bounds transforms
and tests distinct receiver/argument ancestries with explicit synthetic fills.
`tests/field-queries.test.ts` exercises actual owner routing and synchronous
re-reads after movement, wipe, raw Run-array replacement, pickup removal, effect
queue delivery and concrete bottom-layer reparenting. Its dynamic rectangles are
synthetic. The field-width controls match the original extrema because those
rectangles stay inside them; they do not measure the complete native population.

Parent-owned copies of both original mask captures independently reverify 97
rows / 2522 binary64 values, and all 21 rejecting controls pass. Inputs are under
ignored `test-results/field-mask-review/`; the original research/capture files and
frozen fixture remain unchanged. Evidence IDs and exact source/runtime hashes
are recorded in the original qualification reference. REA events remain
incomplete and ineligible for equality.

## Remaining integration requirements

The provider must resolve every authored/tutorial, actor, pickup and effect slot
to actual retained content or an explicitly known empty clip. Unsupported
content must throw; there is no circle, bounding-box hit, raster-alpha, skipped
child or legacy-query fallback. No complete native/mock provider is installed.
Static-text advanced-rendering versus glyph contact, retained effect poses and
drawn lines, actor protection masks and complete mock geometry remain work.

The public `hitTestPoint` argument mapping needs its own discriminating original
control with a nonidentity Main. The existing mask captures reset Main to zero.
Tagged Ruffle v0.7.1 source at `core/src/avm2/globals/flash/display/display_object.rs`
lines 719–760 predicts a player-root-relative argument branch versus loaded-root
stage arguments; its fetched SHA-256 is
`3830a495c32197555194d6b3fabab9f26631983cb511a9ce4b8618c18c944312`.
That static source is not authenticated to the loaded WASM or Adobe runtime.
`fieldStageShapeHit` explicitly names its narrower internal stage-space contract.

Do not replace the gameplay field circle, beam wall/width, spawn or spacing
queries with this seam until those requirements are met. Singular/nonfinite
transforms and arbitrary runtime mask cycles are not qualified. Population reads
currently clone field sizing history; assess that cost before a hot-path caller,
without caching solely on the field revision and missing other owners' writes.
No complete field, ordinary-reachability, event/RNG, Adobe, pixel/audio or
full-game parity claim follows. Application E2E is not repeated for these unused
modules; future browser callers require their affected literal E2E flows.

Validation commands:

Formatting, TypeScript and the full check pass **1193 tests / 19427 assertions**.
The focused traversal cohort passes **18 tests / 179 assertions**. Three isolated
semantic mutations (keep an earlier mask miss, exclude the exact end depth, and
ignore a runtime mask reference) each fail the frozen-original assertions; the
source is restored byte-for-byte afterward. Logs and the restoration digest are
under ignored `test-results/field-query-traversal/`.

```sh
bun test tests/display-geometry.test.ts tests/display-mask-original.test.ts tests/field-queries.test.ts
bun run format
bun run check
git diff --check
```
