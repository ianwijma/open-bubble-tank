# Ordered actor display ownership

This local follow-up separates the enemy layer's actual children from its enemy
and ally Run arrays. It implements the actor portion of
[the complete field inventory](live-field-display-ownership-audit.md), without
claiming that the complete field query or renderer population is implemented.

## Source contract

`_-0D.SpawnNewEnemy` constructs through `TankData._-Tr`, assigns X/Y, adds the
clip to `enemyLayer_mc`, sets its callback, enables Run and appends the enemy
array. `SpawnNewAlly` follows the same phases after overriding imported life to15.
See the original `export_scripts/scripts/_-0D.as:474–487,1382–1398` and qualified
`export_pcode/scripts/_-0D.pcode:5904–5992` for the ally branch. The bytecode's
jump chain follows X → Y → addChild → SetCallback → intState → array push.

Swarm and mine secondaries (`_-ct/_-Va.as:31–49` and `_-ct/_-AW.as:47–68`) count
summons on `currentBFTarget`, transform their emitter Point into that wrapper,
then call its `SpawnNewAlly`. Both recovered blueprints already have life15.
The host now attaches those births immediately, rather than waiting for their
first actor Run or a later synchronization pass. Its existing emitter adapter
remains; this change does not qualify arbitrary mounted matrices.

The cached `_‑G0` reparenting and raw Run arrays are separate operations. Replacing
an array does not perform `removeChild`. Removing an outer wrapper also leaves
its children parented to the detached layer. A repeated `addChild` moves a child
to the end of the same parent's order. Source arrival, collapse and cached-field
references are indexed in the field inventory and [crossing contracts](crossing-source-reference.md).

## Implementation boundary

- `ActorParents.attach/detach` alone mutate ordered membership. `owned(field)`
  reads the actual child order without exposing a mutable Set. A same-parent
  attachment raises the child; a cross-parent attachment removes it from the old
  owner. `sync(world)` updates active ancestry, retained translations, rooted
  state and avatar identity only. It never reads either actor Run array.
- `World.attachActor` combines the source addChild and callback binding, leaving
  array insertion explicit. Fresh/cached field attachment and `spawnEnemy` use
  it. `spawnAlly` constructs at the origin, writes its pose, attaches/binds, then
  appends to the current wrapper's live ally array. Weapon cap checks use that
  same wrapper; the existing emitter Point crosses field coordinate boundaries
  before birth.
- `World.tickActor` no longer repairs parentage or callbacks implicitly. Stage
  artwork enumerates each attached wrapper's owned children, including a child
  absent from both Run arrays. Detached wrappers keep ownership but their clips
  do not advance as stage children. Actual queued removals retain their existing
  source phases; array replacement by collapse/arrival cannot erase a parent.
- Raw host fixtures explicitly import their omitted addChild/SetCallback phase
  through `tools/fixtures/actor-attachments.ts`. This helper is used only by
  artificial unit/browser fixtures. It bootstraps each fixture object once and
  never infers later removal or reparenting. Tests for actual removal now call
  `detach`, and tests for retained raw-array absence preserve attachment. There
  is no production array-discovery fallback. Gameplay births remain explicit.

## Validation and limits

The parent compared the preceding committed implementation (`e76507b`) with this
working implementation using the same literal actor operations. Before/after:

| Operation | Before | After |
| --- | --- | --- |
| Attach enemy2, ally3, enemy4, then synchronize | 2,4,3 | 2,3,4 |
| Re-add enemy2 to that same parent, then synchronize | 2,4,3 | 3,4,2 |
| Replace both raw arrays with empty arrays | Child detached | Child retained |
| One paused stage frame for a display-only child | Art age0 | Art age1 |
| Swarm/mine birth before first actor Run | No parent | Actual field parent |

The ignored `test-results/actor-parent-migration/before-after.json` records those
results and the isolated baseline source location. New regression assertions also
cover raw-only objects remaining unparented, physical cross-wrapper reparenting,
no gameplay Run for a display-only child, explicit removal stopping its artwork,
life15, summon cap and queued callback removal. Existing behavioral assertions
remain; the former assumption that an array edit detaches a clip is corrected.

Formatting/check pass **1,011 tests /8,863 assertions**. The production build and **54 affected mock/supplied-art browser cases** pass,
with zero failures, skips or flaky cases. Every pre-build source digest matches.
Private fixture copies change only port3102→3436; all assertions remain intact.
The nested retained-wrapper, Healer lifetime and NPC deactivation captures were
inspected. Both owned server ports3435/3436 are free. The ignored report records
the exact build and file identities, browser report and cleanup.
No push, PR, deployment or merge belongs to this local validation.

The renderer still has raw-array population approximations; this actor owner is
not the complete retained field tree. Authored slots, tutorial/helper instances,
pickup/effect attachment poses, collapse transforms, exact dynamic width/hit
queries and complete removal error boundaries remain separate work. The existing
radius425 beam result remains contradicted by original execution. This work does
not establish ordinary earned boss/win, Adobe, pixels/audio or full-game parity.
