# Under-avatar field rendering audit

This is a source/render audit at `5d202d4`, not a completed original-pixel
comparison or a rendering repair. The retained field model has an under-avatar
instance and source-backed numeric setters, but `GameRenderer` has no matching
painted instance or exterior-mask branch. Resolve this as visual package3.2 work;
do not count geometry/width qualification alone as visible implementation.

## Actual source-owned branch

The repeatable `tools/import-field-display.ts` inventory records original1551:

| Child | Symbol / authored depth | Role |
| --- | --- | --- |
| `_‑SQ` | Sprite1542 at10, clipDepth14 | Exterior mask; actual retained rotation changes0/180 |
| `avatarUnderBubble_mc` | Sprite1544 at12 | Under-avatar artwork controlled by that mask |
| `lifeBubbleLayer_mc` | Sprite1545 at16 | Outside that authored mask range |
| `enemyLayer_mc` | Sprite1547 at18 | Outside that authored mask range |

Sprite1542 contains Shape1541; Sprite1544 contains Shape1543. Independent runtime
extraction from the supplied source confirms Shape1543 is tag83 with declared
twips±1010, edge twips±1000, opaque fill187/217/242 and a20-twip white stroke.
Shape1541 is tag2 with declared twips±13919 and an actual exterior contour with
an inner curved boundary/slit. Its geometry is not an ideal distance425 circle.
Ignored `test-results/field-render-audit/shape-materials.jsonl` retains the parsed
source definitions; no extracted images or media are added to the repository.

Original `AvatarInterface.as:958–959` assigns the next child's width then height;
at1210 it retains the current child's actual instance. `BTAGameWorld.as:1234–1235,
1266–1269,1338–1339,1352–1353` moves/snaps those actual instances. Source rotations
of `_‑SQ` occur at413,1479/1483,1837. Those setters and retained identity are
already modeled in `FieldDisplays`; see [the wrapper state](field-wrapper-state.md),
[under-avatar sizing](under-avatar-sizing-reference.md) and
[original World/collapse transforms](world-layer-original-reference.md).

The existing numeric/mask comparisons qualify their stated geometry and pose
contracts. They do not establish original under-avatar pixels, antialiasing,
painted stencil behavior, or how a Pixi mask handles a textured clip's colour.
Do not copy geometric hit-test mask rules into paint without checking that
separate rendering behavior.

## Current painter gap

`render/pixi-renderer.ts` paints the1537 field-background raster, captions,
bottom effects, physical pickups/actors, projectiles and World highlights.
`render/field-transform.ts` already reads actual root/slot matrices, including
collapse; that is not an under-avatar painter. No renderer-owned1544/1542 pair
consumes `fieldDisplays.read(field).slots.avatarUnder`/`exteriorMask`.

Consequently a complete geometry tree can report this child while the current
renderer still omits its branch. Adding a generic halo to the avatar would use
the wrong owner: current, next, orphaned and detached wrappers retain separate
instances, transforms and mask orientation. Source order is also separate from
the existing global rendering groups; one added branch must not be described as
a complete correction of cross-field stacking.

## Required implementation/verification boundary

Use actual retained field/slot matrices and source child order. Native artwork
must come from the supplied runtime assets, with source mask geometry, rather
than an invented circle or bundled extracted image. The procedural mock path
must document its finite approximation. Keep paint outside simulation and do
not reconstruct pose, captured sizing or mask orientation from map coordinates,
player radius, transit age or field scale.

Qualify actual original paint in finite inside/edge/outside and both-orientation
controls, distinguishing source-method writes from glue positioning. Keep
original constructors/ABCs/bindings and input evidence intact. Compare placement,
presence and clipping without inventing full pixel/Adobe equality. A new
renderer fixture must reject the old missing branch and preserve adjacent
crossing/collapse/actor/effect assertions. Resolve any unqualified mask/render
behavior before claiming the native branch faithful.

This audit changes no product, clock, geometry query or original input. It does
not close the complete field provider, ordinary progression, global event/RNG,
Adobe, pixel/audio or full-game acceptance gates.
