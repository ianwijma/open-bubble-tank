# Creator UI reference

The authoritative tutorial logic is in the sibling research repository's
`re/bt3/export_scripts_deobf/scripts/TankCreatorScreen.as`: setup calls `_-RK`,
`tutBtnUp` steps frames, and `_-Ue` selects `off`. `PlayerProfile.as` initializes,
serializes and resets `_-Xq`. `BubbleTanks3_fla/tutorial_177.as` stops each of the
seven frames of symbol968 (off plus six pages). The parent is creator969, with
the tutorial translated by −213/−280 twips. Shape595 forms the stage veil.

Regenerate the numeric layout from the user's local research copy:

```sh
bun tools/import-creator-guide.ts ../documented-bubble-tank-3
bun run format
sha256sum src/game/data/creator-guide.json
```

Expected formatted metadata SHA256:
`5b4eaacc7e97775dbfa840e0dd67fcc83ddb70a51051073887733d3a6bd0a8ed`.

Capture an owned original-runtime session on an isolated local port:

```sh
BT3_REFERENCE_PORT=3104 bun run reference
# In a separate terminal:
BT3_REFERENCE_URL=http://127.0.0.1:3104 bun tools/capture-creator-reference.ts
```

`BT3_SWF_FILE` overrides the default research SWF. `BT3_REFERENCE_CAPTURE_DIR`
overrides the ignored `reference-captures/creator` output directory. The tool
uses its own browser and closes it on completion; it does not attach to the
user's game tab. It records the SWF hash, browser version, Ruffle version,
renderer, stage size, capture names and page errors in `manifest.json`.
Visual pixel gates wait for the preloader, finished menu and initial creator
page before labeling captures. Software rendering can extend the intro far
beyond its nominal duration.

The verified capture on 2026-10-31 used Chrome 156.0.8078.47 and produced 14
images with no page errors: preloader, storage help, menu, the six creator
pages, guide closed, empty-save alert, a placed bubble, name form and exit
confirmation. The welcome panel and the page4 drag illustration were visually
compared with the recreation's supplied-SWF screenshots at their respective
550×450 and 880×720 stage sizes. This was a foreground geometry check, not a
pixel-equality measurement. The name form also confirmed the original's
`BubbleTanks3` author default and empty tank name.

The supplied SWF's SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
The reference uses Ruffle 0.7.1 with wgpu-webgl, a 550×450 stage and a 4096KB
JavaScript stack. The default browser stack produced an original-game
RangeError/Ruffle panic, so the owned browser launcher explicitly raises it.
REA boot evidence `ev_5c783391a90a285d85d78584e107d447cdf1a016143fbd2ae2f5d86d40b486ce`
has incomplete event coverage; later canvas actions use the project's
coordinate helper/capture tool, not REA event evidence.

These are stopped foreground observations under emulation. They do not prove
Adobe rendering parity, original frame timing, complete event ordering or a
synchronized playthrough. Screenshots, SWFs and extracted media stay outside
source control. Remaining creator differences are tracked in
[the fidelity ledger](fidelity.md).

The follow-up alert/save checkpoint restores the full-stage alert, its retained
fade, fresh-name/profile-author defaults and source save prerequisites, and
removes the extra in-editor name/export row. Run the corresponding browser
comparisons with:

```sh
bun run test:e2e e2e/creator-alert.spec.ts e2e/creator-save.spec.ts
```

The current alert and fresh-form screenshots are retained locally under the
ignored `reference-captures/recreation-save` directory. The tests also cover
source category ordering, selection cleanup after an avatar error, and an
imported over-budget design reaching the actual name/code submission path.

For the original aggregate-validation sequence, select the validation scenario:

```sh
BT3_REFERENCE_PORT=3104 bun run reference
# In a separate terminal:
BT3_REFERENCE_SCENARIO=validation bun tools/capture-creator-reference.ts
```

The 2026-10-31 run produced15 images with no page errors under the same SWF,
browser and Ruffle configuration above. Inspect
`reference-captures/creator-validation/manifest.json` and the named captures:

- `nine-accepted-cannon-pairs`:18 Basic Cannons,18GP,19GP limit.
- `symmetric-overspend-reverted`:tenth pair rejected, original18 retained.
- `undo-after-rejection`:Undo removes the preceding accepted pair, leaving16.
- `duplicate-aggressors-accepted`:two copies of the same behavior are allowed.
- `mixed-behaviors-reverted`:Skittish is rejected while both Aggressors remain.

The tool performs the canvas actions through owned coordinate input. These
captures are distinct from the earlier REA boot evidence and do not supply
complete event coverage or Adobe timing evidence.

Recreate the aggregate-validation browser comparisons with:

```sh
bun run test:e2e e2e/creator-validation.spec.ts e2e/creator-alert.spec.ts
```

The resize cases verify the heading in an actual page screenshot as well as
rollback, accepted no-op/import history and focus. Current native/mock captures
are retained locally, ignored, under
`reference-captures/recreation-editor-validation`. The native alert uses the
already-composed runtime bitmap to preserve its static heading/caption in DOM
painting; the source media still comes only from the supplied SWF.
