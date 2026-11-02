# Creator workflow source and verification

Read the sibling research repository's `re/bt3/export_scripts_deobf/scripts/TankCreatorScreen.as`, `PlayerProfile.as`, `_‑HJ.as` and `BubbleTanks3_fla/tutorial_177.as`. Exported `TankCreatorScreen.pcode` resolves the malformed distinct-behavior validation loop. Source behavior takes precedence over older recovery checkpoints.

The first-use latch `_‑Xq` changes on entry; tutorial968 stops at off1 and pages2–7. Creator969 places it at−213/−280 twips. The initial Back is offstage. Alert937 uses its own2000ms Timer followed by ENTER_FRAME alpha decrements; restarting the Timer preserves an existing fade and hidden fades continue after dismissal.

SaveExitMouseUp checks avatar attachment before body, using broad catalog categories. It does not rerun aggregate edit validation on imported parts. Guest author defaults to `BubbleTanks3`; only the current-game loaded-tank path supplies the name. Offline local saving and keyboard access remain documented recreation adapters.

`_‑6k/_‑AA` validate accepted edits in source priority order. They traverse mounts backwards, permit duplicate copies of one behavior type, and use a five-entry radius array. `_‑eI` records unlimited accepted part snapshots, including no-op operations. Setup records empty parts and import appends its parts. Undo/rejection reconstruct parts while retaining enemy statistics. Rotation and resize have different class-update callers; movement release records before its separate click step.

Regenerate numeric layouts from a supplied local research copy:

```sh
bun tools/import-creator-guide.ts /path/to/documented-bubble-tank-3
bun tools/import-creator-dialogs.ts /path/to/documented-bubble-tank-3
bun run format
```

The guide importer supplies the placement matrix to the common layout collector so declared text bounds and glyph transforms remain distinct. It emits numeric geometry, character advances and copy, with no original contours, font outlines or media. The dialog importer preserves the already-recovered form/button frames while adding the alert registration, static primitives and dynamic field.

Controlled reconstruction checks:

```sh
bun run check
BT3_SWF_FILE=/path/to/uncompressed.swf bun run test:e2e e2e/creator-guide.spec.ts e2e/creator-alert.spec.ts e2e/creator-validation.spec.ts e2e/creator-controls.spec.ts e2e/creator-save.spec.ts e2e/creator-enemy-stats.spec.ts
```

The creator exposes read-only design metadata for geometry tests. Input still follows real controls; no extra editor export row is required. Native tests must receive the local SWF; skips are not native verification.

For an owned original-game comparison:

```sh
BT3_REFERENCE_PORT=3104 bun run reference
# In another terminal:
BT3_REFERENCE_URL=http://127.0.0.1:3104 BT3_SWF_FILE=/path/to/uncompressed.swf bun tools/capture-creator-reference.ts
# Select the aggregate-validation route with BT3_REFERENCE_SCENARIO=validation.
```

The capture tool uses its own browser, closes it after completion and leaves shared ports3100/3103 alone. Captures and manifests stay ignored under `reference-captures/`. Original capture scripts and historical prose are not proof that a fresh comparison succeeded: inspect the actual manifest, input/SWF/runtime identity and screenshots. Ruffle observations remain distinct from Adobe execution, exact pixel equality, constructor/event ordering and a synchronized playthrough. Record current results and remaining differences in [the fidelity ledger](fidelity.md).

Fresh November2 captures are retained locally under `reference-captures/creator-workflow-recovery/original-creator/` (14 states) and `original-validation/` (15 states), each with zero page errors. They use the unmodified supplied SWF SHA256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`, Chrome156.0.8078.47, installed Ruffle0.7.1 and the configured wgpu-webgl renderer. The manifests retain installed runtime-file digests, input-layout/tool hashes and capture names; these installed-file identities do not independently prove every renderer variant executed. The capture tool now freezes its own/layout hashes before browser launch.

The original screenshots show18GP retained after the rejected tenth cannon pair,16GP after Undo, two retained Aggressors and a rejected distinct Skittish. Guide welcome/page4 and the empty-save alert foreground were compared visually with the supplied-SWF reconstruction at their respective550×450 and880×720 sizes. The panel/alert registration and copy align closely; this is not a pixel-equality measurement. The actual creator class rings/axis are fainter in the reconstruction than the original, while the guide's baked illustration retains brighter rings. That pre-existing rendering/selection contrast gap remains open in the fidelity ledger.
