# Finite original under-avatar paint and native consumer

This slice starts at `58bd67415b97ef5cc630f0471b78ad0ef234f0de`. It adds the
previously absent supplied-art1551 depth10/12 painter. It does not correct the
renderer's complete cross-field stack, supply a complete field query, or close
full-game fidelity. [The earlier audit](under-avatar-render-audit.md) describes
the missing branch at its historical checkpoint.

## Original paint qualification

`under-avatar-paint-probe.py` constructs the original `Bubblefield` under an
original `Main`-derived document. It retains original1542/1541 and1544/1543,
including the authored mask range, scale0.9924774169921875 and translation
−1/−1twip. The eight original children remain in their original order. Other
painted slots are hidden only for isolation. The observed under/mask parents
are the actual1551 object, at child indexes4/3.

**All control position, visibility and rotation writes are glue.** This probe
does not invoke World movement, private `_‑Xa`, AvatarInterface `_‑DF`,
World.Run, arrival, or ENTER_FRAME scheduling. Actual original constructors and
Flash `BitmapData.draw/getPixel32` execute. Width/height and World source-method
qualification remain the separate [sizing](under-avatar-sizing-reference.md)
and [World-layer](world-layer-original-reference.md) evidence. No source method,
ABC, RNG function, timer, frame script or existing symbol binding is replaced.

There are36 controls: six placements `(0,0),(400,0),(425,0),(475,0),(-425,0),
(425,30)`, rotations0/180, and masked/hidden/bare modes. Each reads45 pixels:
X `[-45,-20,0,20,45]` × Y `[-30,-4,-3,-1,0,1,3,4,30]` relative to the under
instance. The bare draw bypasses the parent mask; the hidden control removes
under paint while retaining the mask. No hitTestPoint oracle is used.

Both fresh captures agree exactly on1,620 original uint colour values each.
Inside is blank; edge/outside controls contain opaque `0xffbbd9f2`. Hidden
controls stay blank; bare controls retain the artwork. The narrow slit produces
rotation-dependent absence: at `(475,0)`, relative Y−4 is painted at0° and blank
at180°; the left-side counterpart changes near Y+3. This rejects an ideal circular
mask. The earlier coarse-grid exploratory capture is retained separately and is
not the frozen fixture.

The candidate fixture independently reads these frozen original observations.
Across the540 masked samples, alpha-channel Pixi masking and the production
GameRenderer preserve finite presence/clipping and fill colour. Default red
masking is a rejecting control: Shape1541's RGB is `#66cc00`, so red masking
reduces an original opaque center to alpha102. Production uses
`under.setMask({mask, channel:'alpha'})` on the runtime-supplied mask texture.
Candidate assertions permit alpha≤32 for absence, alpha≥240 for presence and
fill RGB within3; these are finite classification tolerances, not pixel equality.
White stroke/curve antialiasing, arbitrary size/zoom/orientation, filters and
fractional-opacity composition are not qualified by these sparse controls.

## Preservation and evidence identities

Supplied original:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`,
SHA256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
It has an expanded body under a CWS signature. Emission calls the existing
qualified `decompressSWF` normalization; it does not blindly inflate that body.
Final probe SHA256:
`8766c6ac3f4113e348189520c065a7104e3348c74094fc7e4709f348bfe016be`.
Emitter SHA256:
`350963dbd9de6f71caa9a681d08502bdc47132337fbef0dc61367f98f585596b`.

The independent parser checks all3022 original tag headers/payloads/order, both
original ABC payloads, movie header/trailer and every non-document binding.
The3023-tag probe changes only document CID0 and adds one glue ABC. Re-emission
is byte-identical. `tests/fixtures/under-avatar-paint-original.json` pins four
qualified pcode hashes, probe/emitter identity, numeric pixels and runtime bytes.
No original artwork, SWF, vector paths, raw captures or build output is committed.

Fresh final REA Evidence:
`ev_c80a2d5def7406d370191b1ae3a5cd5ddb8b178dc8b2c509063f53553b7ac275`.
Fresh repeat:
`ev_e970cf488bb30f6f74e9eaf91981ab6ab13c4135cea0bcf81acb00edbab49372`.
Independent REA DOM equals the collector's complete durable paint trace in both.
All declared actions complete with no page/AVM errors. REA reports missing event
coverage and `equality_eligible=false`; complete action execution does not remove
that limitation. Retired-service CSP diagnostics remain visible.

Actual loaded Debugger/getScriptSource identities in both captures match installed
bytes, independently of the requested Ruffle version:

| Module               |    Bytes | SHA256                                                             |
| -------------------- | -------: | ------------------------------------------------------------------ |
| WASM                 | 14302754 | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loader (`ruffle.js`) |   465885 | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Core                 |   108322 | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Viewer               |     3579 | `34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5` |

Chrome is157.0.8103.38; viewer runtime reports Ruffle0.7.1/wgpu-webgl. Loaded
byte identity is not an identified compiled source revision or complete execution
coverage. Debugger attachment can perturb performance. Ruffle/BitmapData results
are not Adobe, complete stage pixels, audio, event/RNG or ordinary-play equality.

Eight fresh-copy mutations are rejected: missing row, pixel forged consistently
in raw trace/collector/REA DOM, rotation, forged runtime comparison metadata,
original ABC, non-document binding, glue and AVM error. Verification never imports
the candidate renderer, simulation, or generated candidate observations. Frozen
original values reject a consistent forged trace even when all DOM digests agree.

## Implemented native branch and retained ownership

Asset loading visits original1542 and1544 and rasterizes their leaves from the
player-supplied SWF. `FieldUnderAvatarView` validates each one-leaf identity
placement and uses original1541/1543 textures. There is no invented mask circle,
halo, imported vector path or reconstructed avatar/map/transit position.

A view belongs to the actual `Field` object and retains the root, mask-slot and
under-slot instance IDs. Root placement uses `fieldTransform(world,field)`;
children use their respective retained slot matrices. Source root collapse,
mask0/180, child sizing and independent positions therefore survive. Unresolved
under sizing is rejected rather than silently painting an authored-scale guess.
Detached views remain retained and hidden; rooted orphan views keep their own
poses. Disposal occurs with the renderer.

The branch is between the existing lower-effect group and pickup/actor groups.
Its mask targets only the under container. Pickups/actors remain outside it.
Existing global groups still flatten cross-field ordering, so this is not a
complete original World display-list composition. Mock mode deliberately retains
its prior omission of under-avatar paint; no new procedural approximation is
introduced or described as native art.

The production fixture compares the same finite masked controls, repeated reads,
instance stability, orphan/detach/reattach and a51-write retained collapse matrix.
Raw player/map scalar changes cannot move the branch. A captured fail-before run
uses the prepared GameRenderer without this branch and rejects missing paint;
restoring the implementation passes. It does not simulate a full original
lifecycle or prove every retained field population. Adjacent collapse/effect
fixtures now read actual effect owners instead of obsolete root-child indexes;
their assertions, skips and timeout controls are unchanged.

## Reproduction and private artifact manifest

All writes below must target a new caller-owned capture directory. Verifiers
write derived proof there; never run them on read-only research/prior captures.
Verify4455/10455/4456 are free before use. Only owned process fingerprints may
be stopped; reference browsers must use fresh profiles for final and repeat.

```sh
python3 tools/reference/under-avatar-paint-probe.py ORIGINAL.swf PROBE.swf > EMISSION.json
BT3_REFERENCE_PORT=4455 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=10455 BT3_REFERENCE_URL=http://127.0.0.1:4455 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:10455 BT3_REFERENCE_URL=http://127.0.0.1:4455 BT3_PROBE_OUT=CAPTURE node tools/reference/under-avatar-paint-observe.ts
node tools/reference/under-avatar-paint-scenario.mjs OWNED_TARGET_ID > SCENARIO_INPUT.json
```

Use connected REA discovery on owned10455, then execute that declared scenario
through REA `capture_browser_scenario`; save its complete Evidence as
`CAPTURE/scenario.json`. After observer completion:

```sh
node tools/reference/under-avatar-paint-verify.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE
node tools/reference/under-avatar-paint-reject.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE REPORT.json
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/under-avatar-paint/playwright.config.mts
```

The optional fifth verifier argument creates a **new** frozen numeric fixture
with exclusive creation; ordinary verification never overwrites it. The local
E2E config uses only the owned4456 fixture server and unchanged private spec
copies with URL/import routing edits. It builds this checkout's own `.next`;
no parent's server, browser, `.next`, PR or CI state is inspected or modified.
The known parent accelerator timeout is outside this slice and is not rerun.

Private artifacts are under `test-results/under-avatar-paint/`: `probe-final.swf`,
`emission-final.json`, `final/`, `repeat/`, earlier `first/`, rejected-mutation
report, process fingerprints, fail-before/pass-after logs and numeric candidate
proofs, original/edited spec hashes, build/check/format logs, final E2E report,
and final artifact/cleanup manifests. These ignored files stay local for parent
review after the current batch gate. Held origin/master and legacy refs remain
at the user-supplied checkpoints; there is no push, PR, merge or deployment.

## Scoped validation and resource closure

`bun run format`, TypeScript and `bun run check` pass:1,291 tests /
75,956 assertions, zero failures. The literal affected E2E command above builds
`U6mJDeH50WhzwdEzkcaBR` and passes17/17, with zero skips/retries/page errors.
It includes mock/native actor ownership, crossing populations and retained
replaced-next wrappers, collapse, effect ownership, combat effects, pickup
ownership, screen effects and the new native finite paint fixture. The initial
adjacent run's three obsolete-index fixture failures remain recorded, alongside
the repair and successful full affected rerun; no assertion or clock is changed.

Owned reference launchers and all owned4455/10455/4456 resources are stopped.
`cleanup.json` records free ports and exited recorded PIDs/startticks. The final
capture's Chrome root `/proc` snapshot was not separately retained before exit;
its owned launcher session, exact CDP target, runtime bytes and termination result
are retained. The repeat Chrome root and all server processes have `/proc`
fingerprints. No process ownership is inferred from a reused PID alone.
