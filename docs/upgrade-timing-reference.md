# Retained upgrade menu timing

The source is `re/bt3/export_scripts/scripts/UpgradeMenu.as` in the sibling research
repository, checked against its `export_pcode/scripts/UpgradeMenu.pcode` where the
decompiler obscures order. This extends [the card presentation](upgrade-presentation-reference.md).

Setup (675–702) registers Run, creates30 transparent550×450 history bitmaps and
captures the world parent once into its working bitmap. Run (810–849) starts at
counter0 with foreground alpha1. On even post-increment counters2 through38 it
saves the working image, blurs it with BlurFilter(2,2,2), then increments the history
index. There are19 saved frames. It attaches the separate bottom-control handlers
when the entry counter is38, on the normal39th Run. Loaded cards and their Edit
buttons attach independently and can be used earlier. There is no opening fade.

ViewerUp (852–899) stores the selected code and calls PlaceAvatar(0) synchronously
before setting the closing flag. It removes card/Edit listeners, leaving already
attached bottom handlers active. Each closing Run first decrements the counter,
then subtracts0.025 from the previous foreground alpha getter and assigns it to the
six named clips. Keep the signed quantized display getter; clamp painting only.
The root shade and bitmap are outside that alpha chain. On even counters it draws
the saved image over the working bitmap, without clearing, then decrements the
history index. The first reverse slot19 is unwritten/transparent. From counter39,
there are40 writes and20 reverse draws; Destroy occurs on the41st closing Run.
Early selection reverses only the history accumulated by its actual counter.

Destroy (769–807) removes listeners/previews and restores the world's shared saved
mode through `_‑7x`. `World.placeUpgrade` therefore replaces the tank while retaining
the attached menu; `finishUpgrade` restores its return mode only at completion.
PlaceAvatar may overwrite that shared mode when secondary help is first opened.
`selectUpgrade` remains the headless fixture adapter that performs both operations.

Creator/viewer children retain the same menu clock, bitmap, alpha and index. The
menu continues Run while they are shown. Creator return `_‑Zo(false)` checks the
current progression slot: an existing/saved slot destroys directly; an empty slot
calls SecondSetup on the same menu, reusing initialized offers without resetting its clock.
Confirmation No also destroys directly. A card reversal may finish while a bottom
handler's child is displayed. The nested viewer owns its own Update in this app;
do not add a second update merely because the motion model emits that command.

The browser-owned `UpgradeMenu` service retains the clock and shared premultiplied
bitmap history independently of React screen mounts. Components observe it for
painting and accessible button state; `World` stores no bitmap or DOM objects.
The existing pause bitmap math supplies save-before-blur and source-over reversal.
The upgrade UI no longer adds CSS blur over that history.

The [frame-ownership follow-up](upgrade-frame-reference.md) refreshes the graph and
flash paint at the interface callback, fixes newly registered listener cohorts,
separates skipped World.Run from attached art and retains explicit background events.
Full captured-layer equality, constructor/frame
script scheduling, loaded-runtime provenance and Adobe parity are not established
by these source contracts or the focused browser fixture.
