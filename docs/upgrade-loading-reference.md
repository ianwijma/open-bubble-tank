# Authored upgrade slots and retained loading

Evidence is the sibling `re/bt3/export_scripts/scripts/UpgradeMenu.as` and matching
`export_pcode/scripts/UpgradeMenu.pcode`. The numerical import reads the supplied
SWF; `BubbleTanks3_fla/LoadingAnimation_199.as` supplies its frame25 jump to3.

`_-96` (210–298) requests authored slots1–3 with class `liveClass + slot - 2`, keeping
valid classes1–6. The request tag stores class then slot. `SecondSetup` (611–640)
counts3 requests, subtracting one for constructor-cached class1 or6. These cached
and live class reads are distinct. Initializing the preview array creates its index0
sentinel even when every default is absent.

A null `GetDefaultTank` result skips success; it never decrements the pending counter
(`_-aG` 489–539, bytecode null branch0259→038f/decrement037c). Successful previews,
fields and listeners precede that decrement. The callback tail finalizes only at
counter0, executing three independent removal/recenter blocks in source order
(543–603). Failed repeated removal aborts its block before further shifts. The middle
block tests viewer2's name before writing viewer3; that source guard is retained.

Root1935 retains its named children. Frame1 puts viewers offstage and displays the
loader; frame2 displays the finalized viewers. Frame3 moves the relevant foreground
offstage for a child screen; frame4 retains those placements for confirmation. The
import records all four frames and loader1919, its label1918, and animation1057's
five dot transforms/alpha values. Animation frames1–2 play once, then3–24 repeat;
frame25's script immediately jumps to3.

On an unsaved creator return with an empty progression entry, `_-Zo(false)` goes to
frame1 and calls `SecondSetup`. Its initialized array selects `_‑aG([])` with counter0:
no new default lookup or preference rolls occur. Existing tank, card, preview and fit
identities remain. An existing/saved progression entry destroys the menu directly.

The browser service owns the pure loading state beside the retained motion/bitmap.
One mounted, inactive upgrade panel survives creator/viewer visits, preserving its
renderer, fitted placements, canvas nodes and independent preview age. Root-frame
positions and input availability stay separate from motion. Selection removes card
handlers while bottom handlers remain live during reversal.

The source constructs previews synchronously. The browser's lazy renderer is an
explicit readiness adapter: a successful receipt completes after its fitted canvas
first paints. This does not establish exact constructor, asynchronous initialization,
RNG or native frame-script scheduling equivalence. Unit/source checks and affected
browser validation are recorded in the fidelity ledger; complete capture/Adobe/full
game parity remains unproved. Retired search and parts navigation remain omitted.
