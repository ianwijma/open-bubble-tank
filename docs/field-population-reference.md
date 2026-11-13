# Physical field population projection

`simulation/field-population.ts` combines the existing field, actor, pickup and
effect owners into one transient tree. It is local above PR154, whose published
head is unchanged. No application caller uses this seam yet: it is the population
input for the forthcoming separate shape-hit and Script-width traversals, not a
replacement for either query or proof of complete field geometry.

## Source and representation

Read the [complete source inventory](live-field-display-ownership-audit.md),
[field wrapper poses](field-wrapper-state.md), [actor ownership](actor-display-ownership-reference.md),
[pickup ownership](pickup-display-ownership-reference.md) and
[effect registrations](registered-effects-reference.md). Those records retain
qualified source locations and their actual implementation/observation limits.

`readFieldPopulation(world, field)` starts with the actual retained1551 tree.
It retains authored helpers even at zero alpha, both depth-mask nodes/ranges,
all four invisible detail markers and the tutorial's actual parent/frame. The
first tutorial is a root child; later tutorials precede dynamic actors inside
enemyLayer. Numeric inspection of original1667 finds only one nested sprite1658,
with a single frame; the remaining selected-frame children are static text or
leaves. Original bfStartDisplay registers stop scripts on frames1–6. Its chosen
frame is a retained owner read, never inferred from the field's mutable map data.

The projection inserts physical children at their source slots:

| Slot | Authority | Preserved state |
| --- | --- | --- |
| enemyLayer1547 | `ActorParents.owned(field)` | Actual addChild order, Tank object identity, current transform scalars and direct-child tokens |
| lifeBubbleLayer1545 | `PickupDisplays.owned/read` | Actual pickup object, constructor denomination/symbol and existing retained SwfClip |
| bottom117 inside1540 | `RegisteredEffects.owned(actualLayer)` | Physical effect/carrier identity and position, independent of request or completion context |

Top effects, bullets, highlights, screen effects and the avatar are World siblings
and are not inserted into the receiver. Requests do not become display children
until their source queue tail registers them. A destination request can therefore
appear under the outgoing bottom117. A subsequent reparent appears under its
new physical owner even when its compatibility completion context stays old.

No `dead`, alpha, Run-array or UID filter decides membership. WipeTank leaves an
empty owned actor node until actual detach; identical UIDs retain distinct objects.
A detached field still has its actors/pickups, while actual removal of its117
container removes that container from this receiver traversal. It does not erase
the retained engine object's independent parent reference.

Projection nodes and new arrays are frozen. Referenced Tank/Effect/Pickup objects
and qualified pickup trees remain their existing owners' live identities; this
is not a deep historical snapshot. Use the tree synchronously, reread after any
callback or display mutation, and do not cache it using FieldDisplays.revision
alone. Reads perform no attachment/discovery, native construction, stage advance,
entropy draw or UID allocation. Unresolved under-avatar sizing rejects the read.

## Verification

Seven cases exercise the source boundaries above, including next-field queue
ownership and actual layer reparenting, rather than only echoing node counts.
The standalone cases pass49 assertions. Eight isolated import-time mutations
are independently rejected by assertion failures: actor Run-array discovery,
dead filtering, pickup Run-array discovery, admission of queued effects, omitted
masks, omitted detached children, wrong tutorial frame and bypassed size guard.
An unmodified import-time control passes. Production files are never swapped
for these controls.

`bun run format` and `bun run check` pass1,147 tests /17,417 assertions. Exact
logs, mutation preloader/results and the original tutorial's numeric inventory
are retained under ignored `test-results/field-composition/`. Application E2E is
not repeated because this new module has no application caller and changes no
browser flow. The preceding registration correction's twelve passing browser
cases retain their own build/source identity; they are not this seam's E2E proof.

## Remaining integration

This tree covers the modeled physical owners; it is not a geometry provider.
Actor nested artwork/protection, original leaf/text geometry, morphs, drawn
rocket lines, retained generic effect poses, mask conjunctions and per-leaf
Script arithmetic must be supplied before migrating field queries. Dynamic
transform scalars are not advertised as independently qualified full matrices.
Conditional debug helpers and source effect classes outside the modeled offline
roster still require explicit reachability/population handling if introduced.
Do not silently omit an unsupported node, use painted alpha as geometry or treat
a circle/background-only fallback as the complete receiver. Generic-effect clock
qualification remains separate. Global constructor/event/RNG, ordinary earned
progression, Adobe/pixel/audio and complete-game parity remain unproved.

There is no PR, push, merge, deployment or protected-ref change in this local step.
