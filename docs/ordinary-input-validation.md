# Ordinary supplied-art observation on the prepared stack

This bounded playthrough did **not** complete normal progression. One unique
upgrade, Infiltrator, was earned through an actual offered button. No second
upgrade, boss or win was observed. Repeated damage and observer mistakes limit
the result; this is not evidence that ordinary completion is impossible.

## Resident code and supplied assets

The fresh game used prepared head
`4353d497f518e1e0f3e8aff8243fabebe6b3cddd`, tree
`b4ebc5f835b3e9c5c1474a926d01cbbb08829860`, with isolated production BUILD_ID
`hctax7kWIEBawrAGbAPBw`. A `git archive HEAD` snapshot reused existing local
dependencies through symlinks, without installation or upgrades. All 668 tracked
snapshot files matched the prepared head after build, and all 12 loaded JavaScript
response bodies matched that build. The workspace root `.next` stayed absent.

The user supplied their local `re/bt3/uncompressed.swf` through the public file
input. Its SHA-256 was
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Chromium 157.0.8103.38 ran headlessly with SwiftShader in a fresh temporary profile.
Normal Play used default starting tanks at the original 550 × 450 stage size.
Public Settings changed camera zoom from 100% to 50%, an explicit recreation
usability adapter. No old browser session or CDP 9230 connection was used.

The parent subsequently reported the authorized PR139 merge at master
`12bf09d1c28405a3fb484e8edf8f73f9736cdfad`, tree
`da9189093b3c0ad116f49da969bb80c960e6821e`. That update does not change this
resident build's identity. The observation was already finished; no rebuild,
reload, new validation or independent review of that merge followed.

## Public result and duration

- The earned offer at 2026-11-13 02:00:51.389 UTC showed Infiltrator and Sturdy.
  One public click selected Infiltrator, followed by an actual dialog-hidden wait.
  The offered menu and subsequent HUD were captured. No duplicate offer click
  occurred.
- The maximum observed Infiltrator HUD was 93/100. Damage caused repeated
  downgrades; collection restored the already selected Infiltrator without new
  offers. Those restorations are not additional earned upgrades.
- The terminal HUD was **Infiltrator 20/100**, with 80 bubbles left. The public map
  showed **position (-4,2), 65 fields and 74 traveled paths**. These displayed
  totals are not private cleared-field counts.
- Nine same-game controller intervals total **45:01.041**, retaining 5,924 public
  HUD/map/input observations. This includes normal observer/menu waits and end
  capture overhead, excludes inter-segment paused gaps, and is not uninterrupted
  combat or a simulation-frame measurement.
- The gracefully finalized VP9 video is **50:24.880**, including setup and pauses,
  at 1000 × 900. Full FFmpeg decoding passed with an empty error log. Selected
  screenshots and the final recorded Paused frame were inspected; the full video
  was not watched end to end. It has no audio stream, and headless muted playback
  establishes no audio fidelity.
- The browser owner recorded zero page errors, console errors/messages, failed
  requests or blocked external attempts through closure. No concrete game runtime
  failure was observed; no private telemetry or source-listener state was read.

## Observer boundaries

Only ordinary mouse/keyboard, real elapsed browser time, public DOM HUD/map/guide
and actual screenshots guided play. There was no World/game-object evaluation,
console API execution, injected object, storage/profile/seed/progression/clock
override, fixture or accelerated pilot. The classifier's fixed NumPy seed belongs
only to image analysis.

Ignored observer corrections followed confirmed public Paused checkpoints:

- The full reached player silhouette was excluded using a 62.5-screen-pixel radius
  at 50% zoom. Blue/pale-blue native pickup candidates were retained; candidates
  alone were never counted as confirmed collection.
- Public-map route bounds moved inward after an outer-field damage/downgrade,
  then expanded from radius 3.1 to 4.2 and 5.2 as nearby fields became exhausted.
  Accidental crossings and revisits still occurred.
- A screenshot exposed an outlined gold-bodied enemy rejected by the blue-body
  classifier. The controller exited normally to a verified pause; enclosed gold
  centroids were added to the observer, then the same game resumed. This was an
  observer failure, not a demonstrated game defect.
- Movement later remained held through screenshot latency, and visible combat
  targets took priority over pickup steering. A preference for an actually offered
  Heavy Seeker was never exercised because no second offer appeared.
- A read-only duration helper needed Python 3.10 UTC timestamp parsing corrected;
  it did not restart or reset gameplay.

Production source was unchanged. The last healthy phase was ordinary combat and
collection, followed by the actual terminal Paused dialog. Further progression
needs a more capable public-input pilot or human play. A production defect claim
would require concrete reproducible public evidence and separate diagnosis.

## Evidence and cleanup

The ignored evidence directory in the test checkout is
`reference-captures/ordinary-native-4353d49/`. Its `verification.md` contains exact
commands, interval timestamps, observer history, source/build provenance and
limits; `artifact-manifest.json` inventories hashes and sizes. Important artifacts
include `manifest.json`, `loaded-js-verification.json`,
`source-snapshot-verification.json`, `duration-summary.json`,
`hud-action-trace.jsonl`, the actual `segment-1-upgrade-menu-1.png`,
`terminal-paused.png`, `terminal.json`, `video-verification.json` and
`cleanup-verification.json`. The video is
`video/page@8b6d6667e7b1e78c0abaa01bd0879c18.webm`.

All owned keys and mouse buttons were released again before the final public
Paused check at 02:46:57.672 UTC. The owned context/browser closed gracefully and
recorded video finalization; the owned server then stopped. Durable process
fingerprints, termination records and listener checks establish that owned
processes were absent and ports 3235/9235 were free. No process on 3100/3103,
unrelated browser, production source, master or protected legacy ref was changed
by this test role. No PR checks were polled and no PR was created, watched, pushed
or merged by this role.

This is scoped current-stack ordinary-input evidence. It establishes neither full
progression nor full original/Adobe, synchronized runtime, pixel, audio,
constructor/event/RNG or complete-game parity. It does not replace the combined
integration gate or the original-runtime comparisons still listed in fidelity.
