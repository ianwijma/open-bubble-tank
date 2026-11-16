# Soap Tank

Build a tank out of bubbles. Fight everyone else's.

Soap Tank is a free, open-source arena shooter that runs in the browser. Every tank is built from bubbles: pop enemies, collect what they drop, and grow into something bigger. It is written in TypeScript with Bun, Next.js, Tailwind CSS and PixiJS.

Soap Tank grows out of a faithful recreation of an older Flash game. It keeps that engine and is free to change it. **It is in development.** Today it plays like the classic game on a fixed 550×450 stage with keyboard and mouse. Filling the screen, phone controls, save and resume, a new editor and a community workshop are planned in [the Soap Tank plan](docs/v2-plan.md).

The game uses its own stand-in artwork, synthesized sound effects and placeholder music tones. It bundles no original artwork or audio and does not read the original game file. Own music is still to be made.

## Run

Requires Bun 1.3.9 or newer and Node.js 20.9 or newer (for the Next.js tooling).

```sh
bun install
bun run dev
```

Open [localhost:3000](http://localhost:3000).

## Test and build

```sh
bun run check            # TypeScript and the rule tests in tests/
bun run format:check     # Formatting
bun run test:e2e         # Production build, then the Playwright browser tests in e2e/
bun run test:e2e:smoke   # Production build and the quick browser check run on pull requests
bun run test:e2e:offline # Production build and the full browser suite run on master
bun run build            # Production build
bun run start            # Serve the production build
bun run fixtures         # Gameplay, artwork and screen fixtures on localhost:3102
```

The browser tests use Chrome if it is installed, otherwise Playwright's Chromium (`bun x playwright install chromium`). Playwright writes its per-test output to `test-results/playwright`. Keep your own validation records elsewhere, for example in an ignored `reference-captures/` directory.

The full suite includes a bot that plays a fresh game through to the boss and the win screen from a fixed random seed. Locally it has a 5-minute budget. `SOAPTANK_PLAYTHROUGH_LONG_RUN=1` raises it to 10 minutes, as CI does on master.

Pull requests run formatting, the rule tests, a production build and the quick browser check. Pushes to `master` and manual runs replace the quick check with the full browser suite. See [delivery](docs/delivery.md).

## Play

- **W A S D:** move. The tank stays centered while the field slides.
- **Mouse:** aim. Hold the left button to fire primary weapons.
- **Space:** fire secondary weapons together, on their shared cooldown.
- **P or Escape:** pause and resume.
- Cross the edge of a field to travel to the next one. Enemies you leave behind keep their state, and cleared fields stay reachable. The map shows only the paths you have traveled.
- **Map button (top left):** cycle between a compact map, a large map and none.
- **Settings → Camera zoom:** 50 to 150 percent.
- Collect dropped bubbles to heal. A full health bar upgrades the tank. Dying loses a tank level.

The menu also opens the tank creator and the local tank library. Designs can be saved, imported and exported as JSON, and shared as tank codes. Settings and progress are saved in the browser. Continuing restores your tank progression, not the run in progress.

## Repository layout

| Directory | What it holds |
| --- | --- |
| `src/app` | Next.js entry points, stage sizing and global styles |
| `src/components` | React screens: menu, HUD, dialogs, settings, tank creator and tank library |
| `src/game/core` | Types, input, per-frame constants, math and seeded random numbers, screen models |
| `src/game/data` | Parts, built-in tanks, waves, rules and display layouts, as hand-maintained JSON |
| `src/game/simulation` | World state, combat, projectiles, enemy behavior, pickups, progression, editor rules |
| `src/game/assets` | Stand-in artwork, part shapes and bounds, hit testing |
| `src/game/render` | Pixi drawing; owns no game rules |
| `src/game/services` | Profile storage, tank codes, audio, the stage clock and stubs for online services |
| `tests` | Rule and data tests, run by `bun run check` |
| `e2e` | Browser tests, run by Playwright |
| `tools` | Test fixtures, the fixture server and the playthrough bot |
| `assets/branding` | Icon files |
| `docs` | [Architecture](docs/architecture.md), [delivery](docs/delivery.md) and [the plan](docs/v2-plan.md) |

The simulation advances in fixed steps, 50 a second by default, and React stays out of the frame loop. See [the architecture](docs/architecture.md).

## License

The code is licensed under `AGPL-3.0-only`. Anyone who runs a changed copy as a service must publish their changes.

The license does not cover the content kept from the original game, Bubble Tanks 3 by Hero Interactive: the built-in tank designs, waves, part names and texts, menu and editor layouts, display data and the rules rebuilt from its code. [NOTICE.md](NOTICE.md) lists that content and the third-party licenses.
