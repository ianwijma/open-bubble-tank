# Retained win capture and World lifetime

Evidence is `BTAGameWorld`, `_‑0D`, `_‑EG`, `_‑US` and their matching exported pcode
in the sibling research repository. These are recovered contracts and scoped
recreation checks, not a synchronized original/Adobe win comparison.

## The completion notification owns capture

`_-0D.TestForCompletion` calls World.CompletedABubblefield before force-pickup,
Edit-slider, completion-latch, map-clear and projectile-wipe writes. World increments
its completed counter, then PreWinScreenSetup saves the shared mode, stops both
backgrounds and constructs/attaches the win screen before awarding the boss badge.

The simulation exposes an onWinScreenOpen callback at that notification boundary.
No browser objects enter World. The browser service registers the new root shade
between the world capture at order0 and Main flashes at10, then captures Main once
with fresh paint preparation. The working bitmap is initially transparent, so this
capture includes the newly attached shade rather than recursively copying itself.

The GameViewport stays on Main's World.Run path. The raw stopped state suppresses
gameplay, but its sound-clock tail and attached artwork continue; it is not the
upgrade-menu art-only branch. A new win listener enters the next fixed-frame cohort,
including a later catch-up frame in the same RAF.

## Blur, foreground and direct teardown

`_-EG.Setup` attaches a550×450 transparent `_‑US`, draws Main, and sets the working
blur to2×2/quality2. Run saves before blurring on2,4,...,38: nineteen populated
snapshots. Run40 raises the foreground and starts its authored frame2. Frame2 has
alpha0, frame3 has22/256, frame24 reaches1 and frame25 stops. The existing numerical
WinScreenState supplies that timeline; fixed CSS backdrop blur is removed.

The browser service reuses the premultiplied bitmap/source-over helper and retains
the nineteen populated snapshots. The source allocates30 transparent history
bitmaps up front; unused allocation timing is not reproduced by the shared helper.
Neither win action reverses history. MouseUp deactivates the view before invoking
World: disposal removes its stage/capture subscriptions and releases bitmap memory,
then Continue restores the shared saved mode, both backgrounds and focus. It keeps
the same World, progression and boss flags. Menu removes World and constructs a
fresh menu; the next game gets a fresh World. The menu callback reads the latest
profile settings rather than the start-of-run snapshot.

The existing DOM button/keyboard adapter remains. Early pointer eligibility through
the transparent foreground/bitmap stacking is not established by alpha alone.
Retired parts-pack promotion/navigation remain deliberately omitted.

## Verification

- Formatting, TypeScript and913 unit tests/8,442 assertions pass. Four new tests
  cover the notification boundary, newborn/catch-up cohorts, stopped World tail/art,
  nineteen save-before-blurs, Run40/frame2, direct idempotent teardown and shared-mode
  Continue with retained World/progression/flags.
- The production-viewport fixture records pre-tail flags, compares the retained
  bitmap with a post-tail compositor, and verifies a newly queued Main red flash
  above the shade. Its artificial boss completion and flash are explicit setup;
  birth/open captures do not depict an ordinary earned win.
- All thirteen distinct affected mock/supplied-SWF cases have passing runs across
  win lifecycle, screens/Info, upgrade loading/presentation and accelerated pilots.
  The first full run passed twelve and exposed a premature five-second native
  readiness assertion while SWF extraction was still active. Waiting for the
  existing Ready status fixes setup; the final focused run passes both lifecycle
  cases with zero skips or flaky results. All paint/contact/lifecycle assertions
  remain. The final production build is `b-ULqJ7n4iVi5nAxqhjhc`.

```sh
BT3_FIXTURE_PORT=3166 BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/win-takeover-validation/playwright.config.ts
BT3_FIXTURE_PORT=3166 BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/win-takeover-validation/playwright.config.ts --project=source win-lifecycle.spec.ts
```

The private config replaces all webServer/baseURL settings with owned3165/3166.
Helper-dependent specs run in place; the pilot copy changes only its fixed fixture
URL. The live-stage pilot option preserves accelerated progression coverage while
the lifecycle gallery delivers exact shared cohorts. Its demonstration win view is
separate from the accelerated battle, not a GameShell win-capture differential.
Both owned servers stopped. Native birth/open paint was inspected; the birth is
red by construction, and the opened bitmap retains that flash while its filter
loses alpha. Reports, first-run failure evidence, source draft backup and captures
remain ignored under the validation/deployment-controls directories.

Whole-frame/root-matrix equality, complete constructor/frame/RNG scheduling,
source pointer hit stacking, the unused history allocations, ordinary native/original
boss/win and full-game parity remain unproved.
