# Goal: faithfully recreate Bubble Tanks 3

Continue building a faithful, one-to-one recreation of the original Bubble Tanks 3 Flash game in `/home/ian/Projects/ianwijma/open-bubble-tank`. The intended result is an offline game whose appearance, animation, controls, sound and gameplay are indistinguishable from the original, except for explicitly documented removals and usability additions.

The reverse-engineering documentation and original implementation evidence are in `/home/ian/Projects/ianwijma/documented-bubble-tank-3`. Initial research, asset extraction and a demonstration of loading assets directly from the Flash file already exist. Consult that repository whenever functionality is uncertain. Prefer decompiled code, and inspect exported bytecode when the decompiler is ambiguous, rather than inventing behavior.

Use Bun, TypeScript, Next.js, Tailwind CSS and the project's selected JavaScript game engine, PixiJS. Keep the implementation lightweight and modular so it can be tinkered with and extended without reworking whole systems. Preserve the separation between simulation, rendering and browser services. Avoid spending time on disposable prototypes when the original provides the specification.

Before entering the game, let the player supply their own Flash file. Extract the required artwork and audio locally in the browser using the existing asset-loading approach. Do not bundle or commit the SWF or extracted original media. If no Flash file is supplied, support playable mock assets. Their layouts, sizes, colors and movement should follow the recovered original designs as closely as practical.

Strip out currently broken or unavailable functionality, including retired online services, while retaining isolated stubs so those features can be added or restored later. Keep deliberate differences explicit; do not silently reinterpret the original.

Continue from the existing implementation rather than restarting. Read `AGENTS.md`, [the continuation handoff](docs/handoff.md), [the architecture](docs/architecture.md) and [the fidelity ledger](docs/fidelity.md). The ledger records implemented contracts, evidence limits and remaining work. The recreation goal is not yet complete: passing selected tests does not establish full-game parity.

Verify changes with the appropriate rule tests, browser flows and original-runtime comparisons. Keep documentation current, and occasionally commit and push verified changes using the configured signing setup. Continue until the remaining fidelity work is completed and the full offline experience has been checked against the original.
