# Shield Turrets: retained references and source read interruption

This follow-up resolves the two objections in the [original caller/source
audit](shield-turret-source-audit.md). It keeps both recovered contracts: cached
attachment assigns the avatar as the primary target, and a rejected projectile
birth returns the newly constructed unparented object. It does not restore the
previously proposed unfinished target across cached attachment.

## Controlled execution of original methods

`tools/reference/turret-target-probe.py` adds one project-authored DoABC tag and
changes the document binding from Main to a subclass of Main. Both original ABC
payloads and every other original nonbinding tag payload remain byte-for-byte
unchanged; an independent check with the existing SWF parser verifies this for
all three final probes. Every non-document symbol binding is also unchanged.
The emitter contains no original artwork, encrypted tank codes or game methods.
Its SWF output stays local and ignored.

```sh
python3 tools/reference/turret-target-probe.py /path/to/original.swf /tmp/turret-probe.swf
BT3_REFERENCE_PORT=3185 bun run reference
```

Select the generated file in the local reference viewer, focus the player, then
press F8. The one-shot key handler constructs the first original builtin avatar
through TankData, parents it, constructs the original `_-ct._-DO`, calls Setup,
assigns that avatar as `movTarget`, and invokes the original EnemyAim directly.
It emits a before marker; the after marker is absent because the original read
throws. This exercises original code and objects in a controlled invocation,
not a normal earned encounter or the original cached-field sequence.

The observed trace contains `[object _-Zx]` with 28 children. Ruffle reports:

```text
ReferenceError: Error #1069: Property inner_mc not found on _-Zx and there is no default value.
    at _-ct::_-DO/EnemyAim()
    at BT3TurretTargetProbe/probeTurretTarget()
```

The `--named-inner` control names the first avatar part `inner_mc` before `_-Tr`.
It produces the same original read error. The `--rejected-birth` control also
invokes original SpawnNewBullet on an uninitialized wrapper whose missing bullet
layer closes its gate. The returned object is identical to the supplied turret;
its parent is null, X/Y/rotation are zero, speed is NaN, damage is 1, enemy is false
and home is null. These constructor defaults were observed before Setup.

| Final probe | Generated SWF SHA256 |
| --- | --- |
| Avatar target | `5c2ae02756c40bd2b5e7b5a302fb46842cbafcd09496c7e677284ce0a45994b9` |
| Named-part control | `4fdef4f453fc19619d8567a412a7744024af90d8dbd93f54c4c882a3f10e3bc1` |
| Rejected-birth control | `b831c524d76549f02ad4261d879c3211e172b2fac0de96d9a8712efe8d40cb39` |

The original SWF SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Passive CDP inspection before F8 observes loaded JS/WASM bytes and compares them
with the installed Ruffle package. The observed WASM SHA256 is
`1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207`;
both observed JS modules also match installed bytes. Chrome reports
157.0.8103.38. This identifies the capture runtime, not a reproducible compilation
from the Ruffle source tag or Adobe behavior. Debugger inspection can perturb
timing, so these captures establish a property-read outcome, not frame timing.

All three final owned browser contexts closed, their processes were absent, and
the owned reference server on 3185 stopped. Retired analytics loads were blocked
by the viewer's local network policy; those console diagnostics are separate
from the intentional source error. No zero-error original-game claim is made.
The ignored `reference-captures/turret-target-runtime/verified-probes.json` records
full tag/byte identities, module observations, traces and cleanup; `observe.mjs`
and `verify-artifacts.mjs` retain the exact local capture/verification commands.

## Simulation contracts

- Each gun retains its turret target directly. Cached `_-G0` attachment replaces
  that target with the avatar. The observed invalid read is represented by
  `TurretTargetReadError`; World ends that listener without executing its later
  gun counter or hit-sound tail, while the separate artwork pass continues.
  The source call chain from Main.Run through World, field and primary Run has
  no catch around this read. Applying that interruption to the cached sequence
  is source-derived; the runtime probe itself uses a key listener.
- `_-BC` shielding polls actual projectile parentage, including turrets still
  parented to a detached old layer. Actual removal is observed at the next
  owner weapon poll, subject to jam/stun. A dead flag or absence from the active
  wrapper's bullet array is not a parent-removal event.
- Target and mount points convert through their actual, separate parent chains.
  A detached layer keeps its own translation and loses stage ancestors. The
  no-target path retains `Scale(-random)` and source atan2 arithmetic, including
  its draw and signed-zero heading. Frame4 clears the target and executes that
  no-target path. Current-wrapper removal remains scoped; no owner-dispatch
  removal or arbitrary layer transfer was introduced.
- PartCallTrigger preserves the existing rotation. It does not aim, reacquire
  or inspect the target's current frame. Any retained nonnull target selects a
  builder until Aim clears it. Deferred pose/Setup writes run only inside the
  open birth gate. A rejected new turret remains in the gun's references and
  target until the next parent poll, without a shot count or live-array entry.
- A successfully initialized turret retains the supplied home object. MoveBullet
  tests that object's physical parent, including dead-but-still-parented owners.
  A missing home is not fabricated from a matching UID. Raw constructor/default
  state and successful Setup stay separate; other projectile constructors and
  all their scheduling/side effects are not established by this change.

## Validation and limits

Five initial contract regressions fail against the preceding implementation.
An additional missing-home regression fails against UID fallback during the
integration. A separate retained-home parentage case adds coverage. Final
formatting, TypeScript and all 929 unit tests / 8,513 assertions pass.
Collision/sound fixtures now explicitly supply their initialized home and parent;
all existing damage, sound and contact assertions remain. The prior owner-removal
fixture now changes physical parentage rather than merely changing a UID.

Production build `i8noAsXyjQtrYrt8aO4SD` passes:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-selection-validation/turret-reference.config.ts
```

All 18 mock/supplied-art cases pass with zero skips, flaky results or page errors:
actors, Buster deflection, crossing, accelerated progression, ink, turret shields,
mounted targets and public creator/save/source selection. Private copies change
only fixture URLs; the caller uses the original spec/helpers. Owned 3165/3166
servers stopped. Accelerated pilots retain 80,162 mock / 81,551 supplied-art frames
through six upgrades, boss defeat, badge and Continue.

The turret gallery preserves all six previous clip/frame/paint assertions and
adds a cached-return panel. Its old-layer turret stays parented, shielding stays 1,
the ready counter stays 79 and the sound timer stays 7 across three interrupted
Runs, while owner art advances 3. Mock/native galleries were inspected. This is a
controlled recreation fixture, not an ordinary source encounter. The shield's
native stopped film/hit frames can be visually empty despite retained objects;
object presence and protection are verified separately from painted appearance.

The valid optional saved-enemy caller remains established by the earlier public
creator/save tests. No builtin roster contains 4032. Arbitrary detached matrices,
complete constructor/art RNG and callback scheduling, an ordinary earned local
turret encounter, synchronized original/Adobe comparisons and full-game parity
remain unproved. The goal stays incomplete.
