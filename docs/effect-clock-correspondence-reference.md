# Corrected effect replay correspondence and scheduling experiment

This local follow-up starts above PR155 head8a0b055. It changes the optional
candidate comparison, not the original fixture, probe, capture, production
SwfClip, effect engine or renderer. The published PR stays fixed. The original
[effect qualification](effect-clock-original-reference.md) remains the oracle.

## A comparison-path defect, not45 independently proven identity bugs

The probe's paths follow actual getChildAt/render order. The previous candidate
walked `[...clip.children.values()][index]`, which follows a retained Map's
insertion history. When an earlier depth disappears and is later replaced, those
orders diverge even though the candidate's current placements and renderer order
remain correct. Collapse supplied exactly that case.

`effectClockChildAtPath` now follows the current placement at each index and then
looks up its retained object by depth. It does not initialize or advance any clip.
The new regression removes/replaces earlier depths at two levels while retaining
a later object. The former Map-order implementation fails; the corrected walk
passes all ten assertions. Transient original null lookups are not synthesized
or claimed emulated by this helper.

Replaying the same frozen oracle against unchanged production code now yields:

| Candidate | Multi-frame retained comparisons | Frame differences | Identity/correspondence differences |
| --- | ---: | ---: | ---: |
| Original comparison paths |660|59|45|
| Correct current render paths |660|26|0|
| Correct paths plus isolated child-before-parent experiment |660|0|0|

All33 collapse-frame differences and45 correspondence differences came from the
comparison-path defect. The remaining26 frame differences are conversion's
retired four-frame children: the original samples observe frame4 at EXIT20,
frame1 and parent-null at EXIT21, then retained frame1 at later sampled phases.
The unchanged candidate removes the child before advancing it and retains4.
These are finite observations, not proof of an unconditional reset-to1 rule.

## Isolated scheduling experiment

The [tagged MovieClip scheduler](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/movie_clip.rs#L2533)
enters existing render children before advancing the parent's timeline and
processing its removals. Tag SHA256 is
`fc229d96ab6fced20391cf810d9d89a2118803cb7f5ce48ddf6967e52e35700a`.
That is a primary-source inference, not authentication of the loaded WASM revision.

An ignored Bun import-time control advances existing children to the next age
before the parent tick. No production file is swapped. With the corrected paths,
all660 sampled retained frame comparisons and correspondence checks match. The
experiment does not force child frame1, rewrite expected values or keep all
removed descendants running. It also does not implement before/inside-ENTER
root cohorts, source phase-specific script delivery or a production effect owner.

The original fixture remains byte-identical, SHA256
`6dcb3cae711504fa4cbdfe334838de144c3b2bddc8aff0ee8cf4b604d62406d9`.
Exact controls/reports are ignored under `test-results/effect-clock-review/`:
`insertion-order-before.log`, `compare-corrected-paths.log`,
`run-a1/candidate-frame-comparison.json`, `child-first-preload.mjs`,
`child-first-comparison.log` and `child-first/candidate-frame-comparison.json`.
The previous reports remain in the child-owned capture directory.

## Production integration boundary

Retain every generic root from construction, with independent source-qualified
before/inside-ENTER epochs, non-resetting registration and continuing engine-
removed root clocks. Timeline child removal is a different boundary: do not
generalize the root result into keeping every retired descendant running, or
reset every removal to1 simply because the conversion sample lands there.
Keep frame scripts, own placement changes and retained descendant identity
separate. Compare the final owner against the frozen source frames and poses;
zero sample mismatches alone cannot qualify arbitrary phases or caller writes.

The399 original child-lookup holes, unavailable isPlaying getter, complete
ENTER geometry, global constructor/event/RNG and ordinary gameplay remain open.
REA events are still incomplete/equality-ineligible. No Adobe/full-game parity
or complete shape-query claim follows from this corrected comparison.


Formatting/typecheck and1,167 unit tests /17,803 assertions pass. The old
Map-order control fails the new ten-assertion case; corrected correspondence
and the isolated scheduling control are recorded separately. No browser flow or
production file changes, so no new application E2E is claimed for this tool fix.
