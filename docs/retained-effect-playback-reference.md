# Retained generic effect playback (local continuation)

This implementation starts at local569c406957efe482148a2324c0d72831d762c1ba,
above the corrected comparison paths. Published PR155/head8a0b055 remains fixed.
No remote action, mask traversal or stashed field-query integration is included.

## Authority and representation

The unchanged [original effect qualification](effect-clock-original-reference.md)
is the runtime oracle: two independently parent-reverified captures of21,636
rows/259,632 binary Numbers each, both birth cohorts, all15 catalog roots.
The unchanged numeric metadata imports23 sprite definitions and200 leaf
references from original SWF SHA256
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Every supported lifetime retains the actual root's symbol, SymbolClass name,
qualified class-pcode digest and source digest. Its audited transitive graph
consumes no entropy. An unexpected random frame action rejects explicitly;
no UID-seeded renderer stream or new gameplay random draw is introduced.

`EffectPlayback` constructs a pure numeric `SwfClip` tree with each combat root.
Stage entry advances timelines before Main/World's current-frame completion poll;
frame scripts run in the existing final artwork phase. Before-ENTER births show
1,2,3 at ENTER/EXIT1,2,3. Inside-ENTER births initialize before EXIT1 and hold1
through ENTER/EXIT2, then present2 at3. Root clocks are independent of field queues,
completion records, physical attachment, pause and Main4 skipping World.Run.
Engine-removed roots continue while their Effect, playback handle or numeric root
is retained. Weak clock references and a weak root-to-lifetime association avoid
an expired-object registry. No reads initialize or advance those lifetimes.

`Effect.frame` is now a read of the actual retained root. Compatibility `age`
is telemetry, and mutable compatibility `duration` cannot fake native readiness:
completion uses the source frame count and actual current frame. Registration
never seeks the timeline. Collapse completion now runs through its explicit
source callback while still attached, before engine removal and another shrink.
The shrink controller no longer writes a reconstructed frame every Run.

## Scheduling correction

Existing render children enter in reverse placement order before parent timeline
tag/removal processing. Combined `advance` uses the same entry/script phases as
the split stage API: local scripts run after placement processing, then current
children run scripts in forward render order. The tagged source's
`run_frame_scripts` at2650–2655 explicitly has that latter ordering. An earlier
candidate advanced children with combined ticks, executing child scripts too
early; that was not an adequate general scheduling correction. Two additional
controls reject it: a child Y branch at the same parent-placement boundary reads
the new negative Y (frame1, not51), and replacement/surviving children draw entropy
in forward render order (2/7, not7/2). No source data or entropy provider changes.
Retired timeline descendants receive their final entry before removal, then cease
advancing; retaining a descendant does not make it an independently running root.
No unconditional removal reset or all-descendants-keep-running rule is used.
The script phase reapplies placements only when a script changes the frame;
existing entry already applied unchanged placements. A numeric pending-script
summary skips script-free subtrees; newly pending descendants propagate readiness
through stopped ancestors. Stopped/single-frame parents reuse their unchanged
tags while descendants continue entering independently. Parent placement changes
still update a stopped child's own placement. Reverse traversal allocates no
reversed arrays and surviving already-entered children are not advanced twice.

This isolates the [corrected comparison diagnosis](effect-clock-correspondence-reference.md).
The supporting tagged MovieClip v0.7.1 source copy has SHA256
`fc229d96ab6fced20391cf810d9d89a2118803cb7f5ce48ddf6967e52e35700a`;
its reverse render-list recursion precedes `run_frame_internal`/queued placement
processing. The tag is source inference, not authentication of the loaded WASM's
compiled revision. The existing2069 frame103 stop action was already imported;
it is unchanged. Its retained14-frame descendant continues while2069 is stopped,
and the parent continues changing2069's own placement across root120→1.

## Requests, caller writes and drawing ownership

A newly constructed native root starts at X/Y0. `World.addCombatEffect` captures
requested Number coordinates independently, then either enqueues that request or
calls the immediate registration seam. `RegisteredEffects.createRequest` applies
optional rotation RNG, signed-twip X/Y writes, then physical addChild/record
insertion. Later clip edits cannot overwrite queued arguments. Direct `create`
remains the explicit physical-child seam for preconfigured fixture instances.
`FieldRuntime.queuedEffectRequests` exposes raw request reads separately from its
compatibility array of actual clips.

All production `addCombatEffect` callers retain their immediate/queued choice:
projectile collision/status/teleport/burst/ripple queueing, immediate rocket
trails/neutralizer and collapse/flash. Scale and rotation edits stay on the root;
registration does not reconstruct a copy. Neutralizer now reads the current
wrapper's retained scaleX before multiplying by3, following EGunNeutralizer.as41–42.
EnemyFlakBullet.as20–23 illustrates a queued damage-burst scale0.5 write; that
projectile class is outside the currently modeled offline projectile roster.
This layer does not invent its missing projectile mechanics. Existing supported
queued root scale writes are retained and covered independently of registration.

Actual rocket movement registers the new trail first, then makes its explicit
line draw against that exact retained child. A registration-phase control sees
empty graphics before the source draw; the earlier candidate's draw-before-create
ordering is rejected by an isolated import-time restoration.

Source rocket drawing calls are in `_‑14/LockOnMissileAvatarBullet.as105–120`,
`_‑14/_‑Kk.as52–72` and `_‑14/_‑To.as`'s trail helper. The constructor's actual
named `line_mc` child is retained separately from root/request `Effect.line`
telemetry. Numeric line commands belong to that child. Changing request metadata,
painting after a gap or encountering a replacement child does not issue a new
source graphics call. Explicit drawing calls invalidate ancestor paint caches
without advancing any frame. This is the supported lineStyle/lineTo subset,
not a complete Flash Graphics implementation or qualification of all callers'
global-to-local endpoint arithmetic. Commands retain the supplied Number
arguments; exact native stroke/cap/twip geometry and drawn-line pixel equality
are not established by the empty-line original clock oracle. In particular, the
existing avatar-rocket prior-point adapter does not yet reproduce all original
`previousTrail_mc` reference/parent reads and Point conversions. This layer
qualifies retained drawing ownership, not that complete caller geometry.

Artificial galleries now explicitly provide their omitted display placement and
authored seek using `setEffectFixturePose`; compatibility age writes alone no
longer move the native timeline. The rocket gallery samples actual EXIT1…25
rather than assuming construction plus24 steps has already presented25. Its
existing visual offset/alpha/lifetime assertions are preserved; the compatibility
`age` proof field is explicitly frame−1 and new `stageAge` assertions require
actual telemetry1,13,25. Its removal control polls the currently presented final
frame directly: entering another stage first would wrap it. Screen ink uses the
same explicit final-frame readiness control. Collapse comparison roots explicitly
call gotoAndStop(1), preserving the gallery's former permanent frame1 override. Queue-position tests read
the raw request scalars and retain their original expected coordinates; separate
assertions verify the actual unregistered root remains at0 and registration
applies its captured values after caller edits.

## Painter and future geometry seam

Native `CombatEffectsView` creates no playback timeline and draws no entropy.
It passes the exact lifetime pose to `SwfSymbolView.updatePose`, which projects
numeric child graphics along with authored placements. Reparenting and same-UID
objects retain the preceding physical identity/order behavior. Mock art remains
an explicitly procedural substitute, using the retained frame and actual owned
line commands. `readEffectPlayback` returns retained source provenance, or an
explicit `unsupported-native`/`legacy-mock` status. Unknown classes and raw manual
native records do not silently gain a complete provider at registration/paint.

Field population exposes this same retained playback handle for real bottom117
members. It remains an input seam, not a complete geometry query. No masks,
Script-width/shape traversal or browser geometry providers change here.

## Frozen-oracle scope and remaining differences

The production owner matches all660 frozen EXIT multi-frame current/historical
retained comparisons in both cohorts, with corrected render paths and no sprite
identity/correspondence differences. It also checks every sampled root frame,
registration/readiness and callback-before-detach boundary through243. Native
parents of retained sprite descendants match, including conversion's retired
four-frame children (4 at20,1 and detached at21, still1 later) and stopped collapse.

The tests compare2,830 available current EXIT child own positions, alpha and all
six matrix fields exactly with frozen binary Numbers, plus349 retained sprite own
poses including cached scaleX/Y and historical placements. There is no numeric
tolerance. Rotation getters are excluded explicitly: the exploratory full12-value
check exposes one-bit degree-conversion differences on some rotated shapes.
Current authored matrices still match exactly. Native Shape wrappers can retain
AS identity while their symbol changes; `SwfClip` leaf placeholders retain numeric
geometry, not that unqualified native wrapper reuse. Historical Shape identity
and own-pose/getter-cache equality, including observed historical alpha
disagreements, are not claimed. Exploratory differences are retained
in ignored diagnostics, rather than relabeled as playback errors or erased.

The399 original getChildAt null holes (397 ENTER/two callbacks) remain unavailable
geometry. No missing wrapper is treated as missing native geometry, and no pose
is manufactured at a hole. Own-pose/correspondence qualification is EXIT only;
root frame/parent/request observations also cover the measured ENTER/callback
phases. No fabricated isPlaying Boolean, arbitrary global event equality,
complete masks/filters/shape queries, global constructor/RNG interleaving,
ordinary earned gameplay, compiled Ruffle revision, Adobe/pixel/audio or full-game
parity follows. The full recreation objective remains open.

## Accelerated browser driver and host jobs

The first candidate combined run passes62/69 cases, retaining five gallery
fixture failures and both pilot timeouts. The corrected/optimized combined run
passes67/69: every non-pilot case passes, while mock reaches56,000 and supplied
art45,000 at the unchanged280-second readiness timeout. These are failing runs,
not completed wins. Their exact source/build/log/report identities are retained.
A separate import-time control restores all ten edited production modules from
actual base569c406 without swapping production files. Both unchanged pilots pass:
mock68,999 frames/input digest922643877 and native67,433/digest3896447944,
in3.1/2.9minutes. Host load alone therefore does not explain the candidate gap.

The accelerated driver previously performed1,000 World steps in one synchronous
JavaScript job. [ECMAScript WeakRef.deref](https://tc39.es/ecma262/multipage/managing-memory.html#sec-weakref.prototype.deref)
keeps dereferenced targets alive until synchronous execution ends;
[ClearKeptObjects](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-clearkeptobjects)
cannot interrupt that execution. Repeatedly visiting expired weak-clock targets
inside a long accelerated job can therefore retain and tick trees that would be
collectible between ordinary viewport callbacks. This is the diagnosed host-job
hypothesis, not an original AVM or guaranteed garbage-collection claim.

Only the browser accelerator's yield cadence changes to50 logical frames per
job. Progress reporting remains every1,000. Source World.step,20ms simulated
steps, seed17, input/upgrade policy, providers,200,000-frame cap,280-second
readiness/300-second case timeout and every assertion/skip remain unchanged.
No gameplay recovery, explicit GC request, removed-root freeze, altered entropy
or expired-root heuristic is introduced. Strongly retained removed roots still
advance exactly as all original-clock regressions require. An intermediate driver-only rerun passes native at67,433 frames with the base
input digest, but mock still times out; a further mock-only run reaches72,000
without finishing inside its unchanged budget. Those failed and passing controls
are retained. Shorter host jobs alone are not claimed to have closed the gate.

The subsequent combined entry/script correction and pending/unchanged-tag caches
are validated together in a fresh full69-case run, including both pilots. There
is no split-build waiver for the final delivered source. Mock wins at68,999 frames
with input digest922643877; native wins at67,433 with3896447944, matching the actual
base controls' complete input fingerprints. These are finite native/mock browser
runs, not original/Adobe gameplay equality or a general determinism guarantee.

## Local validation

Exact commands, fail-before controls, source/build identities, private specs,
reports and process cleanup are recorded under ignored `test-results/retained-effects/`.
The public lifetime control loads the actual preceding production modules through
an import-time preloader: it has18 frozen root-frame differences and ends removed
at4. The implementation has zero differences and ends3. The scheduling regression
fails on preceding production (retired child4 instead of1), then passes. A separate
non-wrap retirement control retains3, rejecting unconditional reset-to1 behavior.
An import-time restoration of parent-first staged scheduling rejects both frozen
conversion cohorts. A bounded replay of the actual preceding effect renderer
rejects the new late-first-paint exact-pose assertion; production files are never
swapped. A150-root/1,000-tick control measures634→415ms with identical final frames
when redundant script-phase placement work is removed. This is a finite host
benchmark, not a global performance or original-event claim.

The85 original fixture/probe/prior evidence inputs and imported metadata are
byte-identical to the local base. Original source/pcode auditing is repeated read-only into an owned
output; no original capture, runtime or oracle is regenerated.

Final commands:

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/retained-effects/release-playwright.config.mts
```

Formatting, TypeScript and **1,209 tests /27,536 assertions** pass. Fresh production
build **GmLvlQCLFKiOxw7V4b81n** passes **all69 affected browser cases** in8.7minutes;
skipped, unexpected and flaky are all zero. One worker uses only owned3955/3956.
The31 private spec copies change only ports and import routing, verified against
the real specs. They cover effects/physical ownership, screen/Main/capture,
collapse/crossing, carriers/protection, projectiles/contact, actors, pickups,
body/part motion, snapshots/glows and both unchanged-budget progression pilots.
All757 prebuild source/tool/test hashes still match after completion. Native
combat, collapse, ink and final win paint were inspected; no pixel-parity claim
is inferred from those finite galleries.

The original source audit matches the frozen sourceAudit exactly. The raw-original
SpriteInfo replay also passes660 comparisons with zero frame/correspondence
differences. Fail-before controls include actual base public lifetime playback,
parent-first entry, premature child scripts, Map-order script draws, pre-registration
rocket drawing and the actual prior renderer's fresh-pose reconstruction. Controls
never swap production files or rewrite original expected words. Earlier setup
errors, behavioral failures, timing failures and their source snapshots remain
separate artifacts; none is reported as a passing run. The final exact source
passes the complete cohort after the corrections and caches above.

Cleanup accounts for1,195 owned process fingerprints: no active survivor, zombie
or manual termination remains. Both3955/3956 bind successfully afterward. Only
those servers and their fingerprinted descendants were owned. The temporary local
dependency link is removed at handoff; no dependency installation, shared/resident
browser/server, signing/provider configuration, remote action or protected-ref
change occurred. No SWF/media/dependency/build/capture artifact is committed.
