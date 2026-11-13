# Retained field, avatar and effect projection

This local continuation consumes [FieldDisplays](field-wrapper-state.md), the
[World sibling owner](world-layer-display-reference.md), and the
[qualified pickup clocks](pickup-clock-reference.md). It follows merged PR149;
it is not part of that delivered batch and has not yet been published.

`GameRenderer` keeps World at stage (275,225). Main shake remains a separate
ancestor; user zoom remains a separate presentation scale. Field background,
actor, life and tutorial poses come from their actual retained instances. Bullet,
top-effect and highlight poses come from their World siblings. The avatar uses
its own retained pose. The player's simulation coordinates are inputs to avatar
artwork, not a second camera translation. Drawing does not move or reconstruct
any source instance.

The original Point adapter uses float32 coefficients and integer twips. Root and
nested-bottom composition remain distinct. This does not turn the entire Pixi
scene into a complete Flash display tree: field masks, all retained effect/native
child poses and exact width/hit queries remain separate work.

## Original numeric oracle

The [distinct original probe](world-layer-original-reference.md) freezes 90
snapshots using builtin ByteArray binary words. Original Setup, TankData._-Tr,
DeathAnimPart2 and 119 synchronous ShrinkBubblefield calls actually execute.
Finish, next construction and detach controls retain their declared glue limits.
The parent consumes these independently measured values; no native helper
creates expected numbers.

`tests/world-layer-original.test.ts` checks cached getters, effective coefficients,
translations and original Points for root, bottom, top, bullet, highlight and
avatar at 0, 1, 2, 51 and 119. Separate controls check fractional Main ancestry and the
finish transform prefix without a 120th shrink. Six cases make 520 assertions.
They do not assert equivalence to the detached Ruffle concatenatedMatrix API,
which the original probe records as disagreeing with its localToGlobal API.

The browser collapse test uses original frozen avatar and bottom/top Point
values, retaining zoom as a separate 0.75 presentation scale. Shot assertions
also check owner-to-painter projection. This replaces contradictory linear
avatar and uniformly derived layer expectations. It is a finite geometry and
paint check, not ordinary collapse scheduling, pixel equality or Adobe proof.

## Physical effect ownership

`projectEffects` visits actual registered-engine children, rather than the
completion record's context or FieldRuntime compatibility effect arrays. A next
request can still be physically attached to the outgoing registered layer.
Native and mock views retain actual Effect objects, independent of gameplay UID.
Reparenting preserves the view and addChild order. Actual lower117 nesting
inherits root/under-effects alpha; top and screen remain independent siblings.

The artificial `effect-ownership` gallery creates a next-context request, two
same-UID objects and a physical reparent. Both asset modes must paint the
outgoing-position effect, retain separate objects and preserve reparent order.
These operations exercise actual engine and production-renderer methods; they
are not an ordinary encounter reachability claim.

The preceding actual CombatEffectsView from `f6d9ee7` is replayed separately with
the same gallery/projection/assertions, restored in a finally block. This is a
bounded prior-view regression control; it does not claim to replay the old
GameRenderer's context routing or a whole historical build. Ignored artifacts
record the exact source/restoration digests and failures.

## Explicit artificial layouts

Several galleries directly replace player coordinates, transit offsets, wave
scale or tutorial metadata. These scalar edits do not represent Flash display
setters. `tools/fixtures/field-layout.ts` explicitly supplies their omitted source
move/follow/setup operations; tutorial substitutions explicitly call the stopped
clip selector. These adapters are invoked at artificial edits, never from
production drawing or automatic array discovery. The actor reparent expectation
remains 415; its omitted display move is supplied instead of changing the
assertion. Superseded wrapper poses are left retained during subsequent steps.

## Validation and boundaries

Exact commands, source/build identities, browser reports, negative controls and
cleanup are retained under ignored `test-results/retained-renderer/`. The repaired fixtures and restored production sources pass together:

- `bun run format` and `bun run check`: 1,109 tests, 16,078 assertions.
- Literal supplied-SWF `bun run test:e2e --config test-results/retained-renderer/playwright.config.mts`: 44 mock/native cases, zero failures, skips or flaky results.
- Production build `wtvomZbcwV1LMW9O2u0Ea`; all 712 source/tool/test digests match the prebuild inventory.
- The previous actual effect view fails both new browser cases: native same-ID objects alias (`top:0` instead of `top:1`), while the batched mock node cannot retain the individual effect position. Source bytes are restored in a finally block. The first combined run's two actor-fixture failures and the earlier collection/import failures are retained separately; they are not reported as passing runs.
- Original World evidence independently re-verifies all 90 snapshots in an owned copy, retaining incomplete REA-event limitations. Six native numeric cases make 520 assertions against its frozen words.
- Supplied-art collapse, physical effects and superseded-wrapper paint were inspected; the literal combined run includes mock/native pickup ownership and animation checks. Owned 3735/3736 servers exited and both ports are free.

Private spec copies change ports and import routing only; the source-backed collapse expectation repair is committed in the actual spec. No tests were skipped or assertions removed to get this run green.

No artwork entropy or native-effect playback scheduler was qualified here.
Actual effect poses still use the existing per-view entropy adapter. Bullet
render identity remains its preceding UID-based implementation. Complete field
shape/mask/order composition, dynamic Script width/hit geometry, ordinary earned
boss/win progression, global RNG/event equality, compiled Ruffle revision and
Adobe/pixel/audio/full-game parity remain unproved. No provider settings,
deployment retry, protected branch or research source was changed.
