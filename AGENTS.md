<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Soap Tank project rules

- Soap Tank is a successor built on the classic engine, not a recreation. Changing rules, screens and content is allowed. `docs/v2-plan.md` records what is decided, proposed and open; follow it and do not invent decisions.
- Keep rendering, browser services and simulation separate. Simulation units are per-frame (pixels per frame, frame counters); do not scale rules by wall-clock time. Keep part IDs stable, because tank codes refer to them.
- Never commit game files or assets you do not own, or dependency and build output.
- The JSON files in `src/game/data` are hand-maintained source. Edit them directly and cover rule-relevant changes with tests.
- Run `bun run check` for rule changes and `bun run test:e2e` for affected browser flows. Run `bun run format` before handing over changes.
- Deliver work as described in `docs/delivery.md`.
