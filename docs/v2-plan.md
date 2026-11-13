# Open Bubble Tank V2: modernization plan

**Status: plan only. Nothing here is implemented.** Written 2026-11-13 from planning discussions with Ian and from reading the code at commit `12bf09d`. Revised 2026-11-14 after an independent review of the plan against the code. No tests or game code were run for this plan. Counts and comparisons come from reading the source and data files. Code references describe that commit and may drift.

## 1. What V2 is

V2 is a modern successor to the faithful recreation ("classic"). Classic reproduces Bubble Tanks 3 as it was: a fixed 550×450 stage, desktop keyboard and mouse, and the original rules. V2 keeps the engine and changes whatever makes the game better to play today.

Goals, in priority order:

1. The game fills the screen and stays sharp at any size.
2. It plays well on a phone.
3. A community forms around it: people build tanks, share them, and fight each other's designs.
4. Gameplay is improved where the original is awkward. V2 is not bound by the "faithful, not reinterpretation" rule.

V2 is built on its own artwork, so it starts and plays without the original game file. It is also free to break with classic: saves and tank codes do not carry over. V2 will be released as its own website under a new name, detached from the Bubble Tanks branding (section 7).

Out of scope: payments of any kind. The workshop is a free gallery. Original artwork belongs to Hero Interactive and is never bundled, uploaded or hosted (see `NOTICE.md`).

## 2. Decisions

Each entry is marked **decided** (Ian confirmed it), **proposed** (recommended, not yet confirmed) or **open**.

### Project

| Topic | Decision | State |
| --- | --- | --- |
| Relation to classic | Classic is tagged in git and kept as its own release. V2 continues on `master`. | Decided |
| Where V2 lives | A separate website under the new name. Which address, and what stays at the current one, is decided later. | Decided |
| When V2 starts | After the classic implementation is wrapped up, on a date Ian chooses. Ian handles the classic release. Neither is part of this plan. | Decided |
| Compatibility with classic | None required. Saves do not carry over, and V2 has its own tank code. | Decided |
| Test safety net | Before V2 changes anything, tests pin what the game does today, both in the rules and in the browser. | Decided |
| Code modernization phase | After the safety net, the code is restructured so it can take the V2 changes. Nothing the player can see changes in this phase, and the tests prove it. | Decided |
| Rebrand | A complete one before V2 goes public: a new name, new artwork, and new part names and texts. The current name stays during development. | Decided |
| Frontend hosting | Vercel. | Decided |
| Backend hosting | A small rented VPS, built so it can move to another host later. Not Vercel (cost). | Decided |
| Phones | Must run well on a mid-range phone. Ian's high-end iPhone is the main test device. | Decided |

### Artwork, screen and controls

| Topic | Decision | State |
| --- | --- | --- |
| Artwork | V2 uses its own artwork everywhere and needs no original game file. The current stand-in artwork is kept for now. An overhaul comes with the rebrand. | Decided |
| Original artwork | Not shown in V2. Classic remains the place for the original look. | Decided |
| Music | Players can still load the original game file for its music. | Decided |
| Artwork in tests | CI uses V2's own artwork only. | Decided |
| Screen | The game fills the window and shows more of the field. No letterboxed box. | Decided |
| Order | Widescreen before mobile, because phones are wide and need the same view and HUD anchoring. | Decided |
| Frame rate | The picture is drawn at the screen's refresh rate by default, with a setting to limit it higher or lower. | Decided |
| Game speed | The rules always advance at the same speed, whatever the frame rate. Classic's 35, 65 and 90 speed options are removed. | Decided |
| Pause, upgrade and win screens | Panels over the live game view, dimmed behind them, in place of classic's frozen 550×450 picture. | Decided |
| Mobile controls | Twin-stick: one side of the screen moves, the other aims. | Decided |
| Tank facing | The classic rule stays: small tanks face the aim, large tanks turn with their movement. The aim (mouse or aim stick) points the turrets. Turning the hull toward the aim was considered and dropped. | Decided |
| Diagonal speed | One top speed in every direction, for keys and sticks alike. Keyboard diagonals become slightly slower than in classic. | Decided |
| Key bindings | Every action can be rebound, including to mouse buttons. Secondary fire stays on Space by default. | Decided |
| Aim assist | Touch and gamepad only, with an off switch. | Decided |

### Gameplay

| Topic | Decision | State |
| --- | --- | --- |
| What "tier" means | The tank's class, currently 1 to 6. | Decided |
| What sets the tier | The tank's size alone. Size also limits how many weapon points a tank can carry. | Decided |
| Tier is calculated | A tank's tier is worked out from its build. No code or publisher can set it. | Decided |
| Stats come from the build | Health, speed, turn rate and reward are calculated from the parts: few small bubbles make a light, fast tank, and many large bubbles and weapons make a tough, slow one. Nobody types them in. | Decided |
| One stat system | Player tanks and enemy tanks use the same system, including for health. | Decided |
| Health and growth | Two bars. The health bar comes from the tank and is what damage removes. The growth bar fills from collected bubbles and triggers the upgrade. Hits never reduce growth. | Decided |
| After an upgrade or downgrade | The new tank starts with full health. A downgrade also empties the growth bar. | Decided |
| How bubbles are shared | Bubbles refill health first, and only fill the growth bar once health is full. This is the scheme to start with; others are listed in workstream K. | Decided |
| Starting values for stats | Fitted to the stats of today's built-in tanks, then tuned through play. | Decided |
| Built-in tanks | Recalculated with the same formulas as every other tank. | Decided |
| Boss stats | Hand-set, for the game's own bosses only. | Decided |
| Stats in the editor | The editor shows the calculated stats live while building. | Decided |
| Unlocks in a run | The run's level decides what is available: each level-up unlocks the next tier and more weapons, up to tier 8 at level 8. A small tank may carry a weapon unlocked at a high level. | Decided |
| Run start | Every run starts as the basic tank and works up. Quick play is a one-click start of such a run. | Decided |
| Upgrade choices | On an upgrade the player chooses from all tanks they can use at that level, including workshop tanks. The upgrade screen is rebuilt to show many tanks. | Decided |
| Upgrade protection | A fresh upgrade cannot be lost to a single hit, because the new tank starts with full health. A separate temporary buffer was considered and dropped. | Decided |
| More tiers | Two more, 7 and 8, for very large tanks with larger weapons. Balance is worked out during implementation. | Decided |
| Endgame | Several bosses and several kinds of special field, such as a wave arena found far from the center. Details are designed later. | Decided |
| Save and resume | Required. Quitting must not force a restart. | Decided |
| Save method | Checkpoints, not an exact freeze-frame. Clearing a field always saves. | Decided |
| Quick switching | Jump between editor, test arena, workshop and game without reloading. | Decided |
| Community enemies | Supported, with the player choosing which sources appear. | Decided |

### Workshop

| Topic | Decision | State |
| --- | --- | --- |
| Location | Subpages of the same site, not a separate domain. | Decided |
| Login | Discord. | Decided |
| Tank images | None stored. The server holds tank data only, and every tank is drawn in the browser. | Decided |
| Link preview images | A server address that returns a picture of a tank, drawn on request. Left for later, not part of the launch. | Decided |
| Tier filter | Required. | Decided |
| Publisher pages | Public page per publisher listing their tanks. | Decided |
| Popularity | Measured by use, not by star ratings. Each tank shows an overall figure and a recent figure. | Decided |
| Sorts | Newest, latest updated, most used overall and most used recently. | Decided |
| Use count | A workshop tank counts one use each time it is part of someone's run, as an enemy source or as a tank the player takes. Once per tank per run, the author's own runs included. Resuming a saved run does not count again. Arena sessions and library adds do not count. | Decided |
| Guest and account | Without login the library lives on the device and is lost if the browser's storage is cleared. With login it is tied to the account. | Decided |
| Publishing | A tank is private until its maker publishes it. | Decided |
| Versions | A published tank is one entry with versions. Each version never changes. The latest is shown by default. A new version does not reset the tank's use figures. | Decided |
| Unpublishing | Not possible. A published tank stays published. Its author can hide it from their own page, and it remains findable elsewhere. | Decided |
| Removal | Only by a moderator, after confirming a report. Nothing is ever erased: a removed tank is hidden from everyone and the owner can restore it. A removed tank also leaves every pack. | Decided |
| Moderators | One owner account, Ian's, appoints and removes moderators and can undo anything a moderator did. | Decided |
| Account deletion | Supported. The account's personal details are erased and its tanks stay, shown under "deleted user". | Decided |
| Library | Two kinds of entry. A subscribed workshop tank follows its latest version and cannot be edited. A copy is the player's own tank, editable, with no link back to the original. | Decided |
| Copies | Copying someone's tank, changing it and publishing it as your own is allowed. Exact copies are not refused. | Decided |
| Tanks during a run | A run keeps the versions it started with. Nothing changes mid-run. | Decided |
| Tank code | Deterministic: the same build always produces the same code. Two kinds: a full code holding the whole tank, and a workshop reference pointing to a published tank. | Decided |
| Weekly pack | The most used tanks of the past week, top 10 per tier, installable in one click. Other "top X" packs later. | Decided |
| Weekly pack version | The pack takes each tank's latest version at the moment it is built and keeps that version. | Decided |
| Weekly pack schedule | Built automatically every Friday at 06:00 UTC. Past weeks stay playable, and the current week is advertised in the game. | Decided |
| Packs and stat changes | Old packs play with the current stat formulas. | Decided |

## 3. Split from classic

1. When the classic implementation is wrapped up, Ian tags that commit (for example `classic-1.0`) and creates a `classic` branch from it for later hotfixes.
2. Ian decides where classic is deployed.
3. `master` becomes V2. V2 goes public later as its own website under the new name (section 7).
4. The first V2 commit rewrites `AGENTS.md`, `goals.markdown`, `README.md` and `docs/architecture.md`. They describe a faithful recreation, which would steer V2 work wrong. `docs/fidelity.md` stays as the record of classic.

V2 work starts after steps 1 and 2. Classic is not this plan's concern from then on.

**Saves.** V2 does not read classic saves. It stores its data under its own name and will live at its own address, so the two never touch.

## 4. Architecture and hosting

### One app frame

Classic is a single screen-state machine inside `GameShell`. V2 becomes several pages under one persistent frame that holds what must survive navigation: loaded art, audio, the profile and the tank being worked on.

| Route | Purpose |
| --- | --- |
| `/` | Menu and the game |
| `/editor` | New tank editor |
| `/arena` | Test arena |
| `/workshop` | Browse community tanks |
| `/workshop/t/<id>` | One tank |
| `/workshop/u/<handle>` | One publisher |

Moving between pages must not reload art or lose the tank being worked on.

### Starting without the original file

V2 opens straight into the game with its own artwork. There is no file to pick first, which matters most on phones. Today every page load starts at a screen asking for the original SWF.

The original file is an optional add-on in the settings, loaded for its music. When a player supplies it, V2 remembers it on the device, with a "forget file" control.

### Frontend

A client-side app on Vercel. Workshop pages fetch from the backend in the browser, which keeps Vercel usage to static delivery. The game itself must be fully playable when the backend is unreachable.

### Backend

One container on a small VPS, at an `api.` subdomain of the game's domain.

- **Stack.** Bun, the Hono web framework, the Drizzle SQL layer and SQLite.
- **Stateless program, one data file.** The program keeps nothing in memory between requests. All data is in one SQLite file on a persistent disk.
- **Backups.** Nightly copies taken in a way that is safe while the database is in use, kept off the server, with a restore that is actually tried.
- **Scheduled jobs as plain commands.** Backups, count roll-ups and the weekly pack build. The pack build can be re-run safely and catches up after downtime.
- **Configuration by environment variables.**
- **Same repository as the game,** so the server runs the same validation and stat calculation as the browser.

**Moving later.** Database access goes through one layer, so the host can change. That is a bounded piece of work, not a switch: moving from SQLite to another database needs a data migration, and moving to Cloudflare Workers changes how scheduled jobs run. If the VPS is outgrown, Cloudflare Workers with D1 is the likely destination.

**Scaling while on the VPS.** Cloudflare's free tier in front caches public, anonymous read endpoints for a short time. Use counts are batched.

### Security

To be designed before the backend is built:

- **Login.** Discord sign-in with the standard protection against forged login responses.
- **Sessions.** A cookie the page's scripts cannot read, sent only over HTTPS, and revocable on the server. The site and the `api.` address count as different origins, so the server lists exactly which origin may call it with a login.
- **Forged requests.** Protection so another website cannot publish or report in a logged-in player's name.
- **Permissions.** Every change is checked against the account making it. Three roles exist: player, moderator and owner.
- **Caching.** Only anonymous responses are cached. Nothing tied to a login is. Cached pages are purged when moderation removes a tank.
- **Input limits.** Size, part-count and number-range limits on every route that accepts a tank, not only on drawing routes.
- **Secrets** stay in the server's environment, never in the repository.

### Operations

- **Monitoring.** Error reporting and an uptime check for the backend.
- **Cost.** A stated monthly ceiling for the VPS and CDN. Not set yet.
- **Moderation.** Reports are handled by moderators that the owner appoints (workstream G).

## 5. Safety net and code modernization

Four phases come before any V2 feature. Tests first pin what the game does today. The rules are then made independent of the browser, so that whole runs can be recorded and replayed. With those recordings in place, the code is restructured for V2 while everything stays green.

### What exists today

Counted from the files at commit `12bf09d`. Nothing was run, so pass rates and run times are unknown.

- **Rule tests.** 884 test declarations in 135 files under `tests/`, run by `bun run check`. This counts declarations in the source, not tests executed; some are repeated over several inputs. They exercise the engine without a browser, and none import a React component. A few need the original SWF and skip without it.
- **Browser tests.** 290 test declarations in 114 files under `e2e/`, run by `bun run test:e2e` one at a time against a production build.
- **CI.** Runs the format check, the TypeScript check, the rule tests, a production build and the browser tests with "mock" or "synthetic" in their title, which is about 132 of the 290 by a count of titles. The rest do not run in CI. Most of them need the original SWF, which is never committed.
- **A full playthrough.** A bot plays a fresh game through to the boss and the win screen from a fixed random seed (`tools/playthrough/`, `e2e/playthrough.spec.ts`). It runs in a browser and checks broad outcomes such as "won" and "reached every level", not the exact course of the run.
- **Not present.** Coverage measurement, a linter, and fixed versions for five development dependencies (`@playwright/test` and four type packages are set to `latest`).

### Gaps

1. **Nothing pins a whole run exactly.** The tests check individual rules and layouts. A restructure of `World` (1,359 lines) could change the order of one random draw, alter every later encounter, and still pass them all.
2. **A run cannot be replayed exactly today.** Three things stand in the way:
   - **Shared random numbers.** The background particles draw from the same random-number generator as the rules (`src/components/game-shell.tsx`), so a visual effect changes which enemies appear.
   - **Rules that read the artwork.** In the browser, hits, tank widths, shield sizes and shot outlines come from the loaded artwork through six hooks (`src/components/game-viewport.tsx`), and hit tests also take the zoom setting. Without a browser the engine falls back to rough approximations, so it plays a slightly different game.
   - **Real time and side commands.** Some timers advance on real elapsed time, and choices such as an upgrade pick are sent outside the per-step input record.
3. **Many tests pin the classic presentation.** 39 of the 114 browser test files refer to the 550×450 stage or the original-size switch (a text count), and V2 replaces those screens on purpose. A failing test must say clearly whether something broke or something was meant to change.
4. **Nothing covers what V2 adds:** other window shapes, touch, gamepad, save and restore, the new tank code, the backend.
5. **Coverage is unknown.** Nobody has measured which engine code no test reaches.

### Phase 1: safety net

- **Baseline.** Run every test once, including the original-artwork ones on a machine that has the file. Record what passes, what is flaky and how long it takes. Flaky tests are fixed or set aside with a note, so that a red result later means something.
- **Coverage map.** Measure which engine code the rule tests reach and add tests where V2 will cut deepest: movement and facing, input, the profile, wave and roster selection.
- **Player journeys in the browser.** A small set of end-to-end tests written as what a player does, with V2's own artwork so they run in CI:
  - Start a game, play, pause, upgrade, clear a field, quit and continue. "Continue" restores progression only today; a true resume journey arrives with workstream C.
  - Build a tank in the editor, save it and load it.
  - Change settings and key bindings, reload the page and find them kept.
  - Journeys reach the page through shared helpers. When V2 replaces a screen, the helpers change and the journey stays.
- **Sort the tests.** Mark each test file as **engine** (rules that V2 keeps) or **classic presentation** (exact layouts, pixel comparisons, the 550×450 stage, the original artwork). The mark decides what a failure means later.
- **CI.** Add the journeys. Fix the versions of the development dependencies, so a tool update cannot change results in the middle of a restructure.
- **The bot playthrough stays** as the only whole-run check until recorded runs exist.

### Phase 2: self-contained rules

The rules must give the same result in a browser, in a test and on a server. This phase removes the three obstacles listed under the gaps.

- **Separate random numbers** for the rules and for visual effects.
- **Shapes from numbers.** Hits, sizes and outlines come from each part's numeric data, not from drawn artwork or the zoom setting. All six hooks are listed and replaced. The stand-in artwork already describes bubbles as numeric circles (`src/game/data/mock-part-leaves.json`), and 73 other parts have numeric layouts (`src/game/data/part-geometry.json`).
- **Stepped time.** Timers count simulation steps, not real time. Game speed becomes fixed.
- **Commands in the record.** Upgrade picks, closing a help panel and similar choices become recorded commands beside the per-step input.

These are small, deliberate rule changes: a hit decided by a numeric circle can differ by a pixel from one decided by drawn artwork, and enemies appear in a different order for a given seed. A player should notice nothing. They cannot be guarded by recordings, which do not exist yet. They are guarded by the rule tests, the bot playthrough and manual play. Tests that pin the old pixel behavior are updated in the same change, with the reason stated.

This phase also delivers the size calculation that workstream K needs.

### Phase 3: recorded runs

- **What is recorded.** The starting configuration (seed, the settings that affect rules, the enemy sources), the per-step input, and the commands.
- **What is compared.** A short fingerprint of the world state every few steps. A test replays each run and reports the first step that differs.
- **Sources.** The existing bot on several seeds, plus short targeted runs for each tier, each weapon family, the boss, death and downgrade, field crossing, and custom enemy tanks in the roster.
- **Without a browser.** Runs replay in a plain test process. One check replays the same recording in a real browser and confirms identical fingerprints. How long a replay takes is to be measured.
- **Re-recording is one explicit command.** A change that re-records must say why in its description.
- **Limit.** They guard the rules only, not drawing or sound.

### Phase 4: code modernization

The code is restructured so each V2 workstream has a place to attach. Each item keeps the current behavior as its default.

| Change | Prepares |
| --- | --- |
| **One source for the stage size.** The numbers 550, 450, 275 and 225 appear on about 70 lines across 28 source files (a text count, so a few may be unrelated). Replace them with two named things: the simulation box and the visible area. Both start at 550×450. | A |
| **One place that decides sharpness.** Canvas resolution and the size artwork is drawn at come from one service, set to today's values. | A |
| **Split the asset loader.** `src/game/assets/asset-pack.ts` (1,567 lines) is separated into reading the original file, the stand-in artwork, drawing and caching, so the stand-in artwork no longer depends on the file reader. | A, D, J |
| **Input as actions.** Devices produce the same per-step input record the simulation already takes. Keyboard and mouse become the first device, with identical output. | B |
| **Handling and tier tables as data.** Speed, armor and size tables stop assuming six tiers. Values stay the same. | B, I, K |
| **World state inventory.** List everything a run holds and separate plain data from the callbacks and timers attached to it. Saving and restoring is workstream C, not this phase. | C |
| **Tank code behind one interface** with a format version, so a second format can be added. | D |
| **Module boundaries enforced by a linter.** Rendering, browser services and simulation are separate by convention today. A lint rule makes a wrong import fail the build. | All |

**Rules for this phase.**

- **Every test stays green, including the classic presentation tests.** Nothing visible changes, so nothing should fail.
- **No recorded run is re-recorded.** A change that needs a re-record alters behavior. It is taken out and handled as a V2 change later.
- **Bugs found are written down, not fixed in passing.** A fix changes behavior and gets its own change.
- **Code that V2 replaces is left alone.** The classic editor and tank viewer screens (`tank-creator.tsx`, `tank-viewer.tsx`, about 2,000 lines together) are replaced in workstream E. Their engine-side rules (placement, selection, validation) are kept and covered.
- **Scope is the table above.** Restructuring for its own sake is out. This phase shows the player nothing, so it must stay short.

**Done when** every item in the table is in place with unchanged defaults, CI is green, and a manual play session finds no difference.

### During the V2 workstreams

- **Engine tests and recorded runs** must stay green unless the change is meant to alter the rules. Then the test or recording is updated in the same change, with the reason stated. Workstream K is the first such change.
- **Classic presentation tests** are retired when their screen or the original-artwork code is removed. Each retirement is named in the change that causes it, and the replacement gets a journey or its own tests.
- **The wide view should not need a re-record.** The simulation keeps its 550×450 box, so the same inputs must give the same run. This shows the wide view did not leak into the rules. It does not show that players have the same reach as before (workstream A).

**Tests each workstream adds.**

| Workstream | New tests |
| --- | --- |
| A. Fill the screen | Browser runs at several window shapes and pixel densities (16:9, ultrawide, phone both ways). Canvas size matches the window, the HUD stays inside the view, artwork is drawn at least as large as it is shown. |
| B. Controls and mobile | Each device produces the expected input record. Touch journeys with an emulated phone, plus checks on real phones. Bindings survive a reload. |
| C. Save and resume | Save, reload the page, resume. Saving at awkward moments (crossing, upgrade screen, pickups in flight) neither loses nor duplicates progress. A damaged save is reported, not silently discarded. |
| D. Tank renderer and code | The same build gives the same code every time. Encode then decode returns the same build. Stored code examples, so the format cannot drift unnoticed. Invalid and oversized codes are rejected cleanly. |
| G. Workshop and backend | API tests against a throwaway database. Login and permission checks. The weekly pack build with a fixed clock, run twice to show it is repeatable. |
| H. Community tanks in a run | Recorded runs with each source mix. Every wave can still be filled when sources are community-only or a tier is empty. |
| K. Stats from the build | The browser and the server return identical stats for the same build. Stored examples of build and stats, so a formula change is always deliberate. Deliberately abusive builds (stacked, tiny, scattered) get sensible stats. |

## 6. Workstreams

### A. Fill the screen, sharp

**Why it is blurry today.** Three layers each bake in a pixel size:

1. The stage is stretched by a CSS `transform: scale()` (`src/components/game-shell.tsx`, the `ResizeObserver` effect), so every canvas is enlarged as a bitmap.
2. The game canvas is 550×450 at 1× or 2× (`src/game/render/pixi-renderer.ts`, `init`). Fullscreen needs about 2.4× at 1080p and 4.8× at 4K, before device pixel ratio.
3. Every vector shape is turned into pixels once, at 2× (`rasterSvg` in `src/game/assets/asset-pack.ts`), and textures have no per-scale variants (`src/game/render/swf-textures.ts`).

**Work.**

- **Render scale.** One service publishes the scale (stage scale × device pixel ratio, stepped and capped). The main renderer and the other Pixi apps resize to it.
- **Sharp textures.** V2's own artwork is made of shapes described by numbers, so it is drawn at whatever size the screen needs (workstream J). Textures are drawn on demand at the needed size, cached by scale, capped by GPU texture size and a memory budget, with smaller copies for zoom-out.
- **Filters.** Glow effects assume one texture pixel per stage pixel (`src/game/render/swf-glow-filter.ts`) and must scale with resolution. Whether Pixi 8.22 runs the other filters at 1× by default was not checked.
- **Wide view.** The canvas takes the window's shape. The simulation keeps its 550×450 box centered inside it, because some rules compute in stage pixels around (275,225): Enemy Spike hits (`src/game/simulation/spikes.ts`), coordinate rounding (`src/game/simulation/actor-parents.ts`) and whip effects (`src/game/simulation/whip.ts`).
- **One coordinate module.** Four spaces exist: the field, the simulation box, the visible area and screen pixels. One module converts between them, for drawing and for input alike.
- **Narrow screens.** The simulation box is the minimum that must be visible. A phone held upright is narrower than the box at normal scale, so the view shrinks until the box fits. Wider and taller screens see more.
- **Aim reach (decided).** In a wide view the aim point can sit farther from the tank, which lets teleport parts reach farther. The rules limit aim distance to what the simulation box allows, so screen shape gives no advantage. The existing zoom setting has the same effect today.
- **Off-screen activity.** Check whether any rule treats "off-screen" as inactive. More of the field is now on screen.
- **HUD anchoring.** Minimap and edit slider top-left, health and growth bars bottom-left, weapon panel top-right, pause bottom-right. On phones the bars move out of the thumb zone.
- **Radar.** The off-screen test is the 550×450 box (`src/game/core/tactical-hud.ts`) and must use the real visible area.
- **Backgrounds and effects.** The particle background, flashes, ink and screen effects are built for 550×450 and must cover the full view.
- **Pause, upgrade and win screens.** In classic each of these freezes a 550×450 picture of the game, blurs it and puts a fixed-size panel on top. V2 keeps the live game view, dims it and centers a panel over it.
- **Frame rate and smooth motion.** Today the picture is drawn once per display frame with no smoothing between rule steps (`src/game/services/stage-runtime.ts`), which judders on 60, 120 and 144 Hz screens. V2 draws at the screen's refresh rate, blends between rule steps, and offers a frame-rate limit in the settings.
- **Memory and load time.** Each texture keeps a canvas, a full pixel copy and its SVG text, and loading processes everything in sequence on the main thread. Drop eager pixel copies, draw editor art lazily, and report progress throughout.

### B. Controls and mobile

**How movement and aiming work today.**

- **Large tanks face where they move.** Tiers 1 to 3 face the cursor. Tiers 4 to 6 turn the hull toward their velocity (`controlPlayerDirection` in `src/game/simulation/player-direction.ts`). Their turret weapons track the cursor on their own (`weaponAimFlags` in `src/game/core/weapon-aim.ts`); weapons fixed to the hull fire along it.
- **The turn is slow.** Turn rate is speed ÷ 4 degrees per step. Moving straight at full speed, at the default 50 steps per second, that is about 34° per second for tier 4 and 22° for tier 6, and zero when stationary.
- **Tanks are floaty.** In `movePlayer` (`src/game/simulation/world.ts`), each axis accelerates by 0.6 × tier speed per step up to 6 × tier speed, and coasts down by only 0.09 per step. A tier 1 tank takes about 1.2 seconds to stop.
- **Diagonals are faster.** Axes are independent, so diagonal movement is about 40% faster than straight movement.

**Work.**

- **Input layer.** Keyboard, mouse, touch and gamepad become sources feeding one movement vector, one aim point and the fire states. Today `src/game/core/input.ts` reads browser events directly; touch can aim and fire but cannot move, and there is no gamepad support.
- **Facing.** Unchanged from classic.
- **Handling values.** Acceleration, braking, top speed and the hull's turn rate are calculated from the tank's build (workstream K) and shown in the editor. The starting values reproduce today's handling, and tuning happens through play in the test arena.
- **One top speed in every direction.** Required for analog sticks, and applied to the keyboard too so all devices play alike.
- **Key bindings.** Today six keys can be rebound (four directions, pause and lock). Secondary fire is fixed to Space and primary fire to the left mouse button. V2 makes every action rebindable to a key or a mouse button: movement, primary fire, secondary fire, pause, lock and map. Defaults stay as they are. Binding the right mouse button requires suppressing the browser's context menu over the game. Gamepad buttons are rebound on the same screen, and conflicting bindings are flagged.
- **Touch.** Floating twin sticks: each appears where the thumb lands in its half of the screen. Left moves, right aims, with a swap option. Primaries fire while the aim stick is held. A button beside the aim thumb fires the secondary. Teleport distance follows how far the aim stick is pushed.
- **Gamepad.** Left stick moves, right stick aims, triggers fire primary and secondary.
- **Aim assist.** Touch and gamepad only. Pulls the aim gently toward the nearest enemy in a narrow cone. Can be switched off.
- **Mobile page behavior.** Viewport settings, safe-area insets, no scroll or zoom gestures on the stage, landscape and portrait layouts, and tap equivalents for hover-only interface elements.
- **Audio.** Move from `HTMLAudio` elements (`src/game/services/audio.ts`) to WebAudio. iOS ignores element volume and handles many simultaneous elements poorly. This also enables volume sliders.
- **Installable and offline.** Manifest, icons and a service worker. An installed copy must cope with a newer game version arriving and with the browser clearing its storage.
- **Resilience.** Recover from a lost graphics context, which phones cause when backgrounding a tab. Whether this is handled today was not checked.
- **Full screen on iPhone.** The element fullscreen API has historically been unavailable in iPhone Safari, which is why installation matters. Check against current iOS.

### C. Save and resume

Classic's "Continue" restores design progression only. V2 must resume the run.

**Checkpoints.**

- **Saved.** The tank, its health and growth, the run's level, unlocked parts, the map, every field's surviving enemies with health, positions, cooldowns and status effects, the boss's state, run statistics, the random-number state, the stat-formula version, and the enemy sources in use with the data of every tank chosen for the run, so a resume works offline and nothing changes mid-run.
- **Not saved.** Shots in flight and running effects.
- **When.** On entering or clearing a field, on pause, and when the tab is hidden or closed.
- **Resume.** "Continue" returns the player to the field they were in.
- **After a game update.** A save that no longer matches falls back to restoring progression only.

**Moments that need a rule.** A save taken at the wrong instant can lose or duplicate progress:

- **Pickups in flight.** Clearing a field marks it cleared and pulls its remaining pickups toward the player in the same step (`src/game/simulation/world.ts`). The save either waits until they land or credits them at once. It must not do both.
- **Crossing, upgrade screen, death.** A save is postponed until the game is back in ordinary play.

**Why this is real work.** A running world holds links between objects, registered callbacks, target references and pending timers (`src/game/simulation/world.ts`, `src/game/simulation/wall-timers.ts`), none of which can be written to storage as they are. The first tasks are a defined save format and a restore routine that rebuilds those links. An exact freeze-frame was not chosen because it would need every timer and effect to be storable.

**Profile, same workstream.** V2 stores its profile under a new name and upgrades it step by step between versions. Today a version mismatch silently resets everything (`loadProfile` in `src/game/services/profile.ts`). Add whole-profile export and import. Run saves, subscribed tanks and installed packs need larger storage than `localStorage`.

### D. Tank renderer, codes and links

**Renderer.**

- **Shared renderer.** One off-screen renderer draws any tank from its data and hands the picture to a card. Browsers limit the number of graphics contexts, so one per card would fail. Parts of this exist in the classic tank viewer.
- **Lazy and cached.** Cards draw as they scroll into view and are cached by version and size.
- **Still, then animated.** A still pose first; animation on hover or tap.
- **Art.** V2's own artwork, so a tank looks the same to everyone.
- **Runs outside the browser.** The part that turns tank data into shapes has no browser dependency, so a server can use the same code later.

**The classic code, for reference.** `src/game/services/tank-code.ts` holds author, name, player-or-enemy flag, class, life, reward, speed, difficulty, and for each part a name, type, twin link, position, rotation, scale and radius. Among the 75 built-in tanks the median code is about 1,400 characters and the largest, a 227-part boss, about 32,000. Each encoding of the same tank differs, because the code includes random characters used as its key. It is obfuscated, not secret: the key is derived from the code itself and a constant in the source.

**V2 tank code (the determinism is decided; the format is proposed).**

- **Full code.** Holds a whole tank. Entering one puts a copy of the tank in the player's library.
- **Workshop reference.** A short link or id pointing to a published tank. Using one subscribes to that tank.
- **What goes in a full code.** The player-or-enemy flag, and each part in layer order with its type, position, rotation, scale and twin. Twins are referenced by position in the list.
- **What stays out.** Name, author and ids travel beside the code. Tier, health, speed, reward and difficulty are calculated from the build (workstream K). Each part's radius is looked up from its type and scale, not stored.
- **The flag stays.** Weapons are registered differently for player and enemy tanks (`src/game/simulation/tank.ts`), so a build is made for one role.
- **Exact rules for numbers.** One fixed precision, allowed ranges, rotations folded into one range, and a single form of zero. The same placement must always give the same characters.
- **Part order is kept.** It is the layer order, so it is part of the build.
- **Plain and compact.** No encryption. A packed, URL-safe encoding with a format version at the front. Compression may be added on top; a build's identity is taken before compression.
- **Identity.** A hash of the canonical data identifies a build. It tells whether a library entry is unchanged, and it is the key for drawn-picture caches.
- **Classic codes.** V2 does not write them. Reading them is optional and low priority.

**Links.** A full code or a workshop reference in a URL opens the tank with "subscribe" or "copy to library", "open in editor" and "try it". Full codes need no server.

**Link preview images (later, not for launch).**

- **What it is.** A backend address that returns a PNG of a tank, so chat apps such as Discord show a picture when a link is pasted.
- **Nothing is stored.** The picture is drawn on request and cached by the CDN, keyed by the tank version and the artwork version.
- **A small page too.** A chat app reads the picture's address from the HTML of the pasted link. The workshop pages are assembled in the browser, so the backend must also serve a small page per tank link. How that is routed on the same site address was not worked out.
- **Unverified.** That the drawing code can run outside a browser, and which library turns the shapes into a PNG.

### E. Editor

A new editor at `/editor`, built on the existing editor rule modules (`src/game/simulation/editor-*.ts`, `designer.ts`).

- Full-window workspace with zoom and pan.
- Touch-friendly palette and controls. The classic creator's 20-pixel palette rows are too small for phones.
- Drafts save automatically.
- **Live stats.** A panel shows the calculated tier, size and distance to the next tier, health, speed, turn rate, weapon points used and allowed, the level from which the tank can be used, and difficulty, updating as parts are placed (workstream K). The classic sliders for an enemy's life, reward and speed are removed.
- **Test** opens the arena as the current tank and returns to the editor exactly as it was, undo history included. An unfinished design says what is missing instead of failing.
- **Only your own tanks can be edited.** A subscribed workshop tank must first be copied to the library.
- **Publish** sends the tank to the workshop. The button arrives with workstream G.

Possible later addition on wide screens: editor and live arena side by side.

### F. Test arena and quick play

**Test arena.** One field with no waves, upgrades or game over.

- **Opponents.** Spawn any tank on demand: built-in roster or library. Workshop tanks join when workstream G exists.
- **Damage.** A practice target that does not die and reports damage per hit, per second and in total.
- **Speed.** A live movement-speed readout with the tank's stats.
- **Controls.** Invulnerability, enemy fire on or off, restart, slow motion.
- **Linkable.** An arena link can carry a tank.

The engine already supports the core of this: a world can start with a chosen tank, and `spawnEnemy` in `src/game/simulation/world.ts` places a specific design at a point. A mode with waves and progression switched off is needed and has not been scoped.

**Quick play.** One click from the menu, the editor or a workshop tank starts a normal run with no setup. Every run begins as the basic tank and works up. Enemy sources are the ones used last time.

- **"Play now" on a workshop tank** subscribes to it and starts a run. The tank appears among the upgrade choices when the run reaches a level where it can be used. Driving a tank immediately is what the test arena is for.
- **Starting as another tank.** A run that begins as a chosen or random higher tank is not quick play. It could be a separate mode later. The rules agreed for it: upgrades work as in a normal run from there on, and death drops the player to the built-in default tank one tier below.

### G. Workshop

**Browse (`/workshop`).**

- **Sorts.** Newest (first published), latest updated, most used overall and most used recently.
- **Filters.** Tier and type (player tank or enemy tank). The tier filter is required.
- **Cards** show tier, the level from which the tank can be used, overall and recent use, and publisher.

**Tank page.** Live drawing, stats, the list of versions, and the actions: subscribe, copy to library, try it (arena), play now, fight it (arena, as an enemy) and report.

**Publisher page (`/workshop/u/<handle>`).**

- The publisher's tanks, one entry each however many versions, with the same sorts and filters and a total of uses.
- The author name on every card links to it.
- An owner can hide a tank from this page. The tank stays in search and in packs, and filtering by author still finds it.
- Publishers pick a unique handle the first time they publish. Discord names are not unique and some people will not want theirs shown.
- Authorship comes from the account, never from free text in a tank.

**Popularity.**

- **Use is the rating.** There are no star ratings. A tank's standing is how much it is played.
- **Two figures.** Overall use since publication, and recent use. Recent means the past 30 days (decided).
- **Versions share the figures.** A new version does not reset anything. If an update makes the tank worse or better, the recent figure shows it.
- **Easy to inflate.** A counter like this can be pushed up by a script. That is accepted for now. Cheap protections only: one use per tank per device per day, limits per address, a unique id per run so a resend is not counted twice, and a time limit on late offline reports.

**Use count.**

- **A use is a workshop tank being part of someone's run.** Once per tank per run.
- **As an enemy.** Counted when the run starts, for every tank in the enemy sources switched on for it. Whether it actually appears does not matter.
- **As the player's tank.** Counted when the player takes it on an upgrade screen.
- **Not counted.** Resuming a saved run, arena sessions, "try it", subscribing and copying.
- **The author's own runs count** like anyone else's.
- **Possible later refinement.** Count a run only after a minimum of play, such as two minutes or a few fields, so that starting and quitting does not add a use. Not planned for now: a run counts when it starts.
- **Subscribed tanks only.** A copy is the player's own tank and counts for nobody.
- **Recorded per version, shown per tank.**
- **Two kinds.** The server separates uses where the player chose the tank from uses where it came inside a pack.

**Library.**

- **Subscribed tank.** A reference to a workshop tank. It follows the latest version and cannot be edited.
- **Copy.** The player's own tank with no link to the original. It can be edited and published as a new tank under the player's name.
- **During a run** the versions in play are fixed. An update takes effect from the next run.
- **Guest.** Without login the library is kept on the device. Clearing the browser's storage clears it.
- **Account.** With login the library is tied to the account and follows the player to other devices. This arrives with the workshop backend; until then every library is a guest library.

**Publishing and versions.**

- **Publishing is explicit and permanent.** A tank built in the editor is a private draft. Nothing reaches the workshop until its maker presses Publish, and the publish step says clearly that it cannot be undone.
- **One tank, many versions.** Publishing again from a published tank adds a version (v1, v2, v3) to the same entry, so a page does not fill up with near-copies.
- **Versions never change.** Each published version is fixed for good. Older versions stay listed on the tank page.
- **Latest by default.** Cards, the tank page and subscriptions use the latest version.
- **Tier.** A new version can be a different size, so the tank is listed under its latest version's tier.
- **Limits.** A cap on new versions per tank per day.
- **Name and change log (decided).** The name belongs to the tank. Each version can carry a short note saying what changed, and the tank page shows these notes as a change log.

**Packs.**

- **Weekly top pack.** The most used tanks of the past seven days, 10 per tier with the number adjustable: up to 60 tanks across six tiers and 80 with tiers 7 and 8. One click installs it as an enemy source.
- **Ranking.** By uses in that week where players chose the tank themselves. Uses that came from a pack are left out, or pack tanks would keep their place indefinitely. Ties go to the tank with the higher overall use since publication (decided). If that is also equal, the tank published first gets the place.
- **Which version.** The latest version of each tank at the moment the pack is built. The pack keeps that version whatever is published later.
- **Schedule.** A job builds the pack every Friday at 06:00 UTC, so it is ready for the weekend. Nobody curates it by hand.
- **History.** Every week's pack is kept and stays installable. A pack stores its own copy of each tank, with the name and publisher credit as they were that week.
- **Stats.** Tanks in old packs are calculated with the current stat formulas, like every other tank.
- **Advertised.** The game and the workshop show when a new week's pack is available.
- **Offline.** Installing stores the tank data on the device.
- **Updates.** An installed pack stays as it is until updated. An auto-update option follows the current week.
- **Thin tiers.** A tier with few used tanks gets a shorter list.
- **Later.** All-time, curated and themed packs use the same mechanism.

**Stats.** Tier, health, speed, reward and difficulty are calculated on the server with the same code the browser runs (workstream K). The server never trusts a value sent by a browser. The tier it stores for filtering is a cached result, recalculated when the formulas change.

**Moderation and removal.**

- **Roles.** One owner account, Ian's. The owner appoints and removes moderators.
- **Reports.** A report button on every tank. A report alone removes nothing. A moderator confirms it first. How the report queue works in detail is not designed.
- **Removal hides, it never erases.** A removed tank disappears from listings, packs and link caches, and nobody but the owner can reach it. Its data stays on the server.
- **Everything can be undone.** Every moderator action is logged with who did it and when. The owner can restore one tank, or undo everything one moderator did in a period, in case an account is misused or taken over.
- **Limits of removal.** Copies already installed on a device cannot be recalled; the game drops them the next time it is online.
- **Account deletion.** Supported, because the server stores personal data (a Discord id and a handle) and European privacy law lets people have theirs erased. The personal details are erased for good. Published tanks stay, shown under "deleted user". This is the one case where something is truly erased.
- **Also needed.** A name filter, bans, an appeal route, and a statement of what a publisher agrees to, including that publishing is permanent.

**Data.**

- Stored: users (Discord id, handle), tank versions, reports, use counters, packs. Store as little Discord data as possible.
- Publishing and reporting need login. Browsing, subscribing and playing do not.

**Existing hook.** `CommunityTanks` in `src/game/services/extensions.ts` (search, publish, rate) is the stub the workshop client replaces.

### H. Community tanks in a run

**As enemies.** The engine already accepts custom enemy designs per run. A wave asks for an enemy by rule: tier, weapon and body points, difficulty, speed, reward, support role and health (`matchesRule` in `src/game/simulation/waves.ts`). Where a custom tank matches a rule, classic picks it or a built-in one at even odds, behind one switch (`UnitRoster`). V2 replaces the switch with an **enemy sources** screen:

- **Sources.** Toggle the built-in roster, the library, each installed pack and individual subscribed tanks.
- **Mix.** Built-in only, mixed or community only.
- **Per run.** Chosen when starting a run and fixed for that run.
- **Gaps.** A wave whose rule no enabled tank matches must fall back to a built-in tank. Today a missing match can cut a wave short.
- **Stat changes move tanks.** Because waves pick by stats, recalculating stats (workstream K) changes which tanks fit which waves, not only how tough they are.

**As the player's tank.** The upgrade screen is rebuilt.

- **Today** it offers at most three tanks: one default each for the tier below, the same tier and the tier above (`getOffers` in `src/game/simulation/world.ts`).
- **V2** shows every tank the player can use at the new level: built-in tanks, their own tanks and subscribed workshop tanks. There can be many, so the screen needs grouping by tier, scrolling and a search or favorites.
- **Usable** means the tank's tier is unlocked, its weapons are unlocked and its weapon points fit the level's budget.

### I. Further gameplay

The direction is decided. The details are designed during implementation.

**Two more tiers (7 and 8).**

- **Very large tanks.** The wide view gives room for tanks far bigger than classic's largest, with larger weapons to match.
- **Tier follows size**, like tiers 1 to 6, with a balance between tiers.
- **What it touches.** The size thresholds and the speed, armor and weapon-budget tables in `src/game/core/constants.ts` have six entries today. A run has levels 0 to 6 and must grow to level 8. The editor's workspace, the camera zoom and the enemy waves (written for tiers 1 to 6) all need to reach tier 8. Larger weapons are new parts and need new artwork.
- **Fields.** A field has one fixed size today (`FIELD_RADIUS`). Tier 8 tanks may need larger fields. A wider screen shows more but does not make the field bigger.
- **Not checked.** How the game performs with tanks of that size on a phone.

**Upgrade protection.**

- **Today.** A full health bar upgrades the tank. The new tank starts with about 1% of its new bar: 2 of 100 at level 1 and 27 of 2,000 at level 6 (`rebuildPlayer` in `src/game/simulation/world.ts`). One hit usually kills it. Death drops the player a level with the bar one point short of full, so the next pickup upgrades again and the cycle repeats.
- **Change.** In V2 an upgraded tank starts with a full health bar (workstream K). That ends the cycle.
- **No invulnerability.** The player can still be hit and can still lose the tank under heavy fire.
- **Dropped.** A temporary buffer of extra health after an upgrade was considered. With full health on upgrade it is not needed.

**Endgame.**

- **Several bosses.** Classic has one.
- **Several kinds of special field.** For example a wave arena: a field the player comes across far from the center bubble, where enemies arrive in waves.
- **New work.** The boss field is the same size as the starting field today, so larger fields and their camera behavior have to be built.
- **Community material.** Workshop tanks, packs and the higher tiers supply the enemies.

**Ideas for a future version, not committed.**

- **Community-made bosses.** A creative mode in the editor with no size, tier or stat limits, so players can build bosses as challenges for others.
- **Difficulty levels** that scale the stats of enemy tanks, the player's tank or both.
- **Arena and challenge modes** built from workshop tanks, and other new parts.

### J. Own artwork

V2 is built on its own artwork. The current stand-in artwork is kept until the rebrand.

**What exists today.** A "mock" mode that plays without the original file: translucent bubble bodies, yellow and orange weapons, drawn projectiles and synthesized sound effects, with quiet looping tones in place of music. It covers all 20 body parts and has numeric layouts for the other 73 parts.

**Work.**

- **Make it the default.** The stand-in artwork stops being a fallback and becomes what every player sees.
- **New parts.** Tiers 7 and 8 and any new weapons get artwork in the same style as they are added.
- **Shapes from numbers.** Artwork is described as shapes and colors in data, not as picture files. It then stays sharp at any size, draws identically in the browser and on a server, and costs nothing to store.
- **Sound.** Own sound effects, built on the synthesized ones.

**The original game file.**

- **Music.** A player can load the original file to get its music. Without it the game plays the placeholder tones.
- **Nothing else.** V2 does not show the original artwork. The code that reads artwork from the file is removed from V2 after the code modernization phase, together with the tests that need it. Only the part that reads the music stays, after a check of what it depends on.

### K. Stats from the build

A tank's stats are calculated from its parts. Nobody types them in, and no tank code or workshop record can override them. The only exception is the game's own bosses, whose stats are set by hand.

**How it works today.**

- **Tier.** The editor calculates it: the area the body parts cover, counted in pixels of the drawn artwork against five thresholds (`measureClass` in `src/game/assets/class-measurement.ts`, `CLASS_PIXELS` in `src/game/core/constants.ts`). Imported codes and built-in tanks carry a stored tier that is trusted as it is. Weapons do not set the tier; the tier limits how many weapon points a tank may carry.
- **A player tank's speed and armor** come from its tier. Its turn rate follows its speed.
- **A player's health bar** comes from the run's level, not from the tank: 50, 100, 170, 250, 400, 800 and 2,000 for levels 0 to 6 (`MAX_LIFE`).
- **An enemy's life, reward and speed are typed in** by the creator, within 1 to 1000, 1 to 500 and 0 to 4.
- **The editor already suggests values.** Its formula uses body points, weapon points and tier (`creatorSuggestedStats` in `src/game/core/creator-enemy-stats.ts`).
- **Difficulty** is calculated from speed, weapon points, life and reward, and waves pick enemies by these numbers.

**How the built-in enemies compare with the editor's suggestion.** Measured on the 43 built-in enemy tanks, using the formula as the editor's panel shows it:

| Stat | Follows the suggestion | Detail |
| --- | --- | --- |
| Life | Closely (correlation 0.95) | 9 of 43 match exactly. The typical tank has about 80% of the suggested life, ranging from 40% to 190%. |
| Reward | Closely (0.95) | 13 of 43 match exactly. |
| Speed | Loosely (0.60) | 19 of 43 match exactly. In tiers 2 and 3 the built-in tanks are much slower than suggested: a typical 0.9 against 2.3, and 0.5 against 1.45. |

So the existing suggestion is a reasonable starting formula for life and reward, and speed needs a new fit. A close correlation does not show that the campaign's balance survives the change; that has to be played.

**Work.**

- **One stats function.** It takes a build and returns size, tier, health, speed, turn rate, reward, weapon points and difficulty. It uses numbers only, so the editor, the game, the server and the tests all get the same answer.
- **Size without artwork.** The area covered by the body parts is calculated from their outline numbers on a fixed grid, so every machine gets the same result. Overlapping bubbles count once. Delivered in phase 2 of section 5.
- **Tiers of existing tanks.** The new size calculation will not match the old pixel count exactly. Before it is adopted, measure all 75 built-in tanks and see which would change tier. Thresholds can be adjusted, but if the new sizes put tanks in a different order, some will change tier. That is acceptable, since built-in tanks are recalculated anyway.
- **Health** from the number and size of bubbles, for player and enemy tanks alike.
- **Speed and turn rate** from size and weight: bubbles and weapons both slow a tank down.
- **Reward** from how hard the tank is to beat.
- **One system, two roles.** The same build analysis serves player and enemy tanks. Where the roles differ today (weapon handling, player armor), the difference stays explicit until it has been worked through.
- **Abusive builds.** Calculated stats do not make every build fair. Stacking many bubbles on one spot would give health without size, and scattering tiny bubbles would give size without substance. The formulas are tested against such builds.
- **Starting values.** Fit the formulas to the built-in tanks first, then tune.
- **Built-in tanks follow the formulas.** 34 of the 43 built-in enemies have a life that differs from the editor's suggestion, so the campaign's balance changes at that point and the recorded runs are re-recorded with it.
- **Bosses.** The game's own bosses keep hand-set stats. Published tanks never can.

**Health and growth.** In classic one bar does two jobs: it is the tank's health, and filling it upgrades the tank. V2 splits them.

- **Health bar.** Its length comes from the tank. Damage removes health and nothing else.
- **Growth bar.** It fills from collected bubbles. When it is full the tank upgrades. Hits never reduce it. Its length depends on the run's level; the starting values are today's bar lengths (50, 100, 170, 250, 400, 800 and 2,000).
- **Upgrade.** The new tank starts with full health and an empty growth bar.
- **Health reaches zero.** The tank is downgraded one level. The earlier tank starts with full health and an empty growth bar.
- **At the lowest level** there is nothing to downgrade to. Classic moves the player to a neighboring field with one point of health. What V2 does there is settled during implementation.

**How bubbles are shared.** Enemies drop bubbles worth their reward, and each bubble heals by its value today. With two bars there are several ways to use them:

| Scheme | How it works | Effect |
| --- | --- | --- |
| Health first (chosen) | Bubbles refill health. Once health is full they fill growth. | Simple and closest to classic. Taking damage slows progress, because bubbles go to repairs first. |
| Both at once | Every bubble adds to health and to growth. | Progress never stalls. Getting hit costs less, and runs go faster unless the growth bars are lengthened. |
| Two kinds of bubble | Healing bubbles and growth bubbles, in different colors. | The player chooses what to go for. Needs new pickup artwork and rules for what enemies drop. |
| Self-repair | Health slowly returns when the tank has not been hit for a few seconds. All bubbles go to growth. | Retreating becomes a tactic. Changes the feel of combat the most. |

The first scheme is the starting point. The others can be tried in the test arena if progress feels too slow or too punishing.

**Versions.** Three things change independently and each carries a version number: the tank code format, the stat formulas and the artwork. A published version fixes the build. Its stats follow the current formulas, which is why a retune can change how an old pack plays. Saved runs record the formula version they started with.

**Tier, level and weapons.** Tier is size alone. What a player may use in a run depends on the run's level, and classic already works this way:

- **Levels.** A run has levels 0 to 6.
- **Sizes offered.** On an upgrade the player is offered tanks one tier smaller, the same tier and one tier larger (`upgradeClasses` in `src/game/core/upgrade-offers.ts`). Larger tiers open as the level rises: tier 3 from level 2, tier 4 from level 3, tier 5 from level 4 and tier 6 from level 5.
- **Weapon points.** The budget depends on both tier and level (`GUN_BUDGET` in `src/game/core/constants.ts`). At level 6 a tier 1 tank carries 13 points and a tier 6 tank 25.
- **Weapon unlocks.** 40 of the 93 parts unlock at a level, and 40 need a minimum or maximum tank size (`tier` and `classCost` in `src/game/data/parts.json`).

So a small tank with late-game weapons is already possible, within its smaller budget. V2 keeps this model and extends it to level 8 and tier 8.

## 7. Requirements across workstreams

- **Phones.** The target is a mid-range phone. Ian's high-end iPhone is the main test device, so iPhone Safari and an installed copy are tested throughout. Frame-time, memory and download-size limits are set once the wide view runs on a phone, and large tanks and large enemy sources are part of that test. Browser emulation is not enough: sound, graphics-context loss and the editor's touch controls are checked on real devices.
- **Accessibility.** Menus, the editor and the workshop are usable by keyboard with a visible focus. Text has enough contrast. A setting reduces flashes and screen shake.
- **Works without the backend.** The game, the editor and installed packs keep working when the server is down or the device is offline.
- **Rebrand and rights.** V2 goes public as its own website under a new name. The stand-in artwork still uses part names, texts, layouts and colors taken from the original game (`NOTICE.md`). The rebrand replaces the name, the artwork and those texts. It includes a review of what remains from the original, and the terms under which players publish tanks. The contact standing with Hero Interactive is not recorded in this plan.

## 8. Order and dependencies

1. **Split** (section 3). Ian's step, after classic is wrapped up.
2. **Safety net** (section 5, phase 1).
3. **Self-contained rules** (phase 2). Small deliberate rule changes; includes the size calculation.
4. **Recorded runs** (phase 3).
5. **Code modernization** (phase 4). Nothing visible changes.
6. **Foundations:** the app frame, starting without the original file, the V2 profile, and **K. Stats from the build** with the health and growth bars. K comes early because the editor, the tank code and the workshop all depend on it.
7. **A. Fill the screen, sharp.**
8. **B. Controls and mobile**, together with **C. Save and resume** and a basic test arena for tuning handling.
9. **Community track**, which needs no server until its last step and can run in a separate thread alongside steps 7 and 8:
   1. D. Tank renderer, codes and links
   2. E. Editor
   3. F. Full test arena and quick play
   4. H. Enemy sources and the new upgrade screen, with library tanks
   5. Backend, then G. Workshop and packs, which also brings Publish, subscriptions and workshop tanks into E, F and H
10. **I. Further gameplay:** tiers 7 and 8, then the endgame.
11. **Rebrand and public launch:** the new name and website, the artwork overhaul, new texts and the rights review. Where the site lives is decided then.
12. **Later:** link preview images, community-made bosses, difficulty levels.

**J. Own artwork** runs alongside from step 6: the stand-in artwork becomes the default, the music loader is kept, and new parts get artwork as they are added. The original-artwork code is removed after step 5.

Delivery follows the five-PR stacks in `docs/delivery.md` unless that policy is changed for V2.

## 9. Open questions

No larger question is open.

The smaller proposals were all confirmed on 2026-11-14: the 30-day recent window, the aim-reach limit, names with a per-version change log, and weekly-pack ties going to the tank with the higher overall use.

Left for the implementation phase, by decision: the balance between tiers, the size and weapons of tiers 7 and 8, the design of the bosses and special fields, how the report queue works, and where the V2 website lives.

## 10. Not verified

- Pass rates and run times of the existing tests.
- The browser test counts as executed, and the text counts of stage-size references.
- Whether the bot and the engine run identically inside and outside a browser once phase 2 is done, and how fast.
- Which built-in tanks change tier under a size calculation without artwork.
- Whether any rule treats off-screen enemies as inactive.
- Pixi's default filter resolution, graphics-context recovery, and fullscreen on current iPhones.
- Whether the drawing code can run on a server.
- Performance of tier 8 tanks on a phone.
