# Goal: build Soap Tank

Soap Tank is a browser arena shooter in which every tank is built from bubbles. It grows out of a faithful recreation of an older Flash game ("classic"). It keeps that engine and changes whatever makes the game better to play today.

Goals, in priority order:

1. The game fills the screen and stays sharp at any size.
2. It plays well on a phone.
3. A community forms around it: people build tanks, share them, and fight each other's designs.
4. Gameplay is improved where the original is awkward. Soap Tank is not bound to reproduce classic.

Soap Tank uses its own artwork and sound, and never reads the original game file. It is free to break with classic: classic saves and tank codes do not carry over. It lives at `soaptank.net`.

Out of scope: payments of any kind. The workshop is a free gallery.

The plan, with every decision marked decided, proposed or open, is [the Soap Tank plan](docs/v2-plan.md). Read it, [the architecture](docs/architecture.md) and `AGENTS.md` before starting work. Use Bun, TypeScript, Next.js, Tailwind CSS and PixiJS. Keep the code modular, and keep simulation, rendering and browser services separate. Before the game changes, tests pin what it does today (plan, section 5).
