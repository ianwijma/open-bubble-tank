# Open Bubble Tank

A modular TypeScript reconstruction of **Bubble Tanks 3**, built with **Bun, Next.js, Tailwind CSS, and PixiJS**. The implementation uses the recovered game rules and data in the sibling [`documented-bubble-tank-3`](../documented-bubble-tank-3) repository.

**The one-to-one recreation is still in progress.** This repository contains a playable offline implementation, not a claim of completed pixel or behavioral parity. The remaining differences are tracked in [the fidelity ledger](docs/fidelity.md).

## Run

Requires Bun 1.3.9+ and Node.js 20.9+ (Next.js tooling).

```sh
bun install
bun run dev
```

Open [localhost:3000](http://localhost:3000). Choose your Bubble Tanks 3 `.swf` at the asset screen, or choose **Play with mock assets**. The original game file and artwork are not bundled. Everything is extracted on the device: there is no upload endpoint, Flash player, or execution of ActionScript.

To obtain the game file yourself, open [Bubble Tanks 3 on Internet Archive](https://archive.org/details/bubble-tanks-3). Under **Download Options**, choose **SHOCKWAVE FLASH**, then select the downloaded `.swf` in the game. The asset screen includes the same guide. Mock mode supplies synthesized sound effects and quiet looping tones, translucent bubble bodies, yellow/orange weapons, and procedural projectiles with authored sizes and source-derived colors.

Normal compressed CWS and uncompressed FWS containers are supported. The research repository's already-expanded SWF with a retained CWS header is also recognized after checking its stage dimensions and frame rate. ZWS/LZMA is unsupported.

```sh
bun run check         # TypeScript and deterministic simulation/data tests
bun run format:check  # Formatting
bun run test:e2e      # Production build + Chrome/Playwright browser flows
bun run build
bun run start
bun run fixtures      # Gameplay/art/screen fixtures on localhost:3102
```

The browser tests use Chrome if installed, otherwise a Playwright Chromium installation. To install Chromium, run `bun x playwright install chromium`. SWF integration tests use `BT3_SWF_FILE` or the sibling research fixture, and skip when neither exists. No SWF is committed to this project.

Ordinary navigation tests use `e2e/helpers/main-menu.ts` to wait for the native title intro before selecting a menu control. The title's hit geometry can cover an otherwise visible button. Controlled menu fixtures test input during the intro and on animated hover edges separately.

## Original runtime reference

The development reference viewer runs the supplied SWF with pinned Ruffle 0.7.1. It is separate from the game application and is excluded from the production bundle. It normalizes the research file's expanded CWS header to FWS and blocks retired external requests. Ruffle is an emulator, so observed differences still need to be checked against the recovered code.

Run `bun run reference` in one terminal and `bun run reference:browser` in another. The latter starts an owned headless Chrome with a larger WASM stack; default Chrome's stack overflows on this SWF. It exposes CDP on port 9223 and closes on Ctrl+C. The native input helper uses Node.js 26+ and writes 550 × 450 stage captures to `test-results/reference-current.png`:

```sh
bun run reference:input load /absolute/path/to/game.swf
bun run reference:input wait 3000
bun run reference:input click 275 282 # original Continue button
bun run reference:input click 363 380 # first storage tutorial NEXT
bun run reference:input click 363 372 # second storage tutorial NEXT
```

The helper also accepts `reload PATH`, `hold X Y MS`, `keyhold KEY MS`, `drag X Y X Y`, `move X Y`, `press KEY`, `status`, `pause`, and `resume`. Hold commands capture while the input is down and release it afterward. Drags send twenty native pointer moves with a 25 ms gap so Flash can advance between them. Set `BT3_REFERENCE_CAPTURE` to choose a capture path. `BT3_SWF_FILE` on the reference server enables a button to load that explicit research file. The viewer selects Ruffle's `wgpu-webgl` backend: legacy `webgl` cannot run this movie's `BitmapData.draw` calls and can show menus while gameplay fails. Run `BT3_REFERENCE=1 bun run test:e2e` to include the optional original-SWF boot/input smoke test. Its Continue-artwork and tutorial-panel pixel checks verify startup; native firing and movement were checked separately.

## Play

- **WASD:** move. The avatar stays centered while the field slides.
- **Mouse:** aim; hold the left button to fire primaries.
- **Space:** fire secondaries together on their shared cooldown.
- **P / Escape:** pause/resume, including during field travel. The original Q binding is retained for future lock-on parts; the supplied base game has no part that activates it.
- Cross the circular boundary to travel to another field. Visited enemies retain their state and cleared fields remain reachable. Map paths appear only after you traverse them, once per pair of fields. As in the original, returning to an empty field counts as another completion.
- **Top-left map button:** cycle compact, large, and hidden while the game continues. Only traveled connections appear. Equipped Radar shows off-screen arrows; Health Readout adds enemy bars, and summoned allies have health rings.
- **Settings → Camera zoom:** choose 50–150%, independently of fullscreen or window size. 100% keeps the original camera scale.
- Collect green bubbles to heal. **Health is progression**: a full health bar upgrades the tank. Death loses a tank level; the first tank escapes to a weak field instead of ending the game.

The menu also provides the enemy tank creator and local tank library. Avatar designs can be edited during upgrades and after clearing a field. Designs can be saved, imported/exported as JSON, and shared using the **original encrypted tank-code format**. Settings, progression designs, and the secondary-weapon help flag are saved locally. The help appears on the first eligible tank replacement and pauses play until Close. As in the original, continuing restores the design progression, not a complete serialized world.

In the creator, select a palette row, then drag its preview into the design area. The selected row stays available for repeated drops. With a supplied SWF, previews, dragged objects, and placed parts animate using the native display lists. Dimmed rows exceed the current budget or class limits but remain selectable, as in the original; saving checks the finished design. New enemy designs start empty. For keyboard placement, focus and activate the preview, position it with the arrow keys (Shift moves five pixels), then press Enter to place or Escape to cancel.

Click placed parts to toggle selection, drag empty space to select a group, and drag selected parts to move them. Symmetric Mode selects a faded linked twin and mirrors group movement; parts meeting on the center line can merge and respawn a twin when moved away. Scale, rotation, layering, delete, and undo apply to the selection. Turning Symmetric Mode on or off clears the selection.

## Structure

| Directory | Responsibility |
| --- | --- |
| `src/app` | Next.js entry points, stage sizing, Tailwind/global styles |
| `src/components` | Asset gate, menu/HUD/dialogs, settings, editor, tank library |
| `src/game/core` | Types, input, frame-based constants, deterministic math/random |
| `src/game/data` | Recovered parts, designs, waves, rules, roster batches, emitter and whip coordinates |
| `src/game/simulation` | World state, combat, projectiles, AI, pickups, progression, editor validation |
| `src/game/assets` | Browser SWF parsing, vectors/fonts, sprite display lists, pixel masks, mock assets |
| `src/game/render` | Pixi rendering and native SWF timeline animation; no game-rule ownership |
| `src/game/services` | Local profiles, original tank-code codec, audio, retired-service extension interfaces |
| `tools` | Repeatable research-data importers and development visual fixtures |
| `tests`, `e2e` | Rule/format regression tests and real browser flows |

PixiJS is the rendering engine; the simulation owns its rules and advances at the original **50 simulation frames per second**, with the original 35/65 FPS settings and 90 FPS efficiency mode available. React is kept out of the frame loop. See [architecture](docs/architecture.md) for extension points and [fidelity](docs/fidelity.md) for source references and current limits.

## Updating recovered data

```sh
python3 tools/import-reference-data.py ../documented-bubble-tank-3
bun tools/import-swf-geometry.ts ../documented-bubble-tank-3
bun tools/import-hud-geometry.ts ../documented-bubble-tank-3
bun tools/import-tutorial-art.ts ../documented-bubble-tank-3
bun tools/import-mine-art.ts ../documented-bubble-tank-3
bun tools/import-projectile-clips.ts ../documented-bubble-tank-3
bun tools/import-projectile-geometry.ts ../documented-bubble-tank-3
bun tools/import-part-geometry.ts ../documented-bubble-tank-3
bun tools/import-timeline-scripts.ts ../documented-bubble-tank-3
```

These import numerical definitions, layouts, original encoded tank identities, behavior tables, and recognized MovieClip frame actions. The projectile-clip importer retains numeric display lists for source-polled roots and their children. The timeline importer replays inherited frame registrations and checks that every scripted part and managed projectile clip is covered; unsupported application/effect callbacks are reported. Artwork and audio still come from the player's supplied file. The wave importer reconstructs all 20 / 34 / 44 regular options and the deadhead option from `_-3y.as`, preserving distance branches instead of using the earlier flattened wave JSON.

Original Bubble Tanks 3 game and assets: **Hero Interactive**. See [NOTICE](NOTICE.md).
