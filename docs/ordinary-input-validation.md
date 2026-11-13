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
  A later geometry audit reported intermittent malformed frames. Successful
  decoding therefore does not make this continuously registered video evidence;
  see the [bounded capture contract](browser-capture-reference.md). Individual
  retained screenshots and public observations keep their own limited scope.
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

## Observer audit follow-up

A read-only audit of the completed4353d49 recording identified concrete observer
failures: the already zoom-scaled62.5px self-exclusion disk masks separate close
blue and gold enemies; an object can be labeled both actor and pickup; field-wall
contours can be selected as actors; and earlier pickup steering competed with
recognized threats. Screen/world units and approximately half-second feedback
cycles also interact with boundary policies. Simply halving every constant is
not a validated remedy.

The ignored audit at
`/home/ian/.t3/worktrees/open-bubble-tank/t3-4ce85804/reference-captures/observer-audit/audit.md`
links exact original screenshots, coordinates and one-based trace lines. It
analyzed337 retained PNGs and5,924 records without starting another game or
altering original evidence. Its recommended next step is an offline observer
correction, followed by a six-minute public-input calibration run with retained
per-decision images and explicit transit intent. The old45-minute attempt is
still partial evidence; causal damage attribution and full progression remain
unproved. The audit checkout lacked Prettier, so its attempted format command
failed without installing dependencies or changing tracked files. The parent
later ran the complete formatting/check workflow when integrating this record.

The subsequent observer-only repair did not pass its offline gate: ten of twelve
annotated checks passed across349 retained images, with close blue/gold actors
recovered and no duplicate actor/pickup IDs. Other blue enemies remained
unclassified, disconnected player lobes became false targets, and HUD contours
could still merge into actor candidates. No fresh game, build, browser/server,
calibration or earned offer occurred. All423 original evidence hashes remained
unchanged;3265/9265 were free. The bounded report is retained at
`/home/ian/.t3/worktrees/open-bubble-tank/t3-bced646c/reference-captures/observer-repair-3265/report.md`.
Its ignored prototypes are incomplete, not production behavior or a validated
pilot. Further observer correction or direct public-input verification is still
needed before claiming ordinary full progression.

## Second offline observer pass

At parent `e7e4b00`, an isolated ignored copy improves those concrete failures
without changing production, tests, the old recordings or a running game.
`reference-captures/observer-repair-current/` in the parent worktree retains the
prototype, complete candidate lists, overlays, evaluator and mutation results.
It is not a reusable validated pilot and is intentionally not committed.

All **349** retained normalized550×450/451 images were processed in80.885 seconds.
These include setup/menu/paused images, not349 independent combat observations.
The original12 annotated controls now pass, including both previously missed
blue enemies. Four added controls reject the two known player-lobe targets and
two health-panel targets: **16/16** total, with no duplicate actor/pickup IDs.

The changes preserve supported nearby bodies before repairing small open cyan
contours. Closing every contour would merge a separate close enemy into the
player. A local two-sample stroke uncertainty band prevents targeting the named
disconnected player lobes; it marks them unknown, without claiming their identity.
It is not the old circular centre exclusion. The independent close-blue control
remains a target at its measured three-pixel separation. A public-layout-specific
gauge detector requires two long parallel light strokes and short end strokes
before treating its actual panel region as occluded. It does not delete a whole
bottom strip; the retained bottom actor and gold actor at y411 still pass.

Controlled removals discriminate these changes against the same annotations:

| Observer variant | Annotated checks passing |
| --- | --- |
| Current bounded prototype | 16/16 |
| No unknown-contour repair | 14/16 |
| Original one-pixel uncertainty band | 14/16 |
| No detected health-panel occlusion | 14/16 |
| Unconditional contour closing | 15/16 |

The original and overlay for the close-enemy and HUD controls were inspected,
along with the additional-review images `segment-1-time-20.png` and
`segment-8-time-50.png`. Remaining visible objects can still be unknown. This is
neither an exhaustive human-labelled corpus nor measured general precision/recall;
670 actor partitions across the corpus are not670 verified enemies. General
HUD/overlap/temporal self identity, motion/braking and independent arrival evidence
remain unresolved. `selfReliable` remains false and the overall offline live gate
remains false. No live calibration was attempted or relabelled as passed.

All423 original manifest entries match both before and afterward; the original
manifest SHA-256 remains
`2c14f5735738e875e7f1e88de55a1578001f929b55d81210c0ea02996d82f705`.
Python syntax and all four rejecting mutation controls pass. Repository formatting
was run for this documentation-only integration. No application rule/browser flow
changed, so no fresh application check/build/E2E is claimed. No server, browser,
input action, game/seed/profile mutation, PR operation, deployment or provider
change occurred. Ordinary progression and original/Adobe/full-game parity remain
unproved.
