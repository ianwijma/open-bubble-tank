# Bounded native StaticText integration

`AssetPack.nativeClipGeometry` now selects `advanced-static-text` only for the
measured tutorial StaticText definitions1659–1666, using the actual retained
`SymbolResult` text rectangle and CSM metadata. It requires exactly one matching
renderer1/grid2/thickness0/sharpness0 record. Missing/duplicate settings, normal
or reserved modes, other grids/settings, other text IDs/classes, invalid declared
rectangles and nonnative/raster-only content reject. This deliberately does not
infer advanced mode from a text ID or use a glyph/alpha fallback. The DefineText
glyph matrix never changes the declared Engine rectangle.

This is an implementation of the already frozen
[text Engine qualification](text-engine-runtime-reference.md), not a new original
capture. Its source/arithmetic limitations remain. The
[settings inventory](text-contact-settings-reference.md),
[original contact family](text-contact-runtime-reference.md), all probes and
frozen binary words are unchanged.

## Explicit ancestry and dispatch

`displayGeometryHit` accepts an optional fourth `parentAncestry` argument;
`displayGeometryHitTestPoint` accepts the same property on its receiver. It is
the actual immediate-parent-to-stage list, including Main and excluding stage.
An empty list explicitly means stage parentage. A text query without the list
throws rather than treating the older collapsed `parentToStage` as exact.
Recursion prepends each actual node matrix. Advanced text starts with its own
matrix and composes that list bottom-up through the existing qualified helper.

The older `parentToStage` matrix remains the shape-contact contract. Shape
products, inverse/stroke callbacks and Script-bounds arithmetic are unchanged,
including in a mixed tree. These two inputs intentionally have different jobs;
owners must supply coherent actual ancestry, rather than deriving a fictitious
ancestor from the grouped matrix. This is not a generic transform migration.
A synthetic regression demonstrates the seam: an own1-twip translation and two
1.5 X scales round bottom-up to3twips, while grouping rounds to2twips, changing a
declared-edge hit. This regression is arithmetic coverage, not an additional
original-runtime transform qualification.

Direct advanced text returns its inclusive stage-rectangle result before the
shape inverse and assigned runtime-mask checks. Hidden public text still hits,
and genuine collapsed lines/points can hit. Public attachment rejection and
explicit argument-to-stage mapping remain outside that dispatch. A separate
synthetic Main-translation control distinguishes public root arguments from the
internal stage query; the unchanged36-row native root comparison remains the
original-runtime evidence for that public seam.

Text-bearing MovieClip containers require their own bottom-up world inverse
before visiting children. They retain assigned-mask checks and the existing
depth traversal. This inverse correction is bounded to text-bearing containers;
it does not change shape-only contracts. No Script rectangle is relabelled a
fully qualified Engine gate for arbitrary shape/morph containers.

Tagged StaticText source does not inspect `SKIP_MASK`, but being a text masker
is not measured. Accordingly text `isRuntimeMask`, text `clipDepth`, potentially
overlapping authored depth-mask/text combinations, alternate invisible-mask option paths, explicit
scrollRect and nonfinite text ancestry reject. Only the measured assigned-mask
bypass is implemented. Owners must supply a no-scrollRect external ancestor
chain; matrices alone cannot reveal an omitted ancestor property. Runtime mask
cycles and broader option/mode paths remain unsupported/unqualified.

## Retained ownership and comparisons

The native reader still only consumes current retained poses. It never starts,
advances or rebuilds a clip from age, touches a clock/RNG, or reads paint. Tests
have the owner explicitly construct tutorial1667 frames3–6, then verify its
actual eight text children and repeated reads without pose/object changes.
Frame1 still rejects its unsupported DefineEditText1655; this does not complete
every tutorial frame or install a dynamic-text provider. Parent byte-tag inventory
corrects the initial SimpleButton description:1655 is tag37, while frame2 uses
Sprite1658 and bitmap-filled Shape1657 with JPEG3 image1656. These are definition
identities, not additional original-runtime contact qualification.

The new unit and development-only browser proof route **all1,890 applicable
frozen contacts** through actual supplied native leaf metadata and both public
and internal traversal. The exact full control-key set is required. They also
compare every row's Script width/height, preserve public detachment, and cover
the direct/wrapper singular, hidden, assigned-mask, fractional boundary,
reflection and measured shear cohorts. The project advanced copy deliberately
uses original1659's identical rectangle/settings/glyph definition; it does not
add a production61001 definition. Normal and mask-role rows are excluded from
this advanced-only cohort explicitly; unsupported normal metadata is separately
tested to reject.

The existing shape-contact spec retains all51 native mask controls,36 root rows
(108 hits/72 dimensions),13 stroke controls, transparent fills, native projectile
and protection contact, and all six supplied-art attachment-membership cases
(one in mock mode). Native text results remain null in mock mode. The private
spec copy changes only import paths and fixture port; a reverse transformation
asserts byte equality with the source spec. No fixture hook enters production.

## Validation and delivery boundary

Reproduction uses only owned4095/4096 after checking both free:

```sh
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/advanced-static-text/playwright.config.mts
```

Ignored `test-results/advanced-static-text/` retains logs, post-formatter source
fingerprints, routing proof, browser report/actual proof JSON and screenshots.
Two E2E setup attempts built production but collected zero browser tests because
Node required JSON import attributes, first on the new shared fixture and then
on its transitive scheduler data import. The E2E oracle now decodes frozen words
locally, without importing candidate/scheduler modules into Node. The scheduler
is unchanged. Both failed setup logs remain separate from final runs.

Final formatting and the supplied-file check pass **1,230 tests /66,109
assertions**, with no failures/skips. The literal affected E2E command completes
production build `qakndwO9nm-qcLjNl2cE1` and **2 mock/supplied-file cases** in20.2s,
with zero skips, failures or flaky results. All1,890 text contacts and3,780 Script
dimensions match;1,887 attached cases also match the internal query. All51 mask,
36 root,13 stroke and6 native/1 mock attachment-membership controls remain green.
Both contact paint sheets were inspected; this is scoped protection/status
presentation coverage, not a text-pixel or original-pixel equivalence claim.

All **891 inputs captured after formatter completion** remained byte-identical
through the final check/build/browser run. All171 protected fixture/reference/
helper/scheduler files still match the base. `verification.json` retains exact
report/proof/screenshot hashes. This final-results paragraph is a post-run
documentation update, not a product/source change. Playwright stopped its owned
servers and4095/4096 were checked free. The supplied input hash remains
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`;
master897d2e741b8a1d23f563f8bb8a2e6bd684932b9b and the protected legacy refs at
22d9def7321bada8a2148a69a79a3392682bb390 remain unchanged. No push, PR, deployment
or provider-setting action was taken.

No gameplay World field, beam, spacing or spawn caller migrates. The unused field
composition seam still needs a complete provider and explicit actual ancestry
before consuming these text leaves. Complete actor/effect population and Engine
bounds, arbitrary affine/root-loaded/normal-glyph behavior, global events/RNG,
ordinary progression, compiled-source authentication, Adobe, pixel/audio and
full-game parity remain unproved. The shared SwfClip scheduler and effect task's
ports/ownership remain untouched. This local change is for combination with the
retained-effect task as the fifth PR, not a separately published delivery.

## Parent field binding review

The parent integration preserves the actual separate World-origin and Main
matrices in `WorldDisplays.worldAncestry`. Both existing field query entry points
pass this immediate-parent-to-stage list to the text-aware traversal, in addition
to their unchanged grouped matrix for legacy shapes. Main's fractional position
setters remain separate from query Point quantization.

Authored masks cannot reach a text-bearing direct child whose depth is at or
above every mask end. The source depth test admits exact end depths, and runtime
addChild entries follow authored ranges. The traversal now permits that disjoint
case; potential overlap still throws even if this particular query would miss
the mask. This admits the field's runtime tutorial sibling above its existing
under/exterior mask ranges without claiming authored masked-text qualification.

Two parent regressions fail before this binding: a synthetic text leaf in the
actual field population has no explicit ancestry, and a disjoint mask sibling
causes an unsupported-role error. Both pass after the correction. They isolate
API/physical-range composition, not an original full-field runtime measurement.
The original1,890-contact cohort and all existing shape/mask controls remain the
qualified component evidence; complete native field/provider integration remains
unfinished. Final combined validation is recorded below after the parent run.

The parent run passes formatting/typecheck and **1,232 tests /66,118 assertions**.
Literal affected E2E completes build `9GxqcFz0owJVhzpTpPsmn` and **2 mock/SWF cases**,
zero skips/failures/flaky results. All892 post-formatter inputs remain unchanged
through the run. All1,890 text contacts,3,780 dimensions,51 mask,36 root,13 stroke
and6 native/1 mock attachment controls remain intact. Proof JSON and both inspected
paint sheets are byte-identical to the child's qualified run; no new text-pixel
claim follows. Owned4195/4196 servers exited and both ports were free. Ignored
`test-results/field-text-binding/` retains before/after regression logs, actual
tag inventory, routing equality, hashes, browser report/proofs and verification.
This paragraph and the corrected type descriptions are post-run documentation;
the test comment correction does not alter any assertion or executable behavior.
