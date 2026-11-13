# Public player-root field query boundary

`fieldPlayerRootHitTestPoint` now selects the explicitly qualified player-root
argument contract independently of receiver ancestry. It maps its argument
through Main, while the field receiver remains under its retained root and the
fixed World centre. `WorldDisplays.mainMatrix` exposes the existing translation
separately; `worldMatrix` composes it with the unchanged275/225 origin. Main
effects continue to own their existing twip-quantized position. No Main scale or
rotation is invented for the game owner.

This is intentionally distinct from `fieldStageShapeHit`: with Main x=1000 and
a synthetic actor at field(900,0), root argument(1175,225) hits while public
argument(2175,225) misses. The internal stage query instead hits(2175,225).
Main translation never enters the parent-space Script-width calculation. Both
field entry points reject a detached receiver before compiling its geometry.

The [original root-query qualification](root-query-runtime-reference.md) measures
actual Main/root/shared loaderInfo/null loader identities. Two captures freeze36
rows /2592 binary Numbers. Parent-owned copies independently reverify both, and
all23 synchronized-data/byte/runtime mutations reject. The separately frozen
Point mapping comparison matches180 checks exactly. Loaded-root stage semantics
and automatic root identity resolution remain unqualified and are not selected.

## Native contact comparison

The development-only shape-contact fixture now uses the actual supplied1544/1543
vector under the measured own matrices and explicit Main ancestry. It compares
all36 control keys,108 raw/stage/root shape results and72 width/height values
against unchanged frozen original words. Controls include1000px displacement,
fractional Main setters and bounded Main/wrapper affine transforms. This confirms
the lower public traversal with native contact, beyond matching Point arithmetic
alone. It does not execute the loaded-root branch or original World.Run.

The caller still must supply complete actual geometry for every physical field
slot. No gameplay field, beam, spawn or spacing caller has migrated. Text/masks,
actor protection, retained effect lines/poses, complete mock geometry and broad
Engine bounds/contact remain separate work. Public field integration must not
fall back to an internal stage Point merely because old Main0 controls passed.

Validation:

```sh
bun tools/reference/root-query-compare.ts tests/fixtures/root-query-original.json test-results/root-query-review/comparison.json
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/player-root-geometry/playwright.config.mts
```

Formatting/check passes1206 tests /20345 assertions at this production boundary.
The literal E2E builds production and passes10 mock/supplied cases with zero
skips/flaky results: root/mask vector controls, retained stroke/transparent fills,
crossing, Main shake/flash and upgrade capture. Build ID is
`WFYRaapPTFxyHRKmgXWvQ`. Both supplied-art crossing and Main-effect captures were
inspected; owned4035/4036 servers exited and both ports were free.

Ignored `test-results/player-root-geometry/verification.json` retains actual proof
JSON paths/hashes, report and input checks. Of789 initial source fingerprints,
788 remain identical; Prettier overlapped that initial snapshot on only the new
native-root fixture. The initial snapshot is preserved. A fresh current-source
Bun build is byte-identical to the actually served3,853,072-byte fixture bundle,
SHA-256 `f90b01000973bbb79bc8fb9a093bb6d36346261ec747a05fb072c67b4988e951`.
The final372 fixture-source fingerprints remain identical. These facts establish
the tested fixture identity without relabelling the later snapshot as prebuild.
The three private spec copies change only fixture ports/import locations; all
assertions remain. No broad original-event, compiled-source, Adobe, pixel/audio,
ordinary-game or complete-game equality follows.
