# Actor artwork ownership before complete field queries

This audit records the remaining actor provider boundary at `bfc5fa6`. It does
not qualify actor playback or install a gameplay query adapter. Physical actor
membership and attachment geometry are implemented separately; neither proves
how retained authored children advance after their outer field is detached.

## Current implementation and demonstrated host policy

`World.advanceArtwork` enumerates the avatar and `actorParents.owned(field)` only
for `attachedFields()`. An actor can retain its actual detached-layer parent and
still be excluded from that clock cohort. `advanceTankArt` increments `artAge`
only when selected. Status decorations and protection clocks share that call.
The existing `actor-parents.test.ts` display-only test passes and explicitly
freezes `artAge` after direct detach. That is a demonstrated reconstruction
policy, not original-runtime evidence for cached actors or removed references.

The parent reran that exact existing test at `bfc5fa6`: one case/four assertions
pass. Ignored `test-results/actor-clock-audit/current-host.log` retains the result.
It is not a regression proof or a reason to preserve the policy if original
execution contradicts it. Direct child removal and detaching its ancestor are
also different operations and require separate original controls.

## Original source narrows the unresolved case

Read-only sibling `re/bt3/export_scripts/scripts/`:

- `TankData.as:443–563`: `_‑Tr` constructs actual mounted clips, sets X/Y,
  scaleY/scaleX and rotation, adds each child, then registers its role. The
  display instance and raw saved part record are separate objects.
- `BTAGameWorld.as:313–364`, qualified pcode method `_‑4j` beginning at1055:
  departure calls `Deactivate`, removes the old field and sibling layers,
  then stores actual enemy clips (`mc`) plus pose scalars. It does not replace
  each cached enemy with newly constructed artwork.
- `_‑0D.as:1117–1137`: uncleared fields bypass the cleared-field destruction
  branch. `_‑G0` at128–169, qualified pcode beginning at371, restores the actual
  cached `mc` into the new enemy layer, rewrites its outer pose and callback and
  redirects primary targets. It does not reconstruct mounted children.

Original generic-effect and carrier captures establish that their retained
unparented roots can advance, including removed roots. Those different classes
do **not** prove the actor/mounted-child clock policy. The source identifies a
reachable retained identity whose actual frames must be measured; it does not
alone establish the scheduler outcome. No actor-clock production change follows
from this audit.

| Read-only source pair | SHA-256 AS / pcode |
| --- | --- |
| `TankData` | `20a187f6db832a80b643cfdd8b8acb39c6859b43768dd594b971bf661687d9d8` / `4f1eec91c07616eaa1895078047c1423a21ce0253192d61161dfdc8f120491f0` |
| `BTAGameWorld` | `66ae092b31799f36f776f777a576d52e10d3ce5e7901fcedd2716c4fa7be951e` / `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b` |
| `_‑0D` | `a3cb66e601053b5c615003b01077cfc96752554f85352a62feb278004750ac24` / `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |

## Geometry reads must not acquire playback ownership

`AssetPack.partClip`, `StatusPlayback.clip`, `infectionClip` and
`forcefieldPartClip` currently lazily initialize or advance private clip trees
to logical ages. Painting and existing contact share those trees, but calling
these methods from the new pure field provider would make the query perform
constructor/clock work. `forcefieldRadius` can also construct its cloned parts.
`nativeClipGeometry` is pure only after its caller already owns the retained
`SwfClip`; using a lazy getter first does not make the entire operation pure.

A complete actor provider therefore needs explicit already-constructed child
instances and their source setter matrices, physical child order, retained
status/infection/protection identities and independent clock ownership. Removed
children cannot be recovered from flags or raw Run arrays. Alpha/hidden paint
is not removal. The forcefield wrapper must contain its splash and cloned-tank
runtime mask, rather than pretending that two flattened renderer entries are
two original actor children. Raw part records and Pixi transforms are not an
exact numeric display oracle.

The next runtime control must distinguish attached, detached-ancestor,
directly-removed and reattached cases with retained references and genuine
original mounted timelines. Measure constructor/ENTER/EXIT phases and original
root/child identities without substituting current reconstruction ages. Preserve
existing tests and frozen evidence until that qualification justifies a change.
The native provider must remain incomplete instead of silently constructing a
different display state during a query.

No new browser/server, original execution or production edit belongs to this
audit. Ordinary encounter timing, global event/RNG equality, arbitrary part
transforms, Adobe/pixel/audio and full-game parity remain unproved.
