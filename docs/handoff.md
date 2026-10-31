# Continuation handoff — 31 October 2026

Continue the existing goal: faithfully recreate the offline Bubble Tanks 3 game in Bun, TypeScript, Next.js, Tailwind and Pixi. The goal remains incomplete. This checkpoint closes the current editor-validation work; it does not establish full-game parity. Read `AGENTS.md`, `docs/architecture.md`, `docs/fidelity.md` and `docs/creator-ui-reference.md` before starting another change.

## Starting point

- Repository: `/home/ian/Projects/ianwijma/open-bubble-tank`.
- Branch: `codex/recreate-bubble-tanks-3`; the commit containing this handoff is the editor-validation checkpoint.
- Authoritative research: `/home/ian/Projects/ianwijma/documented-bubble-tank-3`. Prefer decompiled ActionScript, then exported pcode when the decompiler is misleading. Do not commit SWFs, extracted artwork/audio, dependencies, build output or local captures.
- The user requests occasional signed commits and pushes. Preserve the configured 1Password SSH signer; request an unlock only when an actual signing attempt is blocked.
- Current rules prohibit proactively spawning subagents without an explicit request or applicable instruction. Existing old subagent names are not evidence of active work.

## Closed in this checkpoint

Aggregate editor validation now follows `TankCreatorScreen._-6k/_-AA`, including error priority, source spelling, reverse part traversal, duplicate behavior allowance and the five-entry final ring-array quirk. Rejection reconstructs the latest accepted parts, clears editor selection/drafts and shows the retained source alert. Class updates follow the source caller rather than every transient design mutation.

Undo now records parts only, starts with an empty snapshot plus an imported snapshot when appropriate, permits unlimited accepted snapshots and includes accepted no-op releases. Enemy stats remain outside undo. Movement release records before the separate click's extra pixel. The pure implementations live in `src/game/simulation/editor-validation.ts` and `editor-history.ts`; browser integration is in `src/components/tank-creator.tsx`.

The native alert now uses its already-composed runtime bitmap for DOM display. During keyboard-resize rejection the SVG decoded correctly into Canvas2D, but its static heading/caption disappeared in the page screenshot. Geometry showed no scroll or clipping offset; the exact browser compositor cause is unproven. The browser regression checks red heading pixels in an actual page screenshot. No source media is bundled.

The earlier requested mock weapon, behavior and body movement work is already committed, alongside projectile size/color fixes, pause/audio, revisits/map edges, crossing animation, downgrade restoration, SWF download guidance and zoom settings. Review the fidelity ledger rather than reimplementing these from the historical chat. Procedural contours and some paint remain distinguishable from supplied artwork.

## Next work

1. Continue controlled creator comparison against the original: class rings/selection contrast, center snapping and twin merge/respawn, complete transition/input ordering, preview/placed nested clip lifetime and constructor timing. The current captures establish selected behaviors, not synchronized timing or Adobe parity.
2. Follow the remaining-work list near the top of `docs/fidelity.md`. Open areas include global constructor/frame-action RNG and event ordering, advanced projectile callbacks, crossing hierarchy/teardown edge cases, native vector/font/filter rendering and complete menu/HUD choreography. Prioritize a concrete observed discrepancy and recover its source contract before editing.
3. Record an ordinary keyboard/pointer playthrough and compare boss/win timing with the original. Existing accelerated runs use the public upgrade-selection adapter and are narrower evidence.
4. Keep deliberate offline replacements intact: unavailable community/account/parts-pack/portal features have isolated stubs. The user's SWF is supplied through the asset gate; mock mode remains playable with synthesized audio.

## Verification and local evidence

Use `bun run format`, `bun run check`, and affected `bun run test:e2e` flows. The browser script builds production first, then owns ports 3101/3102. Supply `BT3_SWF_FILE` if the research SWF is elsewhere; native tests otherwise use the sibling repository's `re/bt3/uncompressed.swf` and may skip if it is absent. A passing mock-only run cannot establish native coverage.

The checkpoint's unit suite has 600 tests and 6548 assertions. The broad affected browser pass covered 48 of 49 cases; its sole failure was an old fixture placing class-restricted part 4006 on a class 1 design. That fixture was corrected to build a legal larger tank and passed in the subsequent four-case run, together with both control cases and native resize rejection. The final six alert/validation cases all passed after the bitmap display change (1.3 minutes), with no native skips. The native resize screenshot was inspected with heading and caption present. See the final verification entry in `docs/fidelity.md` for the evidence limits.

Original validation evidence remains ignored at `reference-captures/creator-validation/`: 15 captures, no page errors, nine accepted cannon pairs, overspend rollback, undo, duplicate Aggressors and mixed-behavior rejection. Capture reproduction and provenance are in `docs/creator-ui-reference.md`. Recreation alert/resize captures are ignored under `reference-captures/recreation-editor-validation/`. These local ignored artifacts do not travel with a clone; regenerate them if absent. Temporary `/tmp` logs and process handles are not durable and must not be treated as live after a runtime reset.

Do not stop or repurpose the user's port 3100 browser or a shared original-reference server on 3103. The owned validation-reference server used 3104 and was stopped. Inspect process state before resuming any apparently interrupted run.
