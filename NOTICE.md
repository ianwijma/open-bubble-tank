# Notice

## The original game

Soap Tank grows out of a faithful recreation of **Bubble Tanks 3**, a Flash game created by **Hero Interactive** and published on Armor Games. The content below is kept from that game and credited to its original creators. It is not covered by the license of this repository (`AGPL-3.0-only`), which applies only to the code written for this project by its author and contributors.

Content kept from the original game and excluded from the license:

- The built-in tank designs, including their authors and stored stats (`src/game/data/tanks.json`).
- The waves and enemy roster (`src/game/data/waves.json`, `src/game/data/roster.json`).
- The part names, costs and texts, including flavor text (`src/game/data/parts.json`), and the other game texts shown on screen.
- The menu and editor layouts.
- The imported display data in `src/game/data`: timelines, layouts, geometry and effect clips that the stand-in artwork and screens are drawn from.
- The game rules rebuilt from the original's code, as implemented in `src/game/simulation` and `src/game/core`.

No original artwork, music or sound is bundled. Soap Tank draws its own stand-in artwork, synthesizes its sound effects and placeholder music, and does not read the original game file.

## Third-party software

Runtime dependencies keep their own licenses, found in their packages:

- Next.js, MIT License
- React and React DOM, MIT License
- Tailwind CSS, MIT License
- PixiJS, MIT License
