# Retained actor artwork lifetime correction

This is a bounded repair above 88a98ef, using the unchanged
[original actor qualification](actor-clock-original-reference.md). The generic
effect/scheduler dependency 3336159f51746b6cd71be958238c455b272ea175 is picked
as abc4dce43dc6a75d2bab1ae495e0d0b0fc71269d; only its two append-only documentation
conflicts required resolution, preserving both sides. The actor correction is a
separate subsequent commit. The independent orbital fixture repair
5c5919b61d502dae21416bc90ce3ae88d18e4a24 is also picked, as
8261c98948fe646951a1614215cc0f79135fc305, without changing its assertions.
No additional shared scheduler or effect/carrier
implementation is supplied by the actor patch.

The supplied original is
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`,
SHA256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.

## Ownership and epoch

`createTank(..., world)` explicitly registers the actual object with that World's
`ActorArtwork` lifetime owner. No UID, dead flag, enemy/ally Run array, physical
parent or stage-membership read discovers constructions. Host fixtures created
without a World explicitly supply the omitted construction through
`world.actorArtwork.construct(tank)`; production never imports those fixtures.
`attachActor`, raw roster replacement and cache restoration do not register,
reset or rebase a lifetime. A repeated explicit construction registration of the
same object is idempotent. Distinct objects sharing both UID and design retain
separate ages and mounted trees.

World captures weak references for its cohort before any Main/World work and
advances that cohort in the existing artwork pass. An actor born inside that
listener therefore keeps its initial pose through the following ENTER, matching
the measured negative-Y 1/1/2 cohort; before-ENTER constructions yield 1/2/3.
Pause, standalone Main4 artwork, retained cached actors, directly removed actors
and replaced avatars follow the same lifetime policy without gameplay Run,
wall timers, gameplay RNG or gameplay UID consumption. Detaching the wrapper
preserves actual actor parentage; removing the actor itself still removes that
parent. Existing callback/removal errors remain unchanged.

Already materialized AssetPack mounts have a weak numeric playback observer.
The pack's existing per-actor WeakMap owns those playback records. A World tick
advances them even when the actor or mounted root is absent from paint/contact.
Only existing records are visited: there is no design/array-based constructor
fallback. Stopped 4015/symbol 701 roots still run their original stop scripts;
current 40-frame descendants advance independently. Reattachment uses the same
`PartPlayback`/`SwfClip`/current child identities. Painter and contact queries
then observe that current pose without having to reset or advance it.

Clock registrations contain WeakRefs, pruned on later frame entry. The playback
bridge is a WeakMap keyed by actor with weak playback observers. Neither keeps
otherwise unreachable actors, packs or historical trees alive solely to clock
them. Actual physical parents, cache entries, callbacks and ordinary references
remain the strong owners. GC timing, Flash collector equivalence, retaining only
a naked child after all actor/AssetPack owners disappear, cross-World transfer,
global-session scheduler ordering and partial constructors interrupted by an
error are unmeasured. No deterministic GC outcome is asserted by these tests.

## Boundaries that remain open

The [actor provider audit](actor-artwork-query-boundary.md) remains applicable.
AssetPack/PartPlayback still lazily construct mounts with an independent host
artwork stream seeded from host identity. First geometry/paint access can still
perform that construction and initial frame-script work. In particular, positive-Y
constructor versus first-ENTER/EXIT phase separation is not repaired by changing
logical age. This patch neither authenticates source construction/entropy nor
installs a complete pure actor provider; source setter matrices, physical status
and protection trees, arbitrary timeline-retired child ownership and complete
pose composition need their own work. Finite random-descendant observations are
advancement checks, never equality to independently random original captures.

Status, infection and protection retain their existing age/jump/attachment
policies and source-backed tests. Extending an actor's lifetime does not prove
every such class's detached runtime behavior. This actor capture did not measure
those families. Their lazy providers and separate descendant ownership remain
explicit limits. The existing shield-hit 16, turret-film 25 and forcefield jump
rules were not changed to fit Wiggle/rotor evidence.

The browser control executes actual reconstruction departure/cache/revisit with
controlled scalars, then explicit actor/mount removals. Its retained pose gallery
and contact grid verify the reconstruction consumers. Original captures executed
original `_‑G0` with a glue cache record, not ordinary travel/departure; neither
control establishes ordinary public-input reachability or global original event,
RNG, Adobe, pixel/audio or full-game parity. Source/public proof boundaries remain
those in the original qualification and fidelity ledger.

## Regression evidence

`tests/actor-artwork-lifetime.test.ts` initially fails all six cases on 88a98ef
(0 pass/6 fail/12 assertions). It covers actual cache absence/revisit, direct
removal and dead flags, duplicate-UID object identity, directly removed stopped
rotor/independent child, raw-array replacement, repeated attachment/registration,
before/inside-ENTER births, retained replacement avatars and no gameplay clock,
RNG or UID work. Extended negative-Y windows through ENTER 550 match both frozen
original runs for the two construction cohorts. The original runs' differing
bubble frames are never fitted. The former direct-detach freeze assertion in
`actor-parents.test.ts` is replaced with its source-qualified expectation; all
other behavioral/error assertions remain intact. Fixture edits explicitly supply
previously omitted construction ownership.

Original captures and parent-owned verifier outputs are read-only inputs; no
writing verifier is executed against either.


## Final local validation

- `bun run format` completes before each final input snapshot.
- Supplied-file `bun run check` passes **1,291 tests /75,956 assertions** on the
  combined source including both picked dependencies. The six actor regressions
  pass44 assertions, including both ENTER550 window sequences.
- Literal affected `bun run test:e2e` passes **62/62 cases**, zero skips/flakes,
  on production build `VSO8Y1UZcJFIv4mx0VHwY`. Its26 private spec copies change
  only3101/3102→4215/4216 and relative import routing, retaining every assertion.
  This covers cache/crossing, actor ownership/rendering/behavior, tank/mounted
  art, all animated body/part references, status/contact/protection, retained
  weapon/Healer lifecycles and recovery, upgrades/screens/win and progression.
- Both unchanged seed17 accelerated pilots win: mock65,976 frames, input digest
 3425647555; SWF64,639 frames, input digest2562933773. Controls, frame caps,
  timeouts, providers and assertions remain intact. These are reconstruction
  pilots with the existing upgrade adapter, not original ordinary-input proof.
- After picking the independent orbital fixture repair, the only changed input
  from that broad run is `tools/fixtures/orbital-width.ts`. A fresh literal
  `bun run test:e2e` rebuilds production as `OAkNWlFodnb1OZkC9AOYP` and passes
  **6/6 actor/orbital/contact mock/SWF cases**, zero skips/flakes, including the
  full four requested orbital/contact controls. The final supplied-file check
  above follows this build, avoiding concurrent Next type-generation deletion.
- All832 final recorded build/test inputs match their post-formatter hashes.
  All175 frozen repository evidence inputs and98 read-only external inputs
  (both supplied capture trees and the original SWF) remain byte-identical.
  Source raw captures, tools, fixtures and original RNG/builtins are not rewritten.
- Both actor galleries were inspected; the final native gallery shows current
  cache/revisit/removal/reattachment paint. Root frames are1/3/4/8/48/49, the
  stopped rotor remains1, and its same retained child ages1/150/200/400/440/441.
  Native revisit contact differs from the fresh pose at119 sampled points.
- Owned4215/4216 were checked free before starting and after shutdown. All26
  recorded owned process fingerprints have no live survivors. `.next` resolves
  strictly inside this checkout. Parent4195/4196 and effect3955/3956 are untouched.

Exact commands (with the supplied `BT3_SWF_FILE` environment variable set to the
original path recorded above):

```sh
bun run format
bun run check
bun run test:e2e --config=test-results/actor-clock-implementation/playwright.config.ts
bun run test:e2e --config=test-results/actor-clock-implementation/playwright.config.ts actor-artwork.spec.ts orbital-width.spec.ts shape-contact.spec.ts
bun run check
```

Ignored evidence is under `test-results/actor-clock-implementation/`: initial
`fail-before.log`, final `actor-regressions.log` and `final-check.log`,
`broad-e2e.log`/`broad-browser-report.json`, `final-e2e.log`/
`final-browser-report.json`, preserved `broad-browser-results/`,
`final-browser-results/`, input manifests and `final-integrity.json`. The earlier
exploratory run was intentionally interrupted to correct the remaining inactive
actor host assumption; its log/report are retained separately.

The generic code/test/tool patch ID matches3336159 exactly:
`3c74a0126df674306fe89c43993e71ca41fca69c`. The orbital fixture patch ID likewise
matches5c5919: `1df6db026fc349b6fdf86e1c67244f0a86353b27`. Pick only the actor
commit onto a parent already containing those dependencies. Protected master
897d2e741b8a1d23f563f8bb8a2e6bd684932b9b and legacy
22d9def7321bada8a2148a69a79a3392682bb390 are unchanged. No push, PR, linking, watch,
merge, deploy, provider, auth or billing action is performed. Parent owns the
final combined exact-head gate and single master merge.
