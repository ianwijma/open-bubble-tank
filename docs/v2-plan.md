# Open Bubble Tank V2: modernization plan

**Status: plan only. Nothing here is implemented.** Written 2026-11-13 from planning discussions with Ian and from reading the code at commit `12bf09d`. No tests or game code were run for this plan. Counts and comparisons come from reading the source and data files. Code references describe that commit and may drift.

## 1. What V2 is

V2 is a modern successor to the faithful recreation ("classic"). Classic reproduces Bubble Tanks 3 as it was: a fixed 550×450 stage, desktop keyboard and mouse, and the original rules. V2 keeps the engine and changes whatever makes the game better to play today.

Goals, in priority order:

1. The game fills the screen and stays sharp at any size.
2. It plays well on a phone.
3. A community forms around it: people build tanks, share them, and fight each other's designs.
4. Gameplay is improved where the original is awkward. V2 is not bound by the "faithful, not reinterpretation" rule.

V2 is built on its own artwork, so it starts and plays without the original game file. The original file becomes an optional add-on (workstream J).

Out of scope: payments of any kind. The workshop is a free gallery. Original artwork belongs to Hero Interactive and is never bundled, uploaded or hosted (see `NOTICE.md`).

## 2. Decisions

Each entry is marked **decided** (Ian confirmed it), **proposed** (recommended in discussion, not yet confirmed) or **open**.

| Topic | Decision | State |
| --- | --- | --- |
| Relation to classic | Tag classic in git and deploy it at a separate address. V2 takes over `master` and the current address. | Decided |
| When V2 starts | After the classic implementation is wrapped up, on a date Ian chooses. Ian handles the classic release. Neither is part of this plan. | Decided |
| Test safety net | Before V2 changes anything, tests pin what the game does today, both in the rules and in the browser. | Decided |
| Code modernization phase | After the safety net, the code is restructured so it can take the V2 changes. Nothing the player can see changes in this phase, and the tests prove it. | Decided |
| Artwork | V2 is built on its own artwork and needs no original game file. The current stand-in artwork is kept for now. An overhaul can follow at the end of V2. | Decided |
| Original artwork in V2 | Not used. New parts and tiers have no original artwork, so V2 shows its own throughout. Classic remains the place for the original look. | Proposed |
| Music | Players can still load the original game file for its music. | Decided |
| Artwork in tests | CI uses V2's own artwork only. Tests with the original artwork are an optional extra on a developer's machine. | Decided |
| Screen | The game fills the window and shows more of the field. No letterboxed box. | Decided |
| Order | Widescreen before mobile, because phones are wide and need the same view and HUD anchoring. | Decided |
| Frontend hosting | Vercel, at the existing custom domain. | Decided |
| Backend hosting | A small rented VPS, built so it can move to another host later. Not Vercel (cost). | Decided |
| Workshop location | Subpages of the same site, not a separate domain. | Decided |
| Login | Discord. | Decided |
| Tank images | None stored. The server holds tank data only. In the game and the workshop every tank is drawn in the browser. | Decided |
| Link preview images | The server has an address that takes a tank code and returns a picture of that tank, drawn on request and not stored. Left for later, not part of the launch. | Decided |
| Workshop sorts | Newest, top rated and most used. | Decided |
| Tier filter | Required in the workshop. | Decided |
| What "tier" means | The tank's class, currently 1 to 6. | Decided |
| Tier is calculated | A tank's tier is worked out from its build and is never a stored value. | Decided |
| What sets the tier | The tank's size alone. Size also limits how many weapon points a tank can carry. | Decided |
| Unlocks in a run | The run's level decides what is available: each level-up unlocks the next tier and more weapons, up to tier 8 at level 8. A small tank may carry a weapon unlocked at a high level. | Decided |
| Stats come from the build | Life, speed, turn rate and reward are calculated from the parts: few small bubbles make a light, fast tank, and many large bubbles and weapons make a tough, slow one. The creator no longer types them in. | Decided |
| Starting values for stats | Fitted to the stats of today's built-in tanks, then tuned through play. | Decided |
| Built-in tanks | Recalculated with the same formulas as every other tank. | Decided |
| Stats in the editor | The editor shows the calculated stats live while building. | Decided |
| More tiers | Two more, 7 and 8, for very large tanks with larger weapons. Balance is worked out during implementation. | Decided |
| Endgame | Several bosses and several kinds of special field, such as a wave arena found far from the center. Details are designed later. | Decided |
| Publisher pages | Public page per publisher listing all their tanks. | Decided |
| Use count | Counted once, when a run starts, for every tank chosen for that run as the player's tank or as an enemy. Nothing later in the run counts, and resuming a saved run does not count again. Arena sessions, "try it" and library adds do not count. | Decided |
| Weekly pack | Top 10 enemy tanks per tier, installable in one click. Other "top X" packs later. | Decided |
| Weekly pack ranking | Ranked on individually chosen uses plus ratings, excluding pack-driven appearances. | Decided |
| Weekly pack schedule | Built automatically every Friday morning (UTC), so the new pack is ready for the weekend. Past weeks stay playable, and the current week is advertised in the game. | Decided |
| Weekly pack hour | 06:00 UTC on Friday. | Proposed |
| Tank code | V2 gets a new deterministic code: the same build always produces the same code. | Decided |
| Publishing | A tank is private until its maker publishes it. | Decided |
| Versions | A published tank is one entry with versions. Each published version never changes. A new version is added to the same entry, and the latest is shown by default. | Decided |
| Tanks in packs | A pack holds the exact version that earned its place. Later versions never replace it, and it still credits and links to the author. | Decided |
| Unpublishing a tank that is in a pack | It leaves the workshop listing, but past packs keep their copy and credit. | Proposed |
| Community enemies | Supported, with the player choosing which sources appear. | Decided |
| Save and resume | Required. Quitting must not force a restart. | Decided |
| Save method | Checkpoints, not an exact freeze-frame. Clearing a field always saves. | Decided |
| Quick switching | Jump between editor, test arena, workshop and game without reloading. | Decided |
| Mobile controls | Twin-stick: one side of the screen moves, the other aims. | Decided |
| Tank facing | The classic rule stays: classes 1 to 3 face the aim, classes 4 to 6 turn with their movement. The aim (mouse or aim stick) points the turrets. Turning the hull toward the aim was considered and dropped. | Decided |
| Diagonal speed | One top speed in every direction, for keys and sticks alike. Keyboard diagonals become slightly slower than in classic. | Decided |
| Key bindings | Every action can be rebound, including to mouse buttons. Secondary fire stays on Space by default. | Decided |
| Aim assist | Touch and gamepad only, with an off switch. | Decided |
| Pause, upgrade and win screens | Drawn as panels over the live game view, dimmed behind them, in place of classic's frozen 550×450 picture. | Decided |
| Quick play | Starts a normal run at once, as the basic tank, working up. | Decided |
| Upgrade protection | A fresh upgrade cannot be lost to a single hit. The new tank gets a health cushion, a short protected period, or both. The numbers are proposed in workstream I. | Decided |

## 3. Split from classic

1. When the classic implementation is wrapped up, Ian tags that commit (for example `classic-1.0`) and creates a `classic` branch from it for later hotfixes.
2. Ian deploys the `classic` branch at a separate address.
3. `master` becomes V2 and keeps the current address.
4. The first V2 commit rewrites `AGENTS.md` and `goals.markdown`. Both currently state that the goal is faithful recreation, which would steer V2 work wrong. `docs/fidelity.md` stays as the record of classic.

V2 work starts after steps 1 and 2. Classic is not this plan's concern from then on.

**Tests.** The existing tests come along and are extended before any V2 change is made. Section 5 covers how they are used and when a test may be changed or retired.

## 4. Architecture and hosting

### One app frame

Classic is a single screen-state machine inside `GameShell`. V2 becomes several pages under one persistent frame that holds what must survive navigation: loaded art, audio, the profile and the "current tank".

| Route | Purpose |
| --- | --- |
| `/` | Menu and the game (campaign, quick play) |
| `/editor` | New tank editor |
| `/arena` | Test arena |
| `/workshop` | Browse community tanks |
| `/workshop/t/<id>` | One tank |
| `/workshop/u/<handle>` | One publisher |

Moving between pages must not reload art or lose the tank being worked on.

### Artwork and the original game file

V2 opens straight into the game with its own artwork. There is no file to pick first, which matters most on phones. Today every page load starts at a screen asking for the original SWF.

The original file is an optional add-on in the settings, loaded for its music. When a player supplies it, V2 remembers it on the device, with a "forget file" control. Workstream J covers what the add-on provides.

### Frontend

A client-side app on Vercel. Workshop pages fetch from the backend in the browser, which keeps Vercel usage to static delivery.

### Backend

One container on a small VPS, at an `api.` subdomain of the game's domain so login cookies work across both.

Built to be movable:

- **Web framework that runs anywhere.** Hono runs on Bun, Node and Cloudflare Workers.
- **Thin SQL layer in the SQLite dialect.** Drizzle works with Bun's SQLite, Cloudflare D1 and Postgres, so changing database host is an adapter swap.
- **Nothing kept on the machine.** Sessions live in the database or signed cookies. No local files.
- **Scheduled jobs as plain commands** (backups, count roll-ups, weekly pack build).
- **Configuration by environment variables.**

It lives in this repository so it can reuse the game's design validation.

Scaling while on the VPS: put Cloudflare's free tier in front from the start to cache public read endpoints for a short time, and batch play counts. If the VPS is outgrown or becomes a chore, the realistic move is Cloudflare Workers with D1.

## 5. Safety net and code modernization

Two phases come before any V2 feature. First, tests pin what the game does today. Then the code is restructured to take the V2 changes while those tests stay green. V2 features start only after both.

### What exists today

Counted from the files at commit `12bf09d`. Nothing was run for this plan, so pass rates and run times are unknown.

- **Rule tests.** 884 tests in 136 files under `tests/`, run by `bun run check`. They exercise the engine (simulation, rules, data, asset parsing) without a browser. None of them import a React component.
- **Browser tests.** 290 tests in 114 files under `e2e/`, run by `bun run test:e2e` one at a time against a production build.
- **CI.** Runs the format check, the rule tests and only the browser tests with "mock" or "synthetic" in their title, which is about 132 of the 290 by a count of titles. The rest do not run in CI. Most of them need the original SWF, which is never committed, so they run only on a machine that has the file.
- **A full playthrough.** A bot plays a fresh game through to the boss and the win screen from a fixed random seed (`tools/playthrough/`, `e2e/playthrough.spec.ts`). It checks broad outcomes such as "won" and "reached every level", not the exact course of the run.
- **Not present.** Coverage measurement, a linter, and fixed versions for three development dependencies (`@playwright/test` and the type packages are set to `latest`).

### Gaps

1. **Nothing pins a whole run exactly.** The tests check individual rules and layouts. A restructure of `World` (1,359 lines) could change the order of one random draw, alter every later encounter, and still pass them all.
2. **Many tests pin the classic presentation.** 39 of the 114 browser test files refer to the 550×450 stage or the original-size switch, and V2 replaces those screens on purpose. A failing test must say clearly whether something broke or something was meant to change.
3. **Tests with the original artwork do not run in CI.** This is accepted: V2 is built on its own artwork, so CI tests that. The original-artwork tests remain an optional run on a machine that has the file.
4. **Nothing covers what V2 adds:** other window shapes, touch, gamepad, save and restore, the new tank code, the backend.
5. **Coverage is unknown.** Nobody has measured which engine code no test reaches.

### Phase 1: safety net

- **Baseline.** Run every test once, including the original-artwork ones on a machine that has the file. Record what passes, what is flaky and how long it takes. Flaky tests are fixed or set aside with a note, so that a red result later means something.
- **Recorded runs (the main guard).** The simulation is seeded and takes one input record per frame (`World.step`, `InputFrame`), so a run can be replayed exactly. Record a set of runs as seed plus inputs, and store a short fingerprint of the world state every few frames. A test replays each run and compares fingerprints. Any change that alters a single shot, spawn or random draw fails, and the test reports the first frame that differs.
  - Sources: the existing bot on several seeds, plus short targeted runs for each tank class, each weapon family, the boss, death and downgrade, field crossing, and custom enemy tanks in the roster.
  - These should run without a browser in seconds. The bot's code looks browser-free, but this was not tried.
  - Re-recording is one explicit command. A change that re-records must say why in its description.
  - They guard the simulation only, not drawing or sound.
  - They are recorded with V2's own artwork loaded. Today the loaded artwork can affect rules such as a tank's measured size, so a recording made with one set may not replay with the other. Workstream K removes that dependence.
- **Coverage map.** Measure which engine code the rule tests reach (`bun test --coverage`) and add tests where V2 will cut deepest: movement and facing, input, the profile, wave and roster selection, the tank code.
- **Player journeys in the browser.** A small set of end-to-end tests written as what a player does, with V2's own artwork so they run in CI:
  - Start a game, play, pause, upgrade, clear a field, quit and continue.
  - Build a tank in the editor, save it, load it, export its code and import it again.
  - Change settings and key bindings, reload the page and find them kept.
  - Journeys reach the page through shared helpers. When V2 replaces a screen, the helpers change and the journey stays.
- **Sort the tests.** Mark each test file as **engine** (rules that V2 keeps) or **classic presentation** (exact layouts, pixel comparisons, the 550×450 stage). The mark decides what a failure means in the V2 phase.
- **CI.** Add the recorded runs and the journeys to CI. Fix the versions of the development dependencies, so a tool update cannot change results in the middle of a restructure.

### Phase 2: code modernization

The code is restructured so each V2 workstream has a place to attach. Each item keeps today's behavior as its default.

| Change | Prepares |
| --- | --- |
| **One source for the stage size.** The numbers 550, 450, 275 and 225 appear on about 70 lines across 28 source files (a text count, so a few may be unrelated). Replace them with two named things: the simulation box and the visible area. Both start at 550×450. | A |
| **One place that decides sharpness.** Canvas resolution and the size artwork is drawn at come from one service, set to today's values. | A |
| **Split the asset loader.** `src/game/assets/asset-pack.ts` (1,567 lines) is separated into reading the original file, the stand-in artwork, drawing and caching, so the stand-in artwork no longer depends on the file reader. | A, D, J |
| **Input as actions.** Devices produce the same per-frame input record the simulation already takes. Keyboard and mouse become the first device, with identical output. | B |
| **Handling and class tables as data.** Speed, armor and size tables stop assuming six classes. Values stay the same. | B, I, K |
| **World state separated from world logic.** State becomes plain data that can be written out and read back. | C |
| **Profile versions.** Replace "unknown version, reset everything" with step-by-step upgrades between versions. | C |
| **Tank code behind one interface** with a format version, so a second format can be added. | D, G |
| **Module boundaries enforced by a linter.** Rendering, browser services and simulation are separate by convention today. A lint rule makes a wrong import fail the build. | All |

**Rules for this phase.**

- **Every test stays green, including the classic presentation tests.** Nothing visible changes, so nothing should fail.
- **No recorded run is re-recorded.** A change that needs a re-record alters behavior. It is taken out and handled as a V2 change later.
- **Bugs found are written down, not fixed in passing.** A fix changes behavior and gets its own change.
- **Code that V2 replaces is left alone.** The classic editor and tank viewer screens (`tank-creator.tsx`, `tank-viewer.tsx`, about 2,000 lines together) are replaced in workstream E, so restructuring them is wasted work. Their engine-side rules (placement, selection, validation) are kept and covered.
- **Scope is the table above.** Restructuring for its own sake is out. This phase shows the player nothing, so it must stay short.

**Done when** every item in the table is in place with classic defaults, CI is green, one full local run with the original artwork also passes, and a manual play session finds no difference.

A useful check falls out of the world-state item: save a recorded run halfway, restore it, continue, and compare fingerprints with the uninterrupted run. That works only for state that is saved exactly. Checkpoint saves (workstream C) restore less, and need their own tests.

### During the V2 workstreams

- **Engine tests and recorded runs** must stay green unless the change is meant to alter the rules. Then the test or recording is updated in the same change, with the reason stated. The single top speed (workstream B) is the first known case.
- **Classic presentation tests** are retired when their screen is replaced. Each retirement is named in the change that causes it, and the replacement screen gets a journey or its own tests.
- **The wide view is a good example.** The simulation keeps its 550×450 box, so the recorded runs should pass unchanged through workstream A. If they do not, the wide view has leaked into the rules.

**Tests each workstream adds.**

| Workstream | New tests |
| --- | --- |
| A. Fill the screen | Browser runs at several window shapes and pixel densities (16:9, ultrawide, phone both ways). Canvas size matches the window, the HUD stays inside the view, artwork is drawn at least as large as it is shown. |
| B. Controls and mobile | Each device produces the expected input record. Touch journeys with an emulated phone. Bindings survive a reload. |
| C. Save and resume | Save, reload the page, resume. One stored example of every older profile version upgrades correctly. A damaged save is reported, not silently discarded. |
| D. Tank renderer and code | The same build gives the same code every time. Encode then decode returns the same build. All 75 built-in tanks import from their classic codes. Stored code and hash examples, so the format cannot drift unnoticed. Invalid codes are rejected cleanly. |
| G. Workshop and backend | API tests against a throwaway database. The weekly pack build with a fixed clock. The link preview address returns the same picture for the same code. |
| H. Community enemies | Recorded runs with each source mix. |
| K. Stats from the build | Every built-in tank keeps its tier under the new size calculation. The browser and the server return identical stats for the same build. Stored examples of build and stats, so a formula change is always deliberate. |

## 6. Workstreams

### A. Fill the screen, sharp

**Why it is blurry today.** Three layers each bake in a pixel size:

1. The stage is stretched by a CSS `transform: scale()` (`src/components/game-shell.tsx`, the `ResizeObserver` effect), so every canvas is enlarged as a bitmap.
2. The game canvas is 550×450 at 1× or 2× (`src/game/render/pixi-renderer.ts`, `init`). Fullscreen needs about 2.4× at 1080p and 4.8× at 4K, before device pixel ratio.
3. Every vector shape is rasterized once at 2× (`rasterSvg` in `src/game/assets/asset-pack.ts`), and textures have no per-scale variants (`src/game/render/swf-textures.ts`).

Screens built from DOM `<img>` elements already use SVG URLs and stay sharp.

**Work.**

- **Render scale.** One service publishes the scale (stage scale × device pixel ratio, stepped and capped). The main renderer and the other Pixi apps (menu, credits, portraits, creator artwork) resize to it.
- **Sharp textures.** V2's own artwork is made of shapes described by numbers, so it is drawn at whatever size the screen needs (workstream J). Display textures are drawn on demand at the needed size, cached by scale, capped by GPU texture size and a memory budget, with mipmaps for zoom-out.
- **Keep the 2× mask.** Tank class is measured by counting pixels of the 2× rasters (`captureClass` in `src/game/assets/class-measurement.ts`). Changing that resolution could move a tank across a class threshold, so measurement and hit masks stay at 2× regardless of display size.
- **Filters.** Glow kernels assume one texel per stage pixel (`src/game/render/swf-glow-filter.ts`) and must scale with resolution. Verify whether Pixi 8.22 runs the other filters (alpha, color matrix) at 1× by default; this was not checked.
- **Wide view.** The canvas takes the window's shape. The simulation keeps its 550×450 box centered inside it, because some rules compute in stage pixels around (275,225): Enemy Spike hits (`src/game/simulation/spikes.ts`), twip rounding (`src/game/simulation/actor-parents.ts`) and whip effects (`src/game/simulation/whip.ts`).
- **HUD anchoring.** Minimap and edit slider top-left, life bar bottom-left, weapon panel top-right, pause bottom-right. On phones the life bar moves out of the thumb zone (workstream B).
- **Radar.** The off-screen test is the 550×450 box (`src/game/core/tactical-hud.ts`) and must use the real visible area.
- **Backgrounds and effects.** The particle background, flashes, ink and screen effects are built for 550×450 and must cover the full view.
- **Pause, upgrade and win screens.** In classic each of these freezes a 550×450 picture of the game, blurs it and puts a fixed-size panel on top. That picture does not fit a wide window. V2 keeps the live game view, dims it and centers a panel over it.
- **Smooth motion.** The loop steps the simulation at 50 per second and draws once per display frame with no interpolation (`src/game/services/stage-runtime.ts`), which judders on 60, 120 and 144 Hz screens. Add optional interpolation in the renderer.
- **Memory and load time.** Each raster keeps a canvas, a full pixel copy and its SVG string, and loading rasterizes everything in sequence on the main thread. Drop eager pixel copies, rasterize editor art lazily, and report progress throughout.

A longer side effect of the wide view: the aim point can sit farther from the tank, so teleport parts reach farther. The existing zoom setting already has this effect.

### B. Controls and mobile

**How movement and aiming work today.**

- **Heavy tanks face where they move.** Classes 1 to 3 face the cursor. Classes 4 to 6 turn the hull toward their velocity (`controlPlayerDirection` in `src/game/simulation/player-direction.ts`). Their turret weapons track the cursor on their own (`weaponAimFlags` in `src/game/core/weapon-aim.ts`); weapons fixed to the hull fire along it.
- **The turn is slow.** Turn rate is speed ÷ 4 degrees per frame. At full speed that is about 34° per second for class 4 and 22° for class 6, and zero when stationary.
- **Tanks are floaty.** In `movePlayer` (`src/game/simulation/world.ts`), each axis accelerates by 0.6 × class speed per frame up to 6 × class speed, and coasts down by only 0.09 per frame. A class 1 tank takes about 1.2 seconds to stop.
- **Diagonals are faster.** Axes are independent, so diagonal movement is about 40% faster than straight movement.

**Work.**

- **Input layer.** Keyboard, mouse, touch and gamepad become sources feeding one movement vector, one aim point and the fire states. Today `src/game/core/input.ts` reads DOM events directly; touch can aim and fire but cannot move, and there is no gamepad support.
- **Facing.** Unchanged from classic. Movement steers the hull on classes 4 to 6, and the aim points the turrets. On classes 1 to 3 the aim turns the whole tank, as it does today.
- **Handling values.** Acceleration, braking, top speed and the hull's turn rate are calculated from the tank's build (workstream K) and shown in the editor. The starting values reproduce today's handling, and tuning happens through play in the test arena.
- **One top speed in every direction.** Required for analog sticks, and applied to the keyboard too so all devices play alike.
- **Key bindings.** Today six keys can be rebound (four directions, pause and lock). Secondary fire is fixed to Space and primary fire to the left mouse button (`src/game/core/input.ts`). V2 makes every action rebindable to a key or a mouse button: movement, primary fire, secondary fire, pause, lock and map. Defaults stay as they are, including Space for secondary fire. Binding the right mouse button requires suppressing the browser's context menu over the game. Gamepad buttons are rebound on the same screen, and conflicting bindings are flagged.
- **Touch.** Floating twin sticks: each appears where the thumb lands in its half of the screen. Left moves, right aims, with a swap option. Primaries fire while the aim stick is held. A button beside the aim thumb fires the secondary. Teleport distance follows how far the aim stick is pushed.
- **Gamepad.** Left stick moves, right stick aims, triggers fire primary and secondary.
- **Aim assist.** Touch and gamepad only. Pulls the aim gently toward the nearest enemy in a narrow cone. Can be switched off.
- **Mobile page behavior.** Viewport settings, safe-area insets, no scroll or zoom gestures on the stage, landscape and portrait layouts, and tap equivalents for hover-only interface elements.
- **Audio.** Move from `HTMLAudio` elements (`src/game/services/audio.ts`) to WebAudio. iOS ignores element volume and handles many simultaneous elements poorly. This also enables volume sliders.
- **Installable and offline.** Manifest, icons (the unused ones in `assets/branding`) and a service worker.
- **Resilience.** Recover from a lost graphics context, which phones cause when backgrounding a tab. Whether this is handled today was not checked.
- **Full screen on iPhone.** The element fullscreen API has historically been unavailable in iPhone Safari, which is why installation matters. Check against current iOS.

### C. Save and resume

Classic's "Continue" restores design progression only. V2 must resume the run.

**Checkpoints.**

- **Saved.** The tank and progression, the map, every field's surviving enemies with health and positions, run statistics, the random-number state and the enemy sources in use, including the data of any community tanks so a resume works offline.
- **Not saved.** Shots in flight and running effects.
- **When.** On entering or clearing a field, on pause, and when the tab is hidden or closed.
- **Resume.** "Continue" returns the player to the field they were in.
- **After a game update.** A save that no longer matches falls back to restoring progression only.

An exact freeze-frame was not chosen: it would need every timer and effect in the engine to be storable. The first task is an audit of the world state to confirm that everything in the "saved" list can be stored and restored.

**Profile safety, same workstream.** The profile lives in `localStorage` and a version mismatch silently resets it (`loadProfile` in `src/game/services/profile.ts`). Add migrations and whole-profile export and import. Run saves and installed packs need larger storage than `localStorage`.

### D. Tank renderer and share links

- **Shared renderer.** One off-screen renderer draws any tank from its data and hands the picture to a card. Browsers limit the number of graphics contexts, so one per card would fail. Parts of this exist in the classic tank viewer.
- **Lazy and cached.** Cards render as they scroll into view and are cached by tank and size.
- **Still, then animated.** A still pose first; animation on hover or tap.
- **Art.** V2's own artwork, so a tank looks the same to everyone.
- **Runs outside the browser.** The part that turns tank data into shapes has no browser dependency, so the server can use the same code for link preview images.
- **Share links.** A tank code in the URL opens a tank page with "add to library", "open in editor" and "try it". The original tank-code format already exists (`src/game/services/tank-code.ts`), so this needs no server.

**Link preview images (later, not for launch).**

- **What it is.** An address on the backend that takes a tank code and returns a PNG of that tank. Chat apps such as Discord fetch it to show a picture when a tank link is pasted.
- **Nothing is stored.** The picture is drawn on request with V2's own artwork and cached by the CDN in front of the server. The same code always gives the same picture, so it can be cached for as long as the artwork does not change.
- **Code or id (proposed).** The address accepts a tank code, and also a workshop tank id. A large tank's code can be too long for an address, and a published tank never changes, so its id is equally safe to cache.
- **The link needs a small page too.** A chat app reads the picture's address from the HTML of the pasted link. The workshop pages are assembled in the browser, so the backend must also serve a small page per tank link that names the title and the picture. How that page is routed on the same site address was not worked out.
- **Shorter codes first.** A large tank's code is long. The V2 code is already packed, and it can be compressed further before this is built.
- **Abuse limits.** Drawing costs processor time, so the address needs a part-count limit and rate limits.
- **Unverified.** That the current drawing code can run outside a browser, and which library turns the shapes into a PNG on the server.

### E. Editor

A new editor at `/editor`, built on the existing editor rule modules (`src/game/simulation/editor-*.ts`, `designer.ts`).

- Full-window workspace with zoom and pan.
- Touch-friendly palette and controls. The classic creator's 20-pixel palette rows are too small for phones.
- Drafts save automatically.
- **Test** opens the arena as the current tank and returns to the editor exactly as it was, undo history included. An unfinished design says what is missing instead of failing.
- **Play now** starts a quick-play run with the tank in its lineup (workstream F).
- **Live stats.** A panel shows the calculated tier, size and distance to the next tier, life, speed, turn rate, weapon points used and allowed, and difficulty, updating as parts are placed (workstream K). The classic sliders for an enemy's life, reward and speed are removed.
- **Publish** sends the tank to the workshop.
- **Remix** opens any workshop tank as a new draft that credits the original.

Possible later addition on wide screens: editor and live arena side by side.

### F. Test arena and quick play

**Test arena.** One field with no waves, upgrades or game over.

- **Opponents.** Spawn any tank on demand: built-in roster, library or workshop.
- **Damage.** A practice target that does not die and reports damage per hit, per second and in total.
- **Speed.** A live movement-speed readout with the tank's stats.
- **Controls.** Invulnerability, enemy fire on or off, restart, slow motion.
- **Linkable.** An arena link can carry a tank.

The engine already supports the core of this: a world can start with a chosen tank, and `spawnEnemy` in `src/game/simulation/world.ts` places a specific design at a point. A mode with waves and progression switched off is needed and has not been scoped.

**Quick play.** One click from the menu, the editor or a workshop tank starts a normal run with no setup. The player begins as the basic tank and works up, as in the campaign. Enemy sources are the ones used last time.

- **Play now on a specific tank (proposed).** The run still starts as the basic tank. The chosen tank goes into the run's lineup, which is the set of tanks picked before the run, and it becomes the player's tank when the run reaches the level where it can be used. Driving a tank immediately is what the test arena is for.
- **Starting as another tank.** A run that begins as a chosen or random higher tank is not quick play. It could be a separate mode later. The rules agreed for it: upgrades work as in the campaign from there on, and death drops the player to the built-in default tank one tier below, because such a run has no earlier tank to fall back to.

### G. Workshop

**Browse (`/workshop`).**

- Sort by newest, top rated or most used, with "this week" and "all time" windows so early tanks do not hold the top permanently.
- Filter by tier and by type (player tank or enemy tank). The tier filter is required.
- Every card shows tier, rating, use count and publisher.

**Tank page.** Live render, stats, and the actions: add to library, try it (arena), play now (quick play), fight it (arena, as an enemy), remix, rate and report.

**Publisher page (`/workshop/u/<handle>`).**

- All of the publisher's tanks, with the same sorts and filters, and totals for tanks, uses and average rating.
- The author name on every card links to it.
- Each tank is one entry, however many versions it has.
- Logged-in owners also get "publish a new version" and "unpublish" controls. A new version is added to the same entry. There is no edit-in-place.
- Publishers pick a unique handle the first time they publish. Discord names are not unique and some people will not want theirs shown.
- Authorship comes from the account, never from the tank's free-text author field, so nobody can publish under another name.

**Use count.**

- **Counted once, when a run starts.** Nothing that happens later in the run changes it.
- **Which tanks.** Every workshop tank chosen for that run: the tanks in the player's lineup, and every tank in the enemy sources switched on for it. Whether an enemy actually appears, or the player ever reaches a lineup tank's level, does not matter.
- **Not counted.** Resuming a saved run. A tank first picked on an upgrade screen in the middle of a run. Arena sessions, "try it" and adding to a library.
- **Per version.** A use is recorded against the exact version played. Only unmodified copies count. An edited copy is a remix.
- **One message.** The game sends the version ids once at the start of the run. Anonymous players count, and offline starts are queued and sent later.
- **Limits.** The server accepts one use per tank per device per day and rate-limits by address. The number is a popularity signal, not a leaderboard.

**Packs.**

- **Weekly top pack.** A pack of the top enemy tanks per tier: 10 each, with the number adjustable, so up to 60 tanks across today's six tiers and 80 once tiers 7 and 8 exist. One click installs it as an enemy source.
- **Automatic schedule.** A scheduled job builds the pack every Friday morning, from the data of the seven days before, so the new pack is ready for the weekend. Nobody curates it by hand. Proposed hour: 06:00 UTC, which is Friday morning in Europe and late Thursday in the Americas.
- **History.** Every week's pack is kept and stays installable and playable. A pack stores its own copy of each tank as it was that week, with the publisher's credit and a link to their page.
- **Pinned versions.** A pack holds exact versions. The author can publish newer versions of the tank, and the pack keeps the one it was built with. If the author unpublishes it, it leaves the workshop listing but past packs keep their copy and credit (proposed). Tanks removed by moderation are removed from past packs too.
- **Advertised.** The game and the workshop show when a new week's pack is available.
- **Offline.** Installing stores the tank data on the device.
- **Updates.** An installed pack stays as it is until updated. An auto-update option follows the current week.
- **Quality floor.** Reported or barely-used tanks are excluded, and a thin tier gets a shorter list.
- **Ranking.** Pack tanks appear in many games and would otherwise keep their place indefinitely. The server keeps two numbers per version: the shown count (every use) and the chosen count (uses where the player picked that tank individually, not as part of a pack). The weekly pack ranks on the chosen count plus ratings.
- **Later.** All-time, curated and themed packs use the same mechanism.

**Tank storage.**

- **A tank is small text.** The original tank code (`src/game/services/tank-code.ts`) holds the whole design: author, name, player-or-enemy flag, class, life, reward, speed, difficulty, and for each part its type, position, rotation, scale and twin link. Artwork is not in it; the browser looks art up by part type. Among the 75 built-in tanks the median code is about 1,400 characters and the largest, a 227-part boss, about 32,000.
- **The classic code is not deterministic.** Each encoding of the same tank produces a different code, because the code includes random characters used as its key. It also carries things that differ between identical builds: a local id, the author and name, arbitrary per-part names (such as `3_mc`), and unrounded numbers (a scale of `0.8684210526315791`).
- **The classic code is obfuscated, not secret.** Its key is derived from the code itself and a constant in the source, so anyone can read or write codes.

**V2 tank code (decided: the same build must always produce the same code; the format below is proposed).**

- **What goes in.** Only what defines the build: the player-or-enemy flag, and each part in layer order with its type, position, rotation, scale and twin. Twins are referenced by position in the list, not by name.
- **What stays out.** Name, author and ids travel beside the code. Tier, life, speed, reward and difficulty are calculated from the build (workstream K), so the code cannot claim stats the build does not have.
- **Player-or-enemy flag.** With stats calculated, the same build could serve as both. Whether the flag is still needed was not examined.
- **Canonical numbers.** Positions, rotations and scales are written at one fixed precision, so the same placement always produces the same characters.
- **Part order is kept.** It is the layer order, so it is part of the build and cannot be sorted away.
- **Plain and compact.** No encryption. A packed, URL-safe encoding with a format version at the front should be several times shorter than the classic code, which matters for share links.
- **Identity.** A hash of the code identifies the build. It is used to detect exact duplicates at publishing, to tell whether a library copy is unmodified for use counts, to key pack copies and to cache rendered thumbnails.
- **Limits.** It detects exact copies only: moving one part slightly makes a different tank. Mirrored or rotated builds are also different tanks.
- **Classic compatibility.** V2 still reads classic codes, and can write one for a tank that uses only classic parts. A classic code's stored life, reward and speed are ignored on import, because V2 calculates them.
- **Duplicates (proposed).** Publishing a build that already exists is refused and points to the existing tank.

**Stats.** Tier, life, speed, reward and difficulty are calculated from the build by one shared function that the browser and the server both run. Workstream K describes it. The server recalculates them on publishing and never trusts a value sent by a browser.

**Other storage notes.**

- **Workshop facts live beside the tank**, not in it: publisher account, name, ratings, counts and the previous version. The workshop assigns its own tank ids.
- **New parts or tiers break old readers.** A tank using parts that classic does not know cannot be loaded there.

**Publishing and versions.**

- **Publishing is explicit.** A tank built in the editor is a private draft on the device. Nothing reaches the workshop until its maker presses Publish.
- **One tank, many versions.** A published tank is one entry on the publisher's page. Publishing again from that tank adds a version (v1, v2, v3) to the same entry, so a page does not fill up with near-copies.
- **Versions never change.** Each published version is fixed for good.
- **Latest by default.** Cards, the tank page and "add to library" use the latest version. Older versions stay listed on the tank page and can still be opened, added and played.
- **Packs pin a version.** If v5 is in a weekly pack, v5 stays in that pack whatever is published afterward.
- **Library copies (proposed).** A copy in a player's library is one specific version. The game shows when a newer one exists, and the player chooses whether to switch.
- **Counts and ratings (proposed).** Uses and ratings are recorded per version. A tank's card shows its uses summed across versions. Its rating is the latest version's, and until that version has enough ratings of its own the previous version's rating is shown. This stops a well-rated tank being replaced by a different design that keeps the score. The weekly pack ranks each version on its own numbers.
- **Tier.** A new version can be a different size, so the tank is listed under its latest version's tier.
- **Sorting (proposed).** "Newest" goes by when the tank was first published. A new version does not move it back to the top, so small updates cannot be used to stay on the front page.
- **Limits.** A cap on new versions per tank per day.
- **Name (proposed).** The name belongs to the tank. Each version can carry a short note saying what changed.
- **Duplicates (proposed).** A version identical to an existing version of the same tank is refused.
- **Other people's tanks.** Editing someone else's tank is a remix: a new tank under the remixer's name that credits the original tank and version.

**Data and moderation.**

- Stored: users (Discord id, handle), tank data, ratings, reports, use counters, packs. Store as little Discord data as possible and support deletion on request.
- Publishing and rating need login. Browsing does not.
- Name filter, report button, removal, bans and rate limits.
- Nightly backups kept off the server.

**Existing hook.** `CommunityTanks` in `src/game/services/extensions.ts` (search, publish, rate) is the stub the workshop client replaces.

### H. Community enemies

The engine already accepts a list of custom enemy designs per run and slots each by its class. Classic mixes them 50/50 with built-in tanks behind one switch (`UnitRoster` in `src/game/simulation/waves.ts`). V2 replaces the switch with an **enemy sources** screen:

- **Sources.** Toggle the built-in roster, the library, each installed pack and individual workshop tanks.
- **Mix.** Built-in only, mixed or community only.
- **Per run.** Chosen when starting a run and fixed for that run.

### I. Further gameplay

The direction is decided. The details are designed during implementation.

**Two more tiers (7 and 8).**

- **Very large tanks.** The wide view gives room for tanks far bigger than classic's largest, with larger weapons to match.
- **Tier follows size**, like tiers 1 to 6 (workstream K), with a balance between tiers.
- **What it touches.** The size thresholds and the speed, armor and weapon-budget tables in `src/game/core/constants.ts` have six entries today. A run has levels 0 to 6, each with its own health bar, and must grow to level 8. The editor's workspace, the camera zoom, the upgrade steps of a run, and the enemy waves (written for tiers 1 to 6) all need to reach tier 8. Larger weapons are new parts and need new artwork (workstream J).
- **Not checked.** How the game performs with tanks of that size on a phone.

**Upgrade protection (decided; the numbers are proposed).**

- **Today.** A full health bar upgrades the tank. The new tank starts with about 1% of its new bar: 2 of 100 at level 1 and 27 of 2,000 at level 6 (`rebuildPlayer` in `src/game/simulation/world.ts`). One hit usually kills it. Death drops the player a level with the bar one point short of full, so the next pickup upgrades again and the cycle repeats.
- **Change.** After an upgrade the tank is protected from damage for a few seconds and starts with a cushion of health.
- **A flat 50 or 100 does not fit every level.** The whole bar at level 1 is 100. Proposed: a cushion of about a quarter of the new bar, which is 25 at level 1 and 500 at level 6, and about three seconds of protection.
- **Side effect.** A cushion shortens the climb to the next upgrade by the same amount, so the bar lengths may need adjusting to keep the pace. The protected period has no such effect.

**Endgame.**

- **Several bosses.** Classic has one.
- **Several kinds of special field.** For example a wave arena: a field the player can come across far from the center bubble, where enemies arrive in waves. The current boss field is already large and is the model for these.
- **Community material.** Workshop tanks, packs and the higher tiers supply the enemies.

**Also raised, not committed.** Arena and challenge modes built from workshop tanks, and other new parts.

### J. Own artwork

V2 is built on its own artwork. The current stand-in artwork is kept for now.

**What exists today.** A "mock" mode that plays without the original file: translucent bubble bodies, yellow and orange weapons, drawn projectiles and synthesized sound effects, with quiet looping tones in place of music. It covers all 20 body parts and has numeric layouts for the other 73 parts.

**Work.**

- **Make it the default.** The stand-in artwork stops being a fallback and becomes what every player sees.
- **New parts.** Tiers 7 and 8 and any new weapons get artwork in the same style as they are added.
- **Shapes from numbers.** Artwork is described as shapes and colors in data, not as picture files. It then stays sharp at any size (workstream A), draws identically in the browser and on a server (workstream D), and costs nothing to store.
- **Rules do not depend on the artwork.** A tank's size and its hit shapes come from the part data (workstream K).
- **Sound.** Own sound effects, built on the synthesized ones.
- **Overhaul, later.** A full redesign of the artwork can follow at the end of V2. It is not needed before then.

**The original game file.**

- **Music (decided).** A player can load the original file to get its music. Without it the game plays the placeholder tones.
- **Original look (proposed: dropped).** V2 does not show the original artwork. New parts and tiers have none, and classic stays online for the original look.
- **What that removes.** If the original look is dropped, the code that reads artwork from the file leaves V2 after the code modernization phase, together with the tests that need the file's artwork. Only the part that reads the music stays. Until that is confirmed, nothing is removed.
- **Tests.** CI never needs the file.

### K. Stats from the build

A tank's stats are calculated from its parts. Nobody types them in, and no code or database field can override them.

**How it works today.**

- **Tier** is calculated: it is the area the body parts cover, counted in pixels of the drawn artwork against five thresholds (`measureClass` in `src/game/assets/class-measurement.ts`, `CLASS_PIXELS` in `src/game/core/constants.ts`). Weapons do not set the tier. The tier limits how many weapon points a tank may carry (`gunBudget` in `src/game/data/catalog.ts`).
- **A player tank's speed and armor** come from its tier. Its turn rate follows its speed.
- **An enemy's life, reward and speed are typed in** by the creator, within 1 to 1000, 1 to 500 and 0 to 4.
- **The editor already suggests values.** Its formula uses body points, weapon points and tier (`creatorSuggestedStats` in `src/game/core/creator-enemy-stats.ts`).
- **Difficulty** is calculated from speed, weapon points, life and reward, and waves pick enemies by these numbers (`difficulty` in `src/game/data/catalog.ts`, `matchesRule` in `src/game/simulation/waves.ts`).

**How the built-in enemies compare with the editor's suggestion.** Measured on the 43 built-in enemy tanks:

| Stat | Follows the suggestion | Detail |
| --- | --- | --- |
| Life | Closely (correlation 0.95) | 11 of 43 match exactly. The typical tank has about 80% of the suggested life, ranging from 40% to 190%. |
| Reward | Closely (0.95) | 14 of 43 match exactly. |
| Speed | Loosely (0.60) | 19 of 43 match exactly. In tiers 2 and 3 the built-in tanks are much slower than suggested: a typical 0.9 against 2.3, and 0.5 against 1.45. |

So the existing suggestion is a sound starting formula for life and reward. Speed needs a new fit.

**Work.**

- **One stats function.** It takes a build and returns size, tier, life, speed, turn rate, reward, weapon points and difficulty. It uses numbers only, with no artwork and no browser, so the editor, the game, the server and the tests all get the same answer.
- **Size without artwork.** Today's size is a pixel count of whichever artwork is loaded, so it needs a browser and could differ between artwork sets (not checked). V2 calculates the covered area from each part's outline numbers. The placeholder artwork already describes bubbles as numeric circles (`src/game/data/mock-part-leaves.json`). A test must show that all 75 built-in tanks keep their tier, and the thresholds are adjusted if they do not.
- **Life** from the number and size of bubbles.
- **Speed and turn rate** from size and weight: bubbles and weapons both slow a tank down.
- **Reward** from how hard the tank is to beat.
- **One model for players and enemies (proposed).** Today a player tank's speed comes from a per-tier table and an enemy's from a typed number on a different scale. V2 should calculate both the same way.
- **Starting values.** Fit the formulas to the built-in tanks first, so the campaign plays as it does now, then tune.
- **Built-in tanks follow the formulas.** The built-in enemies are recalculated like every other tank. 32 of the 43 have a life that differs from the classic suggestion, so the campaign's balance changes at that point and the recorded runs (section 5) are re-recorded with it.
- **Bosses (proposed).** Bosses keep hand-set stats. A boss is a designed encounter, and the current one sits at the maximum life of 1,000.
- **Tuning changes every tank at once.** A new formula changes the stats of every tank, published ones included, and a change to the size thresholds can move a tank to another tier. The formulas carry a version number. Saved runs record it, and the workshop recalculates its tier listings when it changes.

**Tier, level and weapons.** Tier is size alone. What a player may use in a run depends on the run's level, and classic already works this way:

- **Levels.** A run has levels 0 to 6. Filling the health bar raises the level.
- **Sizes offered.** On an upgrade the player is offered tanks one tier smaller, the same tier and one tier larger (`upgradeClasses` in `src/game/core/upgrade-offers.ts`). Larger tiers open as the level rises: tier 3 from level 2, tier 4 from level 3, tier 5 from level 4 and tier 6 from level 5.
- **Weapon points.** The budget depends on both tier and level (`GUN_BUDGET` in `src/game/core/constants.ts`). At level 6 a tier 1 tank carries 13 points and a tier 6 tank 25.
- **Weapon unlocks.** 40 of the 93 parts unlock at a level, and 40 need a minimum or maximum tank size (`tier` and `classCost` in `src/game/data/parts.json`).

So a small tank with late-game weapons is already possible, within its smaller budget. V2 keeps this model and extends it to level 8 and tier 8. A workshop tank shows two numbers: its tier, and the level from which it can be used.

This settles two earlier questions. The server can check a tank's tier, because the calculation no longer needs artwork. And a community enemy cannot be published with unfair stats, because the stats are not the publisher's to choose.

## 7. Order and dependencies

1. **Split** (section 3). Ian's step, after classic is wrapped up.
2. **Safety net** (section 5, phase 1).
3. **Code modernization** (section 5, phase 2). Nothing visible changes.
4. **Foundations:** the app frame, starting without the original file, and **K. Stats from the build**. These are the first visible V2 changes. K comes early because the editor, the tank code and the workshop all depend on it.
5. **A. Fill the screen, sharp.**
6. **B. Controls and mobile**, together with **C. Save and resume** and a basic test arena for tuning handling.
7. **Community track**, which needs no server until its last step and can run in a separate thread alongside steps 5 and 6:
   1. D. Tank renderer and share links
   2. E. Editor
   3. F. Full test arena and quick play
   4. H. Enemy sources (library and share-link tanks)
   5. Backend, then G. Workshop and packs
8. **I. Further gameplay:** upgrade protection, tiers 7 and 8, then the endgame.
9. **Later, not for launch:** link preview images, and an overhaul of the artwork.

**J. Own artwork** runs alongside from step 4 onward: the stand-in artwork becomes the default, and new parts get artwork as they are added.

Delivery follows the five-PR stacks in `docs/delivery.md` unless that policy is changed for V2.

## 8. Open questions

1. **Play now on a specific tank.** Proposed: the run starts as the basic tank and the chosen tank joins the lineup for the level where it can be used (workstream F).
2. **Original look in V2.** Proposed: dropped, with the original file loaded for music only. Confirming this allows the artwork-reading code to be removed from V2.
3. **Upgrade protection numbers.** Proposed: about three seconds of protection and a cushion of a quarter of the new bar.
4. **Bosses and the stat formulas.** Proposed: bosses keep hand-set stats.
5. **Ratings across versions.** Proposed: recorded per version, with the previous version's rating shown until the new one has enough of its own.
6. **Weekly pack hour.** 06:00 UTC on Friday is proposed.
7. **Unpublishing a tank that is in a pack.** Proposed: it leaves the listing and past packs keep their copy.
8. **Publishing an exact copy of someone else's tank.** Proposed: refused, with a pointer to the existing tank.

Left for the implementation phase, by decision: the balance between tiers, the size and weapons of tiers 7 and 8, and the design of the bosses and special fields.
