# Original seeker target and canonical birth phases

This controlled probe corrected an omitted source setter in the first published
PR142 head `945d2ec9f23210ada2691b9bed5193d6aacf9fb5`. It is not an ordinary
encounter, an Adobe comparison or complete projectile parity.

## Preserved input and controlled calls

`tools/reference/projectile-target-probe.py` appends project-authored ABC and
changes only the document binding to `BT3ProjectileTargetProbe`. The independent
`projectile-target-verify.mjs` uses the existing SWF parser to compare every
original tag occurrence, both ABC payloads, nonbinding payloads and movie-header
payload. The original methods, RNG, frame scripts and clocks are not patched.
No original SWF, probe SWF, extracted artwork or capture is committed.

| Input | SHA-256 |
| --- | --- |
| Original `re/bt3/uncompressed.swf`, 6,399,497 bytes | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Final Basic probe, 6,402,161 bytes | `775e234f1943342e39f9d3bd2eff645034f453262ba6e7a563bafdebfbb64516` |
| Added project ABC, 2,638 bytes | `d5f8a091434d9724253d48287540deb37ebbd0a384828006378875269636762b` |

F8 installs original `BTAGameWorld`/`_‑0D` and numeric display containers, constructs
original `_‑Zx` roots and `_‑XV` seekers, and calls original Spawn, Setup,
RotateTowardTarget, SetMovement and Run methods. TankData imports the actual
avatar-default table `_‑HJ._‑7G[0]`; all four logged inputs are `A10000063`.
This is distinct from the enemy-recipe `_‑UH` table used by the earlier exploratory
variant and turret probe. The latter is not an ordinary Basic avatar input.

The glue keeps the original shared sound timer busy at0 and shoot timer0 to
isolate ordering and pose without unrelated sound infrastructure. It manually
removes a display child or mutates a raw array to distinguish actual parentage.
The fractional detail is assigned to data before original actor construction.
This does not run a complete World frame or prove event delivery under load.

## Observed original results

The fresh final trace has eleven ordered samples and four blueprint IDs:

| Original call/phase | Position | `_‑PJ` | Removal entries | Live bullets |
| --- | --- | --- | --- | --- |
| Canonical Spawn with no target | (4,5) | true | 1 | 1 |
| Its first Run | (7,5) | false | 2 | 1 |
| Its second Run | (7,5) | false | 2 | 1 |
| Direct Setup with no target | (4,5) | false | 3 | 1 |
| Direct-Setup object's Run | (4,5) | false | 3 | 1 |
| Target born at90° | (0,0) | true | 3 | 2 |
| Contained target absent from raw array | (0,0), still90° | true | 3 | 2 |
| Detached target still in raw array | (0,0), reacquires0° | true | 3 | 2 |
| Target lost during first Run | (3,0) | false | 4 | 2 |
| Its second Run | (3,0) | false | 4 | 2 |
| Fractional-detail target | (0,0) | true | 4 | 3 |

`_‑0D.SpawnNewBullet:1087–1090` invokes virtual Setup, then writes
`blnMoveTank=true`, then appends. Qualified pcode lines4712–4725 independently
retain that order. `_‑BL`'s setter exposes the `_‑PJ` gate. Therefore a failed
canonical birth can already be queued while enabled. `_‑BL.MoveBullet` checks
the gate at entry and finishes the selected tail after steering disables it.
The repair models that gate separately from the removal queue. The prior
failed-Setup test had isolated the virtual initializer and incorrectly applied
its result to the canonical caller.

The transformed original hit Point is exactly `(374.9,325.05)`, from projectile
origin `(275,225)`. Rotation is `45.04298257221664` degrees. The source-ordered
same source-ordered expression under Bun/JavaScriptCore yields
`45.04298257221663`; Node/V8 yields the original sample. Pose, Point,
queue and identity checks are exact; only the cross-VM trigonometric comparison
allows `1e-12`. No production tolerance or rounding was introduced. Complete
Number/libm equivalence is not established.

## Runtime and capture provenance

Final REA scenario `ev_d791355820e12a418e9903d41420a6a4953ce8bb978e6e49badb4ed8d75fd932`
completed the declared load, ready/settle, focus, F8 and final observation steps.
REA nevertheless marks the overall result `incomplete`, `equality_eligible=false`,
with missing `events`. The retained DOM trace and separate module-byte observation
are bounded evidence; this is not a complete scenario event recording.
Emission evidence is `ev_08a3dfaebfd79da3f4c0d3b3e1ab4ceea99460e81bf811f508dbeedef329a999`.
The raw scenario, trace, screenshot and independent preservation/observation
verification remain ignored under `reference-captures/projectile-target-runtime/`.
The authoritative final trace is `basic/observation-current.json`; its CDP module
inventory is explicitly post-action from the same current realm.

The initial Basic observer incorrectly accepted a retained earlier DONE before
the new navigation. Its `basic/observation.json` remains a failed collector
artifact, not fresh Basic evidence. The observer now requires newly delivered
completion after arming. The actual final REA scenario and a post-action snapshot
supply the Basic trace; the original was not rerun just to replace that artifact.
The initial enemy-table trace and emitter are retained separately.

Shared-preview attempts failed before F8 with `Maximum call stack size exceeded`
and Ruffle `cannot recursively acquire mutex`. After two failures the comparison
used owned Chrome157.0.8103.38 / V8 15.7.112.23, headless SwiftShader with
`--js-flags=--stack-size=4096`, 1100×1000 viewport. These environment changes are
explicit; they do not establish default-browser timing or Adobe behavior.

Passive CDP-observed loaded bytes match installed files:

| Module | Bytes | SHA-256 |
| --- | --- | --- |
| Ruffle loader | 465,885 | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Core JavaScript | 108,322 | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| WebAssembly | 14,302,754 | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |

Loaded-byte identity is not proof that a particular Ruffle source revision was
compiled, nor complete execution coverage. Debugger attachment can perturb
performance. The controlled trace is method/phase evidence, not frame timing,
ordinary progression, complete audio, raster or full-game parity.

## Reproduction and cleanup

```sh
python3 tools/reference/projectile-target-probe.py ORIGINAL.swf /tmp/target-probe.swf
BT3_REFERENCE_PORT=3295 BT3_SWF_FILE=/tmp/target-probe.swf bun run reference
BT3_REFERENCE_CDP_PORT=9295 BT3_REFERENCE_URL=http://127.0.0.1:3295 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9295 BT3_PROBE_OUT=/tmp/target-capture bun tools/reference/projectile-target-observe.ts
# Perform the declared load/ready/focus/F8 scenario in the owned browser.
# Copy the fresh observation to observation-current.json for the verifier.
node tools/reference/projectile-target-verify.mjs ORIGINAL.swf /tmp/target-probe.swf /tmp/target-capture
```

The preserved local manifest records exact process identities. Both shared preview tabs were closed;
only verified owned Chrome/server roots were signalled. Their descendant
identities are gone and ports3295/9295 are free. The recreated game's affected
browser flows require separate repaired-source validation, recorded in the
[target-ownership reference](projectile-target-ownership-reference.md).
