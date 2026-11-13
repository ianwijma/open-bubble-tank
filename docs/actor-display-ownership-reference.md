# Ordered actor display ownership

This local follow-up separates the enemy layer's actual children from its enemy
and ally Run arrays. It implements the actor portion of
[the complete field inventory](live-field-display-ownership-audit.md), without
claiming that the complete field query is implemented. The renderer follow-up
below now consumes this actor owner; other field populations remain separate.

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

| Operation                                           | Before         | After               |
| --------------------------------------------------- | -------------- | ------------------- |
| Attach enemy2, ally3, enemy4, then synchronize      | 2,4,3          | 2,3,4               |
| Re-add enemy2 to that same parent, then synchronize | 2,4,3          | 3,4,2               |
| Replace both raw arrays with empty arrays           | Child detached | Child retained      |
| One paused stage frame for a display-only child     | Art age0       | Art age1            |
| Swarm/mine birth before first actor Run             | No parent      | Actual field parent |

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

The actor renderer migration below supersedes the former raw-array tank
population approximation. This actor owner is not the complete retained field tree. Authored slots, tutorial/helper instances,
pickup/effect attachment poses, collapse transforms, exact dynamic width/hit
queries and complete removal error boundaries remain separate work. The existing
radius425 beam result remains contradicted by original execution. This work does
not establish ordinary earned boss/win, Adobe, pixels/audio or full-game parity.

## Renderer follow-up on b2aa47b

`GameRenderer` now enumerates only `actorParents.owned(field)` for each attached
wrapper. Its retained view map uses the actual `Tank` object, not its numeric UID.
Each field has an actor parent container; children follow the owner's addChild
order on every draw. Same-parent raising and cross-parent reparenting retain the
same TankView. Actual detach destroys only the removed view; later attachment
constructs a new view from the retained asset pose. Unrooted field projections
are disposed; this does not mutate the simulation's retained parent records.
The avatar remains a separate sibling above these actor groups. Existing
`fieldTransform`/`fieldPoint` presentation remains separate and is **not** an exact
source collapse-transform implementation. Backgrounds, captions, pickups, effects,
masks and tutorials are not integrated into a complete field tree by this change.

The companion `TankView` change mounts only entries present in `displayChildren`.
Missing parts detach instead of being sorted to Infinity and re-added. Hidden
attached parts retain their containers. Native status/protection entries preserve
their supported decoration, mounted-shield key and forcefield-generation identities;
removing a part and explicitly restoring its key reattaches its retained root.
Detached cached roots are also disposed when the TankView is destroyed.
No dead/dataActive visibility gate substitutes for child membership. Mock stun
paint has a separate status child, so it cannot remain in the protection graphics
after teardown. Infection paint/filter creation also requires actual attachment.

This follows `TankData.as:620–641` and qualified
`export_pcode/scripts/TankData.pcode:2977–3039`: WipeTank repeatedly deactivates
registered children and calls `removeChildAt(0)`, then clears its data reference.
`_-Zx.as:791–833` clears TankData before setting its dead flag and invoking its
callback. The outer clip is removed later, through `_-0D.as:760–775` callback
queues and the field's explicit removal paths (including `_-aT:1140–1152`).
A dead flag by itself therefore cannot replace these actual child operations.
Enemy/ally insertion remains the distinct addChild phase at `_-0D.as:474–487`
and `1382–1398`; avatar replacement uses its own World sibling insertion at
`BTAGameWorld.as:1052–1061`. Source paths are relative to the research repository's
`re/bt3/export_scripts/scripts/`, except the qualified-pcode path above.

### Failed-before and finite browser proof

The artificial `actor-render-ownership` fixture runs production GameRenderer,
TankView, status/protection views and AssetPack with mock or the supplied original
SWF. Initial raw actors explicitly import their omitted attachment through
`tools/fixtures/actor-attachments.ts`; subsequent changes use actual attach/detach.
The tool reads the retained renderer tree; it adds no production fixture API or
array-discovery fallback. A deliberate duplicate UID/design pair is an identity
control, not an ordinary source encounter.

Replaying the same operations with the four renderer files restored from prepared
base `b2aa47b113986dacc89e1d4251c4e6e81aa72f63` fails both browser cases:

| Operation                                 | Prepared base                             | Changed renderer                         |
| ----------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Enemy A, ally B, enemy C, display-only D  | A,C,B; D absent                           | A,B,C,D                                  |
| Raise A in the same parent                | A,C,B                                     | B,C,D,A                                  |
| Clear both Run arrays                     | All actor views lost                      | All owned views retained                 |
| Reparent B with a stale old-array alias   | Retained-view reparent fails              | Same view, new actual parent             |
| Two objects with identical UID and design | One aliased view                          | Two distinct views                       |
| Wipe attached A                           | Empty outer view discarded                | Same parented outer, zero children       |
| Wipe separately painted protected tank    | 11,990 mock /11,825 native painted pixels | Zero pixels /zero children               |
| Remove/re-add a mounted part              | Missing part silently re-added            | Root detaches, then same root reattaches |

Positive controls keep actual dead status, infection, mounted shield/impact and
forcefield entries; they compare retained identities and finite paint before
explicit teardown. Repeated draws preserve views, retained nested pose state,
art age, display membership and gameplay RNG. A paused stage frame advances a
live display-only actor once. Explicit detach destroys its relevant view while
unrelated views survive. The two wiped standalone targets have zero extracted
paint even with stale status/shield scalar state.

Existing crossing tools now inspect the field groups' actual tank children,
retaining every coordinate/count/body-pixel assertion. Nested crossing setup now
explicitly detaches the generated actors before replacing their raw arrays with
its isolated population; the corrected renderer properly exposed those retained
children. This is a fixture setup correction, not production array reconciliation.
The mock forcefield lifecycle tool measures an empty extraction target when its real forcefield child
is absent, instead of indexing the old always-present placeholder. No existing
browser assertion is removed or weakened. The initial broad run caught these
fixture assumptions; the first gallery also composited transparent captures over
previous tiles. Separate capture slots correct that visual-proof defect.

### Local validation and remaining objections

Formatting, TypeScript and **1,013 tests / 8,881 assertions** pass. The final
**62 renderer/ownership cases plus two pause/Info portrait cases** pass in mock
and supplied-art coverage, with zero failures, skips or flaky cases. All 658
pre-build source digests match. Ownership, native nested-crossing/protection and
pause/Info captures were inspected. Owned 3455/3456 servers stopped and ports
are free. Full commands, artifact identities and earlier failed attempts are
recorded in the ignored
`test-results/renderer-owned-actors/verification.md`. Commands:

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf \
  bun run test:e2e --config test-results/renderer-owned-actors/playwright.config.mts
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf \
  bun run test:e2e --config test-results/renderer-owned-actors/portrait.config.mts
```

The private config owns only3455/3456. Copied specs are `.mts`; their only edits
are port and absolute-import routing, with original assertions preserved. The
fixture is artificial: it proves these renderer contracts, not ordinary encounter
reachability, an original-runtime/Adobe differential, full pixels/audio parity or
complete boss/win progression. Actual field slots/effects/pickup identities,
complete removal error boundaries, exact field transforms and live width/hit
queries remain open. World/ActorParents gameplay and asset services are unchanged.
No SWF, media, capture, dependency/build output or remote change belongs to the
local commit.
