# Damage-beam wrapper geometry: bounded original controls

This research starts at `9ccf27d` and reads the fourth-layer audit in
`/home/ian/.t3/worktrees/open-bubble-tank/t3-e0cc93d8/docs/beam-contracts-reference.md`
without modifying or importing that checkout. It contains no production repair.
The parent decides whether these findings justify a fifth layer.

The ordinary beam's **bullet layer is a sibling of the field**, so its resized
children do not directly contribute to that field's width or shape query. However,
the existing radius425 / diameter850 adapter is not generally equivalent to the
original wrapper query. A controlled original-code boundary-phase comparison
already separates them, and separate synthetic controls expose actor geometry and
the dynamic loop ceiling. These are finite Ruffle observations, not ordinary
progression, Adobe execution, or full-game parity.

## Qualified source and authored topology

Paths here are relative to
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/`.

- `BTAGameWorld.pcode:1462–1480` constructs `Bubblefield` and adds it to the world.
  The same function's `ofs00ef` calls private `_‑Ii`, stores `_‑00`, and
  `ofs00a7` passes it to `currentBFTarget._‑54` (lines1543–1549,1579–1584).
- `_‑Ii` at lines7573–7625 constructs package-qualified `_‑dl`, copies the
  current field's x/y, calls the world's unqualified `addChild`, and returns it.
  Control flow is `ofs0030 → ofs0023 → ofs0018 → ofs0010`. It never adds this
  container to `currentBFTarget`. First-field AS400–420 agrees. The later-field
  caller also creates `_‑Hm` through `_‑Ii`; this probe covers first-field geometry.
- `_‑0D._‑54` stores the supplied clip in `_‑CH`. `SpawnNewBullet` adds the shot
  to `_‑CH` before passing **the field receiver** as Setup parameter6. Qualified
  `_‑BL.Setup` `ofs0074`, lines2175–2180, assigns local6 to public `_‑W`.
  Thus the projectile's actual parent and its `_‑W` are different objects.
- `_‑14/_‑CO.pcode` `ofs03cc` reads `_‑W.width` for each loop test;
  `ofs00fc → ofs00ec → ofs00df → ofs00bb` writes line width, mask width `n+4`,
  end-cap x, then invokes `_‑W.hitTestPoint(globalX,globalY,true)`. A false result
  subtracts5 from both widths and moves the cap to the line getter. The six-pixel
  grid follows the one-time int conversion of candidate MIN. No method is patched
  to obtain intermediate samples; the inferred miss sample below uses this source
  order and the observed final line getter.
- Original symbol1551 is `Bubblefield`; `_‑dl` is symbol1781, an empty one-frame
  container. The field has authored background1537, effect mask1539, exterior
  mask1542 at scale0.9924774169921875 and translation(-1,-1), masked avatar-under
  layer1544, life layer1545, enemy layer1547 and detail1550. Its bounds therefore
  include authored geometry beyond the visible background. Shape1541's bounds are
  ±13919 twips. Background shape1536 has bounds±8505 twips and a60-twip stroke.
  These numeric facts were re-extracted from the actual input with the existing
  `extractSymbols(...,{svg:false})`; no extracted media is committed.

The real catalog caller is `_‑HJ._‑7G[11]`, Aggressor, `A10000049`. The original
TankData import and `_‑Tr(1,world)` construct its avatar root; mount `29_mc` has
`intObjID=2017`. Original `ABeamCannon.PartCallTrigger` constructs and canonically
spawns `_‑14::_‑CO`, bound to symbol1992. The resulting muzzle pose is
`(56.8,0.05)`. This identifies an actual avatar recipe rather than an enemy-table
surrogate. It does not establish that this recipe was earned in ordinary play.

## Controlled observations

The probe constructs original world/field/layer objects and reproduces source
parentage. It does not invoke complete `BTAGameWorld.Setup` or Run. F8 runs the
entire matrix synchronously, then restores sibling ownership, calls original
StopFiring and detaches the probe world. The normal Main still loads; its original
methods, RNG and frame scripts remain intact. Sound timers are held at0 to avoid
unrelated sound setup. The original mask rotation180 is copied from first-field
setup; the tutorial, other world layers, regular actors and complete update loop
are absent. All tests use field scale1, world translation(275,225), and requested
poses on the canonically constructed beam. Sweep x/y are read back from the beam,
not merely echoed from requested values.

Seven horizontal resize controls request line lengths0,120,420,426,600,900,1500,
with mask `n+4` and cap x `n`, in original order:

| Parentage / requested endpoint  | Field width | Field shape hit | Background shape hit | Beam's own shape hit |
| ------------------------------- | ----------: | --------------- | -------------------- | -------------------- |
| Source sibling,0/120/420        |      1381.4 | true            | true                 | true                 |
| Source sibling,426/600/900/1500 |      1381.4 | false           | false                | true                 |
| Deliberately nested layer,420   |     2195.75 | true            | true                 | true                 |
| Deliberately nested layer,600   |     2195.75 | true            | false                | true                 |
| Deliberately nested layer,900   |     2195.75 | false           | false                | true                 |
| Deliberately nested layer,1500  |     2207.85 | false           | false                | true                 |

The nested case is a **negative topology control**, not a source correction.
It also cautions against replacing container shape testing with an unconditional
OR of arbitrary child hit results: the900/1500 observations differ. No general
mask/cache/container explanation is inferred from these rows.

At both resized lengths120 and900, horizontal field/background queries at requested
field-local x424.9,425,425.05,425.2,425.25 return true;425.3 and425.5 return false.
These are finite Point-conversion and shape queries, not an exact analytic circle
fit, all-angle stroke proof, or a claim about Adobe boundary inclusion.

Original `TestForCollision` then gives these final `(line width, mask width, cap x)`:

| Controlled pose / population                         | Original result | Comparison scope                                                      |
| ---------------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| Empty field,origin0/0,angles0/90/180/270/45          | 421/425/421     | Radius425 adapter agrees on these five grids                          |
| Empty field,origin400/0,angle0                       | 25/29/25        | Agrees on this grid                                                   |
| Empty field,origin−400/0,angle0                      | 823/827/823     | Agrees on this grid                                                   |
| Empty field,origin0/400,angle90                      | 25/29/25        | Agrees on this grid                                                   |
| Empty field,origin5.2/0,angle0                       | 421/425/421     | Radius425 adapter predicts415/419/415                                 |
| Display-only Basic root at430/0,raw candidates empty | 445/449/445     | Other field artwork can extend the query                              |
| Same root moved to1000/0 and made sole raw candidate | 972/976/972     | Dynamic field width1710 permits sample977; fixed850 loop cap skips it |
| Root removed and candidates cleared                  | 421/425/421     | Baseline restored                                                     |

The phase comparison is an empty-candidate test: radius425 first misses sample420
at field x425.2, whereas the original accepts it and later finishes at line421.
The separate verifier computes the adapter result without importing production
beam helpers. This rejects blanket equivalence for the tested emulator bytes.

Both Basic-root cases use actual `_‑HJ._‑7G[0]`, `A10000063`, constructed as an
avatar-class `_‑Zx`, attached to the authored enemy layer. They deliberately vary
raw-array membership and place the root outside the background. They isolate
geometry/ceiling behavior; they are not an ordinary EnemyAI encounter or proof of
that pose/population's reachability. The distant control's field width grows from
1381.4 to1710; the terminal sample977 is source-derived from972+5, not an injected
trace inside `_‑L2`. Shape extension and the loop ceiling must remain distinct.

## Preservation, environment and evidence

`tools/reference/beam-wrapper-probe.py` appends one project-authored DoABC and
changes only the CID0 document binding to `BT3BeamWrapperProbe`. It refuses an
output path resolving to its input. Independent `beam-wrapper-verify.mjs` uses
`src/game/assets/swf.mjs`, not the emitter's parser/hashes: all3022 original tag
occurrences and their payload order, both original ABC payloads, movie-header
payload, and every non-document binding are preserved; the output has3023 tags.
It verifies43 ordered beam trace rows against a separately retained REA DOM,
loaded probe response bytes, and loaded viewer/Ruffle module identities. A second
emission is byte-identical. Negative controls for a missing row, changed module
identity and changed original payload are all rejected.

| Artifact                                  |    Bytes | SHA-256                                                            |
| ----------------------------------------- | -------: | ------------------------------------------------------------------ |
| Original expanded-CWS input               |  6399497 | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Final probe                               |  6404852 | `cff34e6c2edf6913e214952fb7a17ef8b6ef90a27c0705bcc42b12dd9c1a8f69` |
| Added ABC bytes, excluding DoABC envelope |     5311 | `ef804ac54474f6438f3713049b571a70e816d51e4782a7ee650f079aeb5137a1` |
| Original ABC tag payload0                 |     9311 | `130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` |
| Original ABC tag payload1                 |  1000022 | `d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596` |
| Viewer `/reference.js`                    |     3553 | `967cffbcce1ffbf1d07001b27827f4f9107b73517a684e56ba88e58827efa164` |
| Ruffle loader                             |   465885 | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Ruffle core JS                            |   108322 | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Ruffle WASM                               | 14302754 | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |

All three Ruffle modules were observed through post-DONE CDP Debugger bytes and
matched installed files. The viewer module's CDP scriptSource matches its captured
HTTP response. This identifies loaded bytes, not a proven source/build revision or
complete execution coverage. No tagged Ruffle source is treated as shipped
execution evidence. Debugger attachment can perturb performance.

Environment: Linux7.2.15 x86_64/glibc2.35, Bun1.3.9, Node26.11.1, Python3.10.12;
Chrome157.0.8103.38/V8 15.7.112.23, headless SwiftShader,
`--js-flags=--stack-size=4096`, Ruffle0.7.1 `wgpu-webgl`. The owned browser starts
at1100×1000; REA connect scenario applies its recorded1280×720, DPR1, en-US/UTC,
light/reduced-motion/block-service-workers environment with the connect-mode
limitations retained. Browser executable SHA-256 is
`fa67e06a5bcd0525739996fb8e3ecff449039e6165c15ea7968d3935e59e829e`.
Original retired-service requests are blocked by viewer CSP/network policy; their
console failures remain recorded. There are no page errors or AVM Error# failures.

Final REA scenario:
`ev_1f01c93f087a748d6f48db8578f58e8310cf14dfc1327ec675557677296abd5e`.
All declared load/ready/settle/focus/F8/end steps complete. REA still reports
**incomplete**, `equality_eligible=false`, missing `events`; the DOM trace is
retained and independently matches the collector. Do not promote this to a
complete scenario recording or a timing/RNG/event-phase proof.

All raw traces, module/HTTP observations, scenario records, source identities,
process identities, mutation results and reemission remain ignored under
`reference-captures/beam-wrapper-runtime/`. Attempts are retained: initial emitter
failure on a negative short; two shared-preview connection-refused failures;
first successful sibling matrix; a wider-literal edge attempt whose pushshort
sign-extension made requested425.xx become−230.xx; and its corrected continuation.
The erroneous edge attempt is not positive boundary evidence. The final emitter
constructs larger literals arithmetically. An early final-verifier invocation
before the observer wrote its file failed ENOENT; after collector completion the
unchanged verification passed.

## Reproduction and remaining objections

```sh
python3 tools/reference/beam-wrapper-probe.py ORIGINAL.swf /tmp/beam-wrapper.swf
BT3_REFERENCE_PORT=3305 BT3_SWF_FILE=/tmp/beam-wrapper.swf bun run reference
BT3_REFERENCE_CDP_PORT=9305 BT3_REFERENCE_URL=http://127.0.0.1:3305 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9305 BT3_PROBE_OUT=/tmp/beam-capture node tools/reference/beam-wrapper-observe.ts
```

Arm the collector before navigation. Discover only the owned9305 page with REA
`list_browser_targets`, then `capture_browser_scenario` in connect mode against
that target and start URL `http://127.0.0.1:3305/`. Declare: click `#configured`;
wait for visible `#status[data-ready=true]`; settle2000ms; click `ruffle-player`;
press F8 on it; wait1000ms; retain final DOM/URL and console/page-error events.
The exact final input is retained locally in `scenario-input.json`. Save the
canonical REA Evidence record as `CAPTURE_DIR/scenario.json`; await the observer's
fresh completion and module inventory before verifying:

```sh
node tools/reference/beam-wrapper-verify.mjs ORIGINAL.swf /tmp/beam-wrapper.swf /tmp/beam-capture
bun run format
bun run check
```

Formatting, TypeScript and978 tests /8737 assertions pass. No production rule or
browser flow changes, build, full production E2E, hosted check or parity claim is
part of this research. The temporary dependency link points to the existing main
checkout install; nothing was installed or upgraded.

Owned resources use only3305/9305. Recorded server PIDs were2624070,2637730,
2641301 and2651181; owned Chrome root2625914 was controlled by launcher2625885.
The final manifest records exact PID/start stat/executable/command/cwd before
signals. F8 and mouse buttons were released, the owned page and both failed
preview tabs closed, launcher/server stopped, and both ports verified free.
No parent process/server, protected master/legacy ref, original input or sibling research
repository was modified. No push, PR, merge, deployment or settings change occurred.

Remaining objections: scaled/newly attached fields, camera zoom and arbitrary
matrices; mask/visibility/cache/stroke edge semantics across the display tree;
negative-MIN setter behavior; all angles and twip/grid phases; naturally reachable
outside artwork and distant candidates; complete tutorial/pickup/status/effect
populations; original input/event/constructor/RNG scheduling; ordinary playthrough
and Adobe observations. The finite controls justify rejecting a universal circular
adapter claim, not substituting425.25 or changing production geometry by inference.

## Key source identities

| Qualified pcode relative to `re/bt3`          | SHA-256                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `export_pcode/scripts/_-14/_-CO.pcode`        | `3f0cd062cedc74c521d0a00daff658963441f4eeda24ac180c177ac18c77593f` |
| `export_pcode/scripts/BTAGameWorld.pcode`     | `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b` |
| `export_pcode/scripts/_-0D.pcode`             | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
| `export_pcode/scripts/_-BL.pcode`             | `3b365d3e31350a90d69f814b9692c88af83e600ae957e3bea3645c69114fb64f` |
| `export_pcode/scripts/_-ct/ABeamCannon.pcode` | `973aae522d4b758abce1423f20423d76df368c5cb5a55b28e9f5c63602291f11` |
