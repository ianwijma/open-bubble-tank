# Field-owned lower-effect paint masks

Original1551 has mask1539/shape1538 at depth4, clipDepth8, over lower-effect
slot1540 at depth6. Concrete117 is nested under that slot. The mask does not
cover under-avatar paint at12, pickups at16, actors at18 or World top effects.
The former renderer projected every bottom effect into a global unmasked group.
This follow-up adds one retained mask projection per actual field; it does not
replace source ownership with completion contexts or Run-array membership.

## Original paint controls

`lower-effect-paint-probe.py` preserves original ABCs/header/tag order and all
non-document bindings, changes CID0 and adds one separate glue ABC. Genuine
original Main and Bubblefield constructors and BitmapData.draw/getPixel32 execute.
An original1544/1543 disc is reparented into original1540 as a **glue paint target**.
The other field artwork is hidden through glue. Position, visibility and mask
rotation controls are glue, not World.Run/field callbacks or queue draining.

Two fresh browsers agree on36 controls ×45 points =1,620 ARGB values each. They
include both rotations at six positions, masked/hidden/bare controls. At425,0,
16 samples paint under the mask versus41 bare; at475,0 all masked samples are
blank versus41 bare. Hidden targets stay blank. The candidate never generates
the oracle. The captures' independent REA DOM and durable trace agree, loaded
JS/WASM bytes match the installed runtime, and the emitter reproduces the probe
byte-for-byte. All eight rejectors fail as intended: missing row, synchronized
pixel forgery, orientation, runtime, original ABC, binding, glue and AVM error.

Original SWF SHA256: `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Probe SHA256: `87cc20366db93f6a5cd93f8ffe489c896f775e514a2124a5bba23963683b52de`.
REA captures: `ev_77e1c86cd29593e1236ef1d46fac03ee325d65ce3c51b4100cfc1b62462c0f9b`
and `ev_7ad06e742218e5a7ed61f01a4f1078796e8b0aa05463ec12d4f8841edb3a4ae5`.
Exact qualified source and ABC hashes, runtime identities and scope are in the
frozen numeric fixture. Both REA records are incomplete/equality-ineligible for
events. No compiled-source revision, Adobe or global gameplay parity follows.

## Implementation

AssetPack visits1539 and supplies original1538 only from the local SWF.
`FieldLowerEffectsView` validates the identity leaf placement and uses alpha
masking. Mock mode has an explicit procedural423.75px circular substitute.
The mask reads its own retained field/underMask matrix. Content continues using
its separately qualified117→underEffects→field transform; collapse does not
replace those two different transforms with one guessed counter/scale.

`projectEffects` carries the actual owning field alongside the existing clip
identity. `projectLowerEffectMasks` reads actual attached engine layers and field
instances. CombatEffectsView routes each bottom clip into that field's projection,
retains its view through reparenting, and disposes obsolete mask projections only
after moving/pruning effect children. Top/screen effects remain outside the mask.
Reads add no RNG, model mutations or clocks. The two adjacent ownership/collapse
fixtures now inspect actual lower content, with their assertions unchanged.

The browser fixture compares all original paint rows/points. A separate actual
GameRenderer/engine control compares masked paint with a deliberately removed-mask
control, then checks stable identity, reparenting to top, disposal and pure reads.
No-source standalone effect galleries may paint into their explicitly supplied
root; every application-projected bottom effect requires its field mask.

## Reproduction and limits

Use fresh caller-owned capture paths and owned free ports4595/10595/4596.
Never run a writing verifier in earlier evidence or research directories.

```sh
python3 tools/reference/lower-effect-paint-probe.py ORIGINAL.swf PROBE.swf > EMISSION.json
BT3_REFERENCE_PORT=4595 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=10595 BT3_REFERENCE_URL=http://127.0.0.1:4595 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:10595 BT3_REFERENCE_URL=http://127.0.0.1:4595 BT3_PROBE_OUT=CAPTURE node tools/reference/lower-effect-paint-observe.ts
node tools/reference/lower-effect-paint-scenario.mjs OWNED_TARGET_ID
# Execute that declared scenario with connected REA; save full Evidence as CAPTURE/scenario.json.
node tools/reference/lower-effect-paint-verify.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE
node tools/reference/lower-effect-paint-reject.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE REPORT.json
bun run format
bun run check
BT3_SWF_FILE=ORIGINAL.swf bun run test:e2e --config test-results/lower-effect-paint/browser/playwright.config.mts
```

The optional fifth verifier argument freezes a **new** fixture exclusively.
Raw probes/captures/traces/full Evidence, integrity and cleanup records stay local
under `test-results/lower-effect-paint/`; no SWF, image, dependency or build output
is committed. Reference launchers stopped and all28 recorded cohort fingerprints
were absent; ports4595/10595 are free. This is sampled cleanup, not a continuous
process audit.

Opaque finite paint controls qualify this branch. Fractional opacity, arbitrary
affine transforms/filters, complete cross-field group composition, ordinary
encounter reachability, queue draining, World.Run, full pixels/audio/RNG, Adobe
and full-game fidelity remain unproved.

## Separate World-order finding

Qualified BTAGameWorld pcode Setup branch chain `ofs00af→ofs00a5→ofs009b→ofs0091`
calls first field→HUD→PlaceAvatar→_-MF. The _-MF entry at3562 follows
`ofs00d8→ofs00bb→ofs009e→ofs0081→ofs0064→ofs0047→ofs002a→ofs000d`: avatar,
current/next bullets, current/next top effects, current/next highlights, HUD.
AttachNewBubblefield then raises screen through `ofs07db→ofs07cd`. Superseded
next wrappers/layers are not all raised. Replacement PlaceAvatar also uses
`addChildAt(numChildren-5)`, so sorting current/orphan/next fields cannot establish
the complete physical World order or handle conditional UI children. The source
identities are recorded separately in the private audit. This renderer still has
global groups; the present mask repair does **not** claim to close that gap.

## Parent browser gate and resolved failures

Formatting and `bun run check` pass1,299 tests /81,252 assertions. Final literal
affected production E2E passes26/26 mock/native cases, zero skips, on build
`Ix4q5Juf6YjgydCKf8fWp`. All850 saved source/test/tool inputs remain unchanged
afterward; private spec copies differ only in fixture URL/oracle import routing.
The original-paint clipped PNG and actual masked/bare impact PNGs were inspected.
An independent PNG comparison finds no missing opaque native interior pixels.

The first behavioral run remains24/26, with two failures retained separately.
The mock bare control drew the released stencil; it now hides that separate
branch, matching original draw(target). Native screen extraction became blank
after camera/zoom changes when empty native mask projections participated in
rendering. Empty projections now stay out of rendering; the unchanged screen
pixel-equality assertions pass. This establishes the bounded fix, not a specific
GPU-driver cause. The focused four-case rerun and final26-case gate are separate
reports; the initial failure is not relabeled green. The earlier Node JSON-import
setup error started no browser tests and is preserved. No assertions, timeouts,
controls, simulation clocks or entropy policy were weakened.

Playwright-owned fixture resources exited;4595/10595/4596 are free. Private
`verification.json`, raw/final logs, source hashes, spec routing manifest, full
traces, paint PNGs and reference cleanup records remain under the artifact root.
