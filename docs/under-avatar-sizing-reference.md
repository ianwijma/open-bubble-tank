# Original under-avatar size setters: binary controls

This bounded original-runtime measurement qualifies positive axis-aligned writes
on the original under-avatar clip1544/shape1543. It supplies a numeric oracle for
the retained wrapper resolver; it does not implement the complete field query or
prove rotated/reflected/invalid-size setters, Adobe or full-game equality.

`AvatarInterface._-DF` writes width then height on the retained `_‑0B`, then on
latest-next's under-bubble. The requested Number comes from metadata:
`TankData._-ZD` scans `sqrt(x*x+y*y)+radius` from maximum0; World doubles it and
`_-Q0` adds45. Shield sizing and the catalog's minimum10 radius are separate.

The opt-in `beam-wrapper-probe.py --under-avatar-audit` retains all70 previous
geometry controls and adds29 before/width/height/repeat phase samples across nine
inputs. It reuses the original clip and writes only project-authored control
operations. It includes positive fractional/asymmetric prior scales, a repeated
write, an ancestor scale0.5 and the source radial expression for(13,7,radius10).
The first trace-only capture remains retained. Its decimal `toPrecision` text
can differ from the actual Number word, so parsed decimal coefficients are not
accepted as a binary oracle.

The final control also uses original `ByteArray.writeDouble/readUnsignedInt` to
retain high/low unsigned words for all11 values: request, width/height, cached
Number scaleX/Y and six effective matrix coefficients. Words preserve signed
zero and are exactly representable in JSON. The independent REA DOM agrees with
the collector for every decimal/binary pair. Both original ABCs, every other
original tag payload/order, header and non-document binding are preserved; one
new ABC and only CID0's document binding differ. Original SWF SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Probe SHA256 is
`8e910b3a974d8d68fe9ad77a0c65e2815684cef57086c3140d9e4eec5bda2da1`.

Measured examples:

| Request | Cached Number scale after width/height | Matrix a/d | Width/height getter |
| --- | --- | --- | --- |
| 45 | 0.44554455445544555 | 0.4455445408821106 | 45 |
| 73.1 | 0.7237623762376237 | 0.7237623929977417 | 73.1 |
| 146.25 | 1.448019801980198 | 1.4480197429656982 | 146.2 |
| `2*(sqrt(218)+10)+45` | 0.9359370903016514 | 0.9359371066093445 | 94.5 |

A width write preserves the preceding Y scale until the height write. Repeated
writes do not replace Number getters with float32 matrix values. The ancestor
scale does not enter the child's width/height getter in its own parent space.
The tagged [Ruffle width/height setter source](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object.rs#L1595)
corroborates the zero-rotation branch and retained scales. The tag is mechanism
evidence, not an identified source revision of the loaded compiled runtime.

## Reproduce and verify

```sh
python3 tools/reference/beam-wrapper-probe.py ORIGINAL.swf PROBE.swf --under-avatar-audit > EMISSION.json
BT3_REFERENCE_PORT=3505 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=9505 BT3_REFERENCE_URL=http://127.0.0.1:3505 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9505 BT3_REFERENCE_URL=http://127.0.0.1:3505 BT3_PROBE_OUT=CAPTURE node tools/reference/beam-wrapper-observe.ts
```

Arm before the declared REA configured-load/ready/2000ms-settle/focus/F8/1000ms
scenario. Retain its canonical Evidence as `CAPTURE/scenario.json`. Then:

```sh
node tools/reference/under-avatar-fixture.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE tests/fixtures/under-avatar-original.json
bun run format
node tools/reference/under-avatar-verify.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE
node tools/reference/under-avatar-reject.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE REPORT.json
```

Fixture generation decodes original leaf metadata and preserves measured words;
it does not import a native sizing implementation. Verification compares the
frozen words, probe/leaf/input metadata and actual loaded runtime module digests.
It retains the70 baseline assertions and independent DOM/loaded viewer checks.
Mutations cover missing phases, a binary word changed consistently in collector
and DOM, a changed module identity and an original ABC payload change. Mutation
writes use fresh temporary copies. Verifiers write derived results into CAPTURE;
use only a caller-owned capture directory, never a read-only research capture.

Evidence is `ev_d2df84eb7b6b4364286894b150fb056a3840c38efae71aa046b7b66ca805a079`.
All declared actions complete; REA still reports missing events and
`equality_eligible=false`. Chrome157/Ruffle module identities are retained; there
is no compiled-revision, ordinary encounter or complete event/RNG proof. Owned
3505/9505 processes exited and ports are free. Ignored emissions, both captures,
byte-decoded rows, process identities and results are under
`test-results/under-avatar-sizing/`. Prior default43 and geometry70 emissions
remain byte-identical. Native resolver binding and combined validation follow.

## Native constructor binding

The local integration now binds `resolveUnderAvatarSize` in the World constructor,
before its first captured-reference request. `positiveAxisAlignedSize` implements
only the qualified positive, unrotated branch: requested pixels divided by the
untransformed authored leaf size, retaining the other cached Number scale.
`RetainedTransform` applies source scale setters separately from float32 matrix
coefficients. Width/height getters use integer-twip rectangle transformation.
The repeatable field importer now records selected original shape bounds as well
as sprite placements; no artwork is bundled. The production resolver checks that
1544 still contains exactly identity-placed1543 before using its bounds.

`tests/under-avatar-size.test.ts` compares every one of the29 captured phases,
all11 binary values per phase, directly with frozen original ByteArray words.
It includes asymmetric prior scales, repeated setters and the ancestor-scale
control. Native World coverage separately checks the metadata-derived radial
request and pure repeated reads. Unsupported rotation, skew, reflection or
nonpositive/nonfinite requests return unresolved; an explicitly unresolved
constructor seam remains covered. This does not qualify arbitrary width/height
setters or establish a complete field query.

Joint formatting/typecheck and1,040 unit tests /9,132 assertions pass after
integrating actor rendering, retained wrapper state and the registered engine.
Fresh production build `PJ5UgL86BDxw9hCUwWTF2` and62 combined mock/supplied-art
browser cases pass, with zero skips/flaky results. All678 source digests match.
The private specs preserve every assertion and change only ports/import routing.
Mock/SWF actor ownership galleries and supplied-art nested crossing were inspected;
owned3545/3546 servers stopped. Exact command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/field-wrapper-joint/playwright.config.mts
```

Ignored logs, the browser report, private spec manifest, prebuild hashes and
`validation-summary.json` remain in `test-results/field-wrapper-joint/`. Earlier
individual-tree browser results retain their original scope. These browser cases
check affected rendering/lifecycle integration; the29 binary tests qualify the
sizing values. Retained field geometry is not yet composed into a complete query.
