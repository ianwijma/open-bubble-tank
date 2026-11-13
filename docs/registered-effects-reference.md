# Registered effect layers and ordered completion

This local implementation replaces per-field effect ownership with one world
engine. It is one prerequisite of the complete field display query, not that
query itself. Read [the field inventory](live-field-display-ownership-audit.md)
for the actual field descendants and excluded World siblings.

## Source phases

Original paths are relative to the sibling research repository's `re/bt3`:

- `export_scripts/scripts/_-0D.as:976–990`: a queue holds the already constructed
  clip, supplied coordinates, layer name, rotation flag and callback. It does not
  attach that clip. `_‑2c.CreateEffect` resolves the first registered matching
  name, applies the caller's writes, adds the same clip and appends a completion
  record (`export_pcode/scripts/_-2c.pcode:237–339`).
- `_-2c._-8o`, `_-Z7` and `_-0S` append registrations, resolve the first name and
  unregister the first name, respectively. Removing a name is not removeChild.
  The old physical parent and the currently resolved name can therefore differ.
- `_-2c.Run` first collects every ready clip identity. `_‑9p` invokes its callback
  while attached, rereads the indexed completion record, removes through current
  layer-name resolution and then splices the record. A callback-created record
  is retained but is absent from the preceding ready snapshot. Callback failure
  prevents the following removal. See AS `_-2c.as:262–304,343–362` and qualified
  pcode's `_‑9p` callback-before-remove chain around1664–1676.
- `BTAGameWorld._-4j` clears the registered engine without callbacks, unregisters
  outgoing top/bottom, deactivates and detaches the old layers, then promotes and
  registers the next ones (`BTAGameWorld.as:312–392`). The screen layer persists.
  Next-field queues still resolve outgoing registrations before that promotion.

## Implementation and authoritative reads

`RegisteredEffects` separates concrete top/bottom/screen layer instances, ordered
name registrations, actual ordered children and ordered completion records.
`parent(clip)` and `owned(layer)` read physical ownership. A bottom layer belongs
to its actual field's nested lower container; top/screen are World siblings.
Creating a next wrapper constructs its layer identities without registering them.
Reads do not create layers, move clips, draw random values or advance clocks.

`FieldRuntime.effects` is a read-only compatibility snapshot of the engine's
records. `.pending` includes logical queued carriers as well as registered
carriers; `.queuedCarriers` isolates the former and `effectEngine.pendingFor`
isolates the latter. Their context field supports existing host observations; it is
not a physical parent or the source of the complete geometry population. Do not
build a field query by filtering those snapshots. The query must visit the actual
bottom layer's `owned` children under the wrapper's retained transforms.

World polls one engine instead of filtering separate field arrays. It advances
registered host artwork once, keeps direct controller removal separate, and
clears old records before arrival's Deactivate/cache writes. Queue contents are
not display children and a global engine clear no longer silently overwrites
unprocessed queues in other wrappers. Artificial incoming-effect fixtures now
queue requests explicitly. Artificial gallery replacement explicitly detaches
and reattaches its retained clip objects instead of assigning a runtime array.

The source reread after a callback is intentional: saving an entry or filtering
into a replacement array can erase a newly created callback carrier. A changed
name resolution also cannot silently detach a child from a different parent.
The known layer/record-read/removal errors end the current World listener while
its independent artwork tail continues.

## Verification

An isolated comparison against preceding commit `b2aa47b` demonstrates two actual
before/after contradictions using the same World operations:

| Observation inside/after a Massive callback              | Before     | After      |
| -------------------------------------------------------- | ---------- | ---------- |
| Newly scheduled carrier survives the callback pass       | 0 retained | 1 retained |
| Earlier callback sees later ready artwork still attached | false      | true       |

Eight new regressions cover those cases plus physical outgoing ownership of
next-field requests, preservation of modified clip identity, duplicate name
registration/first-name removal, callback-before-detach, snapshot completion,
no-callback clearing and arrival promotion. Existing assertions remain; the
previous artificial next-layer callback fixture now uses the one actual outgoing
registered engine and additionally proves next's pending population is empty.

Formatting/check passes **1,021 tests /8,918 assertions**. The production build
and literal affected `bun run test:e2e` pass **24 mock/supplied-art cases**, with
zero failures, skips or flaky cases. All536 pre-build source digests match.
Private spec copies change only fixture URL3102→3486. Owned3485/3486 servers exited
and both ports are free. Exact command/configuration, source snapshots, baseline
comparison, build identity and browser report are ignored under
`test-results/registered-effects/`. No publication or deployment is claimed.

## Remaining phase and geometry objections

The [construction-clock continuation](carrier-clock-registration-reference.md#queue-and-clock-implementation)
now replaces immediate callback registration with preconstructed carriers and the
source field tail queue. It separately qualifies before-ENTER and inside-ENTER
construction against preserved-original captures. World retains its previous
owner-death/replacement callback guards. They are not justified as the complete
original callback/error contract by this migration.

Ordinary effect host ages and the explicit collapse frame override remain finite
adapters. Renderer-owned random/timeline poses, exact effect display setter
writes, broader constructed-but-unattached artwork clocks, dynamic drawn lines/shocks and complete
constructor/event/RNG scheduling still need qualification and retained geometry
binding. This implementation does not resolve those by rebuilding `{symbol,age}`
at query time. Full wrapper/pickup/effect geometry, beam wall equivalence, ordinary
earned boss/win, Adobe, pixels/audio and full-game parity remain unfinished.
