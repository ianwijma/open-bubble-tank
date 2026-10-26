<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Open Bubble Tank project rules

- The goal is faithful recreation, not reinterpretation. Treat the sibling research repository as evidence and prefer decompiled code when summaries conflict.
- Read `docs/fidelity.md` before claiming a feature or the complete game has parity. Keep remaining differences explicit.
- Keep rendering, browser services, and simulation separate. Preserve original per-frame units and stable part IDs.
- Never commit SWFs, extracted images/audio, or dependency/build output. The browser asset gate supplies artwork at runtime.
- Change generated data through the repeatable import tools, or document a source-backed manual correction.
- Run `bun run check` for rule changes and `bun run test:e2e` for affected browser flows. Run `bun run format` before handing over changes.
