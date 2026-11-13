# Effect registration position writes

This correction is local above the fixed combined PR154 head. It changes only
World's registration-time X/Y writes, leaving queued Number arguments intact.

## Source boundary

Original `_‑0D.AddEffectToQueue` stores `param2`/`param3` directly in an object as
`xLoc`/`yLoc` (AS976–990; qualified pcode4166–4223). Those values are Numbers,
not DisplayObject properties. Later `_‑2c.CreateEffect` performs optional random
rotation, X, Y, name, resolved-layer addChild and completion-record insertion,
in that order (AS65–83; qualified pcode237–338, branch chain
ofs0072→ofs0069→ofs0060→ofs004f→ofs003f→ofs0023→ofs001b).

The X/Y instructions explicitly set properties on the MovieClip parameter.
The existing signed-twip display setter model therefore applies there, just as
it does to projectile and camera display writes. This is a source/pcode-backed
inference using the already qualified DisplayObject setter boundary, not a new
original-runtime observation of fractional CreateEffect arguments.

| Read-only research input | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-2c.as` | `fc2617bc670779857b6d6f5a338e20abf0539f16d0bb39cf3fae46d423f5c1d4` |
| `export_pcode/scripts/_-2c.pcode` | `0b0fd628b643a30739baa0157072437bf4814008fc27e2cada217a83822409ee` |
| `export_pcode/scripts/_-0D.pcode` | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |

## Regression and scope

The queued public-step regression observes raw arguments13.049/−23.049 at flush,
after the returned clip has been independently edited, then requires the same
clip attached at13/−23. Immediate registration covers the opposite signs and
sub-twip values that truncate to zero. Both new tests fail on the preceding
source and pass with the correction. Existing request identity, layer lookup,
rotation entropy, callback and carrier-clock cases remain unchanged.

This does not qualify generic effect construction clocks, root/child scripts,
retained unparented/removal playback or complete field geometry. The unused
numeric metadata and active preserved-original clock qualification are separate.
Full ordinary gameplay, global constructor/event/RNG, Adobe/pixel/audio and
complete-game parity remain unproved.

## Validation

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/effect-registration/playwright.config.mts
```

Formatting, TypeScript and1,140 rule tests /17,368 assertions pass. Build
`cnC5ZnrgsKzrSI2ZEdSt-` passes all12 affected mock/supplied-art browser cases
(combat effects, actual effect ownership, Main effects/capture, projectile order
and screen ink), with zero skips, failures or flaky results. All804 tracked
prebuild input hashes match after the run. The private spec copies preserve
all assertions and change only fixture port3102→3776 plus the original Main
helper import routing. The first invocation stopped during discovery because
that helper routing was missing; it ran no browser cases. Its log is retained.
The second literal command is the successful run, not a retry of a failed
behavioral assertion.

Mock/supplied combat galleries and supplied actual-parent/reparent paint were
inspected. Owned servers stopped and3775/3776 were independently bind-verified
free. Exact logs, private specs, input hashes, setup failure and JSON report are
retained under ignored `test-results/effect-registration/`. No PR, deployment,
remote branch or protected checkpoint is changed by this local correction.
