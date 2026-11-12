# Upgrade capture and frame ownership

This layer completes the capture/frame handoff described in
[upgrade timing](upgrade-timing-reference.md). Its primary game evidence is the
sibling repository's `re/bt3/export_scripts/scripts` and matching exported bytecode.
The contracts below are source-derived; they do not establish whole-frame parity.

## Setup capture

Main.Run case3 invokes World.Run (`Main.as549–552`). The upgrade opens during the
interface phase: `_‑3F` saves/stops world mode, stops backgrounds, constructs the
menu, calls Setup and then adds it to Main (`BTAGameWorld.as1403–1411`). Setup
captures the world parent before that selected World.Run finishes its field/avatar
tail (`UpgradeMenu.as675–702`). Do not recapture after events drain or React mounts.

`World.onUpgradeMenuOpen` reports this synchronous boundary without storing browser
objects. `UpgradeMenu` requests `StageCapture.capture({refresh:true})`. All retained
capture layers prepare before any are copied. GameViewport refreshes its Pixi graph
from current World/settings; GameRenderer.capture alone only rendered the existing
graph. The pixel HUD uses the interface snapshot already captured before progression.
MainStage also paints current flashes, whose normal RAF paint occurs too late for
this capture. Preparation advances no game/art/effect clocks. MainBackground's
capture callback already paints its current model; queued camera shifts are not an
extra background Update.

The captured working bitmap remains browser-owned. Later menu frames alter its
history rather than sampling the live game again. Default captures used by existing
callers retain their previous behavior; refreshing is explicit.

## Recipients and phases

The inspected [Ruffle v0.7.1 broadcast implementation](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2.rs#L379-L453)
deduplicates recipient objects, appends new ones and fixes the recipient range before
dispatch. A menu created during Main.Run therefore starts Run on the next broadcast.
Removing a background handler and re-adding it preserves the live object's earlier
recipient slot; it does not move that object after the newly created menu.

Main's effects handler registers first (`Main.as269`, `_‑1w.as33`); Main.Run is added
at372. Main creates both backgrounds at514/517, each registering at `_‑Rm.as34`.
The later UpgradeMenu follows them. The stage expresses the audited path as:

```text
one fixed-frame cohort
  Main effects
  beforeStep → mainStep (selected World.Run)
  both background Updates
  step (later menu Run)
draw all currently attached views
```

The same cohort spans every frame phase, with removal checks. Fresh subscriptions
can draw immediately but enter callbacks on the next logical frame, including a
later catch-up frame in the same RAF. Elapsed callbacks and draw retain their
existing behavior. This is not an implementation of all AVM2 priorities, weak
references, per-target handler snapshots or re-registration identities.

## Main4, artwork and backgrounds

Main.Run case4 skips World.Run (`Main.as532–558`). The viewport reads the retained
upgrade owner once at frame entry: its birth frame completes the already selected
World.Run, including one artwork advance; later frames advance attached artwork
without interface/combat/status polling or the World's hit-sound timer tail.
Wall-time callbacks and shared Main effects keep their existing independent clocks.
Final menu Destroy runs after that frame's Main turn, so gameplay resumes next frame.

Background stop/resume belongs to explicit World events, not an inference from
`world.mode`. `_‑7x` resumes both backgrounds (`BTAGameWorld.as467–475`), even when
PlaceAvatar has opened secondary help and changed the shared return mode to1
(1065–1077). Backgrounds have already passed their turn on Destroy's frame and
first update in the next broadcast. Pause/resume and win/continue also issue their
own commands. World records its last request; Settings efficiency may independently
force a stopped background to resume. Renderer recreation does not reapply that
World request on every draw or overwrite the live Settings override.

## Limits

Tagged-source identity is not proof of the compiled/loaded runtime's provenance or
Adobe behavior. Exact native constructor/frame-script scheduling and complete root
matrix/capture equivalence remain unverified. Capture uses root-local coordinates;
it does not rasterize browser CSS shake transforms or the added DOM pause affordance.
These explicit capture-coverage limits are separate from stale Pixi/flash paint.
The controlled full-health/flash fixture tests this boundary, not an ordinary earned
upgrade or a full boss/win run. Missing-default loading and the full offline game
comparison remain open.
