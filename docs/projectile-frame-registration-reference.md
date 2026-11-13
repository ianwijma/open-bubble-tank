# Original projectile frame registration: bounded Ruffle probe

The accepted-shot `rng.int(0,359)` adapter remains unchanged. Controlled original
execution supports the inherited `_‑BL` frame callback for all four tested roots,
including enemy seeker `_‑14._‑QM`. This does **not** establish the adapter's
range, phase, placement at the acceptance gate, or exact draw count.

This research starts at prepared parent
`809acfd7aad80aa8e45b638e2dfe59550c8c7f0f`, with its three local follow-ups beyond
frozen PR139 head `c5fb4ed9e1f48887ecd85bf81e62109c6e79e562`.
The parent's later authorized master update to
`12bf09d1c28405a3fb484e8edf8f73f9736cdfad` did not change this checkout or restart
the investigation. No production simulation, rendering, services, RNG adapter,
existing tests, master, or protected legacy branch was changed.

## Static binding and source boundary

Namespace-qualified exported pcode, rather than the decompiler's method labels,
contains these paths:

- `_‑BL.pcode:91–211`: `r` is an uninitialized public Number. The constructor
  enters `ofs00ca`, executes `constructsuper`, then `ofs00ba` registers index0
  using `getproperty QName(PackageInternalNs(""),"frame1")`.
- `_‑14/_‑QM.pcode:38–88`: entry jumps to `ofs0043`, registering index0 with
  `QName(PackageInternalNs("_-14"),"frame1")`; `ofs003b` then calls super.
  The base thus subsequently registers a **different namespace-qualified method**
  for the same frame. These are not a public virtual override of one method.
- `_‑QM.pcode:684–704`: its package-internal frame1 calls `stop()` and returns.
- `_‑BL.pcode:2216–2258`: its default-package-internal frame1 calls Math.random
  once, multiplies by10, calls Math.round, writes public `r`, then gotoAndPlay(r).
  This is one encoded draw per invocation, not a measured invocation count.
- `_‑U7`, `_‑XV`, `_‑Kk`, and AvatarRocket have no additional frame registration
  in their exported constructors. AvatarRocket extends `_‑14._‑Kk`, which extends
  `_‑BL`; `_‑Kk`'s two wobble draws are in Setup, which this probe never calls.

The constructor order and MovieClip registration semantics predict replacement
of `_‑QM`'s stop callback by the base callback. Finite `r` below corroborates actual
base execution. Exclusive callback-table membership and absence of any stop call
were not directly inspected; one-frame roots cannot distinguish playing/stopped
state by their frame number. This conclusion is bounded to these classes, rather
than extrapolated from the earlier Whip audit.

## Observations and finding ledger

The original SymbolClass table and DefineSprite bodies independently identify:

| Constructed class | Own symbol | Root frames | Children observed | `r`: detached / attached / ENTER1 / first EXIT1 | Through ENTER40/EXIT40 |
| --- | --- | --- | --- | --- | --- |
| `_‑U7` | 1721 | 1 | 1 | NaN / NaN / NaN / 6 | 6; root frame1 |
| `_‑14._‑QM` | 1809 | 1 | 4 | NaN / NaN / NaN / 4 | 4; root frame1 |
| `_‑14._‑XV` | 1827 | 1 | 5 | NaN / NaN / NaN / 8 | 8; root frame1 |
| AvatarRocket | 2176 | 1 | 3 | NaN / NaN / NaN / 3 | 3; root frame1 |
| `_‑14._‑Kk` control | no own binding | 40 observed | 1 | NaN / NaN / NaN / 3 | changes to7 at EXIT39, root jumps1→7 |
| `_‑BL` control | 355 | 40 | 1 | NaN / NaN / NaN / 0 | 0; advances through frame40 |

`getQualifiedClassName` confirms each runtime root. Direct `_‑Kk` inherits the base
symbol's 40-frame display in this runtime; it is not the one-frame AvatarRocket
symbol. Independent placement inventory records shell shape1720, seeker shape1808
plus three unbound one-frame sprites1806, friendly seeker five shape1826 placements,
and AvatarRocket three shape1826 placements. Root `r` is distinct from these art
placements and from the recreation's art-path random initialization.

The corrected run records528 samples: all492 expected distinct class/phase/tick
coordinates plus36 additional EXIT samples. Each class has six EXIT1 observations
and two EXIT39 observations. The repeats are retained in both the host trace and
viewer tail, not normalized away. The verifier checks the complete matrix and
ordered repeated deliveries. It does not assume exactly one EXIT per ENTER.

| Question | Finding | Evidence type / limit |
| --- | --- | --- |
| Is `r` initialized synchronously by these constructors/addChild? | Every immediate sample remains NaN. | Observed at explicit call boundaries. |
| Does original base frame1 execute for `_‑QM`? | Finite `r=4` by first EXIT1; base registration follows subclass registration. | Original runtime plus qualified pcode; base is the only `r` writer in the bounded class chain. |
| When does the first visible write happen? | After ENTER1 sample and by first EXIT1 sample, for all six objects. | Event-relative bracket, not absolute wall-clock or Main.Run order. |
| Does `r` visibly change every stage frame? | Four one-frame roots retain their first finite values for40 ENTER ticks. | Same-valued repeated draws/writes remain invisible. |
| Can callbacks execute again on a longer root? | Direct `_‑Kk` changes3→7 at EXIT39 after ENTER39 saw root frame1. | At least a second write; no direct callback/draw counter. |
| Can play state be read? | Getter unavailable; corrected trace prints literal `unavailable`. | No stopped/playing value is inferred for one-frame roots. |
| Can the adapter now be deleted/replaced? | No entropy edit is justified by this bounded probe. | Exact constructor/event/RNG stream, gate and art-path mapping remain unknown. |

The four root observations support at least one original random call apiece from
base frame execution. They do not prove exactly one call over40 ticks. Changing
`int(0,359)` to `int(0,10)` at birth would still move a later frame callback into
a different phase and assume the gate's draw behavior. Removing it would also
ignore observed base random execution. Keep it explicitly provisional until the
parent integrates a source/runtime-backed schedule; this research makes no such fix.

## Probe, preservation and repeatability

`tools/reference/projectile-frame-probe.py` appends project-authored DoABC glue
and binds CID0 to a Main subclass. After original loading, F8 constructs the six
original classes, samples each detached and attached, then listens to normal stage
ENTER_FRAME/EXIT_FRAME. It invokes neither physics Run/Setup nor original frame
methods directly. It does not override Math.random, private RNG, clocks or original
methods. The sample counter belongs only to glue.

`projectile-frame-verify.mjs` uses the **pre-existing** `swf.mjs` and
`swf-symbols.mjs` parsers independently of the emitter. Both failed and corrected
variants verify: original3022 tags become3023; both original DoABC payloads remain
byte-identical and ordered; all3018 nonbinding/non-ABC payloads and movie-header
payload remain identical; every SymbolClass entry/order remains identical except
CID0 Main→BT3ProjectileFrameProbe. One extra DoABC is the only inserted tag. A
second emission of corrected glue is byte-identical. The verifier hashes the raw
input before the existing parser's in-memory expanded-CWS signature normalization.

```sh
python3 tools/reference/projectile-frame-probe.py /path/to/uncompressed.swf /tmp/projectile-probe.swf
BT3_REFERENCE_PORT=3255 bun run reference
BT3_REFERENCE_CDP_PORT=9255 BT3_REFERENCE_URL=http://127.0.0.1:3255 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9255 node tools/reference/projectile-frame-observe.ts
```

After the collector reports armed, select the generated file in the owned viewer,
wait for loading, focus the movie and press F8 once. The collector only observes;
input is a separate, declared manual/Playwright action. Then run:

```sh
node tools/reference/projectile-frame-verify.mjs /path/to/uncompressed.swf /tmp/projectile-probe.swf reference-captures/projectile-frame-runtime /path/to/re/bt3
```

The reference server retains its configured SWF bytes at startup. In this run the
corrected file was selected through the file input, without restarting the server,
browser or page. The selected browser File's SHA256 matches the corrected output;
its blob-loaded movie is distinct from the server's retained failed variant.
Reuse existing Ruffle0.7.1/Chrome dependencies; no installs/upgrades are required.
This checkout temporarily linked the parent's existing node_modules, then removed
that link after validation. The collector was formatted and its equivalent Node
import spelling adjusted after capture to satisfy this repo's tsc; delivered tool
hashes therefore describe final source, not a claimed hash of the earlier collector
process. The Python emitter used for the corrected runtime is unchanged.

## Exact identities and durable evidence

All capture/media/generated outputs remain ignored under
`reference-captures/projectile-frame-runtime/`. `verified-probe.json` contains the
full source/pcode hash inventory, structural proof, every value-change sample,
repeated-exit coordinates and runtime identities. `trace.jsonl`, `observation.json`,
`loaded-input.json`, input scripts/outcomes, screenshots, process fingerprints,
cleanup, REA bundle and validation logs are durable there.

| Artifact | SHA256 |
| --- | --- |
| Original input | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Failed output | `4c7d63428faabca6cbcd1141d3feb2ea236ba346f3717f371eb868acfef4b5b3` |
| Failed emitter | `6959a8af3f30e6ec1ec85762fb71389410383246dd9b61d72ec4e1a190fdb8c9` |
| Corrected/repeated output | `694fde1a4a410cb17aaa0bb0ae987da0dbc0624c4ed103d3c098104bd3e0bc6b` |
| Corrected emitter | `beba631be2b817f16185c113df3a888006cdd4e346dcee48c6f67eb645d922eb` |
| Original ABC tag payload1, 9311bytes | `130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` |
| Original ABC tag payload2, 1000022bytes | `d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596` |
| Corrected appended ABC bytes (without DoABC prefix) | `63013fb179afcfe1c4689c96b2f1069a51ed64e9c33876edeab68fe9c79e1fd6` |
| Corrected full DoABC payload, 2177bytes | `a4a4bc3a45aeeea6e9c429dba93af46fa8b4d32025b376f461feba5687b04378` |
| Loaded Ruffle `ruffle.js`, 465885bytes | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded `core.ruffle.16d61072ac7fdc4d5013.js`, 108322bytes | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Loaded WASM, 14302754bytes | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded reference viewer JS, 3549bytes | `967cffbcce1ffbf1d07001b27827f4f9107b73517a684e56ba88e58827efa164` |

Loaded JS/WASM CDP bytes match installed package bytes; successful local response
body hashes match too. Chrome is157.0.8103.38, revision
`a733b5afbb3ba618844ff8876b89ad1a774b2f18`, V8 `15.7.112.23`, headless Linux,
1100×1000 viewport and SwiftShader. Browser executable hash, complete command lines,
boot identity and process start fingerprints are retained. The reference viewer's
Bun bundle is separately reconciled with its loaded CDP source. These identities
do **not** prove a particular Ruffle source revision built those bytes.

Actual REA Evidence IDs (not names assigned to manual artifacts):

- Owned-target discovery: `ev_59875249d9f73173e0bd4c43f9016bca70180530b9f593c1a82558d20a665d82`.
- Initial incomplete declared scenario: `ev_288d6fa0c54e19bfe319204be0f4308ee0a9979480a1d757c3cca29589c35fea`.
- Passive failed-probe/error inspection: `ev_99fa63a0ad96bf357be0c139597210ff7ea7792f30ee6bafc10b497df45896dd`.
- Passive corrected final tail/accessibility inspection: `ev_54d6928e901e0596e80518dad526a90e9926558c78130aea6accfb63564beb04`.

The REA scenario navigated only the owned local page and clicked Load; readiness
timed out because missing local node_modules caused a Ruffle-script404. Its F8 step
never executed. The failed Bun collector also had a CDP connection timeout. The
same live browser/server were retained, dependencies reused, the missing script
loaded in the same page, and explicitly recorded manual Playwright inputs performed
the two original-SWF runs. Passive REA inspection did not perform those inputs or
recover a full historical frame trace. Its filtered/attach-limited scope remains
explicit. `rea-evidence.json` retains four real records; the complete numbered trace
is the project-authored collector's evidence, not an REA execution-counter claim.

The failed original-code run emitted one U7 detached sample, then glue's unavailable
`MovieClip.isPlaying` read raised ReferenceError1069 on sealed `_‑14._‑QM`. It is
retained as `initial-*`, including emitted source/output and screenshot. It was not
an intentional source failure. Corrected glue prints `unavailable` without reading
that getter. Across both original-code runs the collector reports zero browser
pageerrors and one AVM error, the retained failed-getter error. Retired Playtomic,
Mochibot and CPMStar requests produced CSP/loader diagnostics and were contained by
the unchanged local-only policy/CSP; those diagnostics are not hidden or counted as
successful network access. Raw console records are retained.

## Validation, cleanup and remaining unknowns

Formatting, independent verification of both variants, deterministic corrected
reemission, TypeScript and the unchanged960-test suite pass. The first check caught
only the collector's literal `.ts` import; its loader spelling was corrected without
changing production configuration or tests. No production/browser flow was changed,
so no production build or e2e run was required for this research-only addition.

Only owned Chrome/server processes were signalled, after checking recorded PID/start
identities. The observer completed normally. All13 fingerprinted owned processes
are absent, and connection checks on3255/9255 return refusal. Other named ports,
root.next, browsers and processes were not touched. No SWF/media/build/capture output
is committed. No deployment, PR operation, push, watch or merge was performed.

Exact random draw count, equal-valued writes, callback-table exclusivity, one-frame
play state, rejected/unattached long-term scheduling, Main/world/physics ordering,
other projectile classes and art paths remain unresolved. These controlled
constructor/frame observations do not establish an ordinary gameplay trajectory,
Adobe execution, a complete constructor/event/RNG stream or full-game parity.
