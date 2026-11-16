# Architecture

This describes the code as it stands after the move to Soap Tank: the classic engine, running on its own stand-in artwork and sound, with no reader for the original game file. The changes the plan makes to it are in [the plan](v2-plan.md), sections 4 to 6.

## Engine choice

[PixiJS](https://pixijs.com/8.x/guides/components/application) supplies the WebGL renderer and scene graph. The game needs no rigid-body physics engine, tile map or entity framework: tanks are built from parts, hits are tested point against shape, each velocity axis moves on its own, and timers count frames. Keeping those rules in plain TypeScript keeps them free of a framework's physics and variable-time integration.

Next.js supplies the application shell, the TypeScript build and static delivery. Tailwind is installed through its PostCSS integration. Stage styling sits in one stylesheet so stage coordinates stay explicit. Pixi is imported on demand by the screens that draw. The game has no server API or database.

## Three layers

| Layer | Where | Owns | Must not |
| --- | --- | --- | --- |
| Simulation | `src/game/simulation`, most of `src/game/core` | The rules: world state, combat, movement, enemy behavior, waves, pickups, progression, editor rules | Touch the DOM, Pixi, storage or audio |
| Rendering | `src/game/render`, `src/game/assets` | Drawing the world, screens and HUD; the stand-in artwork and its shapes | Change game state |
| Browser services | `src/game/services`, `src/components` | Input, audio, profile storage, the stage clock, screen navigation, React UI | Run game rules |

## Flow

1. The app builds the stand-in asset pack (`AssetPack` in `src/game/assets/asset-pack.ts`) before the menu appears.
2. `GameShell` (`src/components/game-shell.tsx`) owns the local profile, screen navigation, dialogs and a `World` instance.
3. `GameViewport` owns input listeners, the Pixi renderer and their cleanup. `MainStage` drives the shared fixed-step clock, `StageRuntime` (`src/game/services/stage-runtime.ts`). Input is cleared when the window loses focus, and play pauses when the tab is hidden.
4. `World.step` (`src/game/simulation/world.ts`) advances one game frame from one input record. The systems it calls live in their own files: `weapons.ts`, `projectiles.ts`, `actor-movement.ts`, `waves.ts`, `tank.ts`, `beams.ts`, `healing.ts`, `turrets.ts`, `status.ts`, `damage.ts`, `pickups.ts` and others in `src/game/simulation`.
5. `GameRenderer` (`src/game/render/pixi-renderer.ts`) centers the camera on the player, draws fields, tanks, projectiles, pickups and effects, and keeps one `TankView` per live tank.
6. React observes a revision counter, about ten updates a second. It does not render every frame.

## Simulation

- **Units.** Pixels per frame, degrees and frame counters. Constants are never multiplied by wall-clock time. The rules run at 50 steps a second by default; the classic 35, 65 and 90 speed options still exist and are to be removed (plan, section 2).
- **Stage.** 550 × 450, with the world origin at (275, 225). Drawing scales the stage to fit without changing world dimensions.
- **Health is progression.** One bar is both the tank's health and its progress: filling it upgrades the tank. The level health lengths are `[50, 100, 170, 250, 400, 800, 2000]` (`MAX_LIFE` in `src/game/core/constants.ts`). The plan splits this into a health bar and a growth bar (workstream K).
- **Weapons.** Each primary weapon has its own cooldown. Secondary weapons share the slowest mounted rate and fire together.
- **Fields.** A visited field keeps its living enemies and their exact state (`field-cache.ts`, `field-runtime.ts`). Fields the player is not in do not simulate. Map connections record the paths traveled, each pair of fields once, and cleared fields stay reachable.
- **Tanks.** Built-in designs in `src/game/data` are fixed templates. Health, timers, lost parts and hidden bubbles live on each `Tank` instance (`tank.ts`, `degradation.ts`).
- **Random numbers.** Seeded and deterministic (`src/game/core/math.ts`). The background particles still share the generator with the rules; the plan separates them (section 5, phase 2).
- **Timers.** Most rules count frames. A few launcher and timeline callbacks run on elapsed milliseconds (`wall-timers.ts`); `World.step(input, milliseconds)` lets a test drive them without a browser.
- **Hit testing.** In the browser, hits, tank widths, shield sizes and shot outlines come from the drawn artwork through hooks that `GameViewport` binds on `World`. Without a browser the engine falls back to numeric estimates. The plan replaces the hooks with numeric shapes (section 5, phase 2).

## Stand-in artwork

The game draws all of its artwork from numbers in `src/game/data`; no picture files are loaded.

- **Bubbles.** `src/game/assets/mock-part.ts` paints the 20 body parts from numeric circles in `mock-part-leaves.json` and their animation from `mock-part-timelines.json`.
- **Weapons and modules.** The other 73 parts are painted from numeric layouts in `part-geometry.json`.
- **Projectiles.** `src/game/assets/mock-projectile.ts` builds cached polygons for each shot from `projectile-geometry.json`, and `src/game/render/mock-projectile-view.ts` paints them. Painting and hit testing use the same polygons.
- **Screens.** The menu, HUD, minimap, pause, upgrade and win screens, the creator and the tank library draw simple shapes and text placed by the layout data in `src/game/data` (for example `hud-geometry.json`, `creator-palette.json`, `upgrade-screen.json`).
- **Tier measurement.** The editor measures a tank's tier from the area its body parts cover in the drawn artwork (`src/game/assets/class-measurement.ts`). The plan replaces this with a numeric calculation (workstream K).

`AssetPack` keeps the drawn parts, their poses per tank and the hit-test shapes. `GameRenderer` owns Pixi textures and display trees and releases them when a run ends or the viewport unmounts.

## Audio

`AudioManager` (`src/game/services/audio.ts`) plays sound through ten general slots and advances music on the shared stage clock, so fades continue in menus and while paused. Every sound is generated on the device as a short WAV by `src/game/services/mock-audio.ts`: synthesized effects and a quiet looping tone in place of music. Pointer and key presses retry music the browser suspended. Own music is still to be made (plan, workstream J).

## Editor and tank library

- **Rules.** Pure editor operations live in `src/game/simulation`: `editor-selection.ts` (selection, twins, transforms, ordering, delete), `editor-placement.ts` (previews, snapping, drop checks), `editor-drag.ts` (dragging and mirrored twins), `editor-validation.ts` (budget and class checks), `editor-history.ts` (undo) and `editor-palette.ts` (affordability and unlocks).
- **UI.** `TankCreator` (`src/components/tank-creator.tsx`) owns pointer capture, the keyboard alternative and the design. `TankViewer` (`src/components/tank-viewer.tsx`) lists built-in and saved designs, sorts them and enters tank codes. The plan replaces both screens (workstream E).
- **Coordinates.** `src/game/core/display-transform.ts` converts pointer positions through the stage's CSS transform and device pixel ratio, with no DOM access of its own.

## Services

- **Profile.** `src/game/services/profile.ts` validates versioned JSON in `localStorage` under `soaptank.profile.v1`. A version mismatch resets it today; the plan adds step-by-step upgrades (workstream C).
- **Tank codes.** `src/game/services/tank-code.ts` reads and writes the classic encrypted tank-code format (AES-128-ECB with PKCS7 padding, built on Web Crypto). It is a compatibility format, not a security measure. The plan adds a new deterministic format (workstream D).
- **Online services.** `src/game/services/extensions.ts` holds typed interfaces for community tanks, accounts and similar services, with offline stubs. The workshop client replaces the community-tanks stub (workstream G). Gameplay code never calls an endpoint.

## Data

The JSON files in `src/game/data` are hand-maintained source: parts, built-in tanks, waves, the enemy roster, rules, and the layout and geometry data the artwork and screens are drawn from. `catalog.ts` and `weapons.ts` expose them to the code. Edit the files directly and cover changes that affect rules with tests. Keep part IDs stable, because tank codes refer to them. Much of this content comes from the original game; see `NOTICE.md`.

## Extending

- **A new part.** Add it to `parts.json`, implement it in the relevant combat or behavior system, and give it stand-in artwork data. Use a new, stable ID.
- **A headless run.** A test or replay harness can construct a `World` and call `World.step` with seeded input, without a DOM.
- **A different renderer** can read the same `World`.

## Test infrastructure

- `tests/` holds the rule and data tests, run by `bun test` through `bun run check`.
- `e2e/` holds the Playwright browser tests, run against a production build.
- `tools/visual-fixtures.ts` serves a development page on port 3102 with deterministic world snapshots, built from the production asset pack, simulation and renderer. Most browser tests load it, so the shipped app needs no debug routes. `tools/fixtures/` holds the scenarios.
- `tools/playthrough/` holds the bot that plays a fresh game to the boss and the win screen from a fixed seed (`e2e/playthrough.spec.ts`).
