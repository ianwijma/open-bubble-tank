# Validation output isolation and recovery

The root Playwright smoke run during classic closeout used its previous default
`test-results` output directory. Playwright clears that directory at startup,
removing unrelated ignored validation records stored beneath it. This was a
validation-workflow error, not a game failure. Tracked code, frozen numerical test
fixtures, the sibling research repository and hosted GitHub runs were unaffected.

`playwright.config.ts` now confines disposable test output to
`test-results/playwright`. Fresh release evidence is stored under ignored
`reference-captures/classic-closeout-recovery/`. A control file outside the nested
output directory and a second control under `reference-captures` both survived a
subsequent standard `bun run test:e2e:smoke` run.

The live master-watch log was recovered from its still-open file descriptor, then
the same workflow was monitored from the protected location. The workflow itself
was neither restarted nor relabelled successful. Hosted PR logs were downloaded
again; an independent validation build under `/tmp` also remained available.

The latest supplied-art/mock accelerated pilots, browser playback/mute controls
and public entry routes were recreated in the protected location. Replacement
captures must retain their new build/source identities; they are not the missing
old artifacts. Earlier thread and committed-document observations remain
historical evidence, while unavailable raw recordings, profiles and private probe
files must not be described as still present. The old public-input video was
partial and cannot establish a completed ordinary playthrough in any case.

The fixture-based full progression route remains distinct from ordinary public
input. Neither this recovery nor a passing quick smoke closes the stricter
original-runtime comparison ledger.
