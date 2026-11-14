# Five-PR delivery stacks

The current user policy is to accumulate five dependent PRs before integrating the
batch into master. Keep each layer coherent and reviewable. Assemble five layers
before the final combined merge to master.

```text
master ← PR1 ← PR2 ← PR3 ← PR4 ← PR5
```

The bottom PR targets master. Each later PR targets the preceding layer's branch,
so its review shows that layer's change. Use `stack/<batch>-<layer>-<description>`
for batch branches, including the first layer when conserving previews. Preserve the
legacy recreation checkpoint unchanged.

While an earlier layer runs CI, build the next dependent layer when its scope is
clear. Up to five layers may be in flight together. Keep fixes on their owning
branch, propagate them through dependent layers, and validate each resulting head.
Do not open a sixth layer or fold a partial batch into master merely to avoid a wait.

For each finalized PR, create an isolated get-green agent to inspect current-head
Actions and reviews, repair concrete failures and escalate uncertain fundamental
changes to the parent. Pending, missing or failed Actions is not green, but an
intermediate wait does not block assembling the later layers. The merge gate is the
last PR's complete combined head, with a successful named `Rules, build and mock
browser` job and no actionable review findings. On pull requests this job runs
formatting, TypeScript/rules, a production build and the quick mock startup,
creator, settings, exploration and pause smoke. The complete mock/synthetic
browser suite, including the earned-progression pilot, runs on master pushes and
manual workflow dispatches after merging. This split follows the user's classic
release instruction of 2026-11-14. Never remove assertions or suites merely to
obtain green checks.

Once five layers exist, assemble all changes on the last PR's branch and target that
PR directly at master. A dependent top branch already contains its ancestors; verify
that ancestry and fold in any missing layer or repair. Validate the final combined
head once instead of waiting for a new CI pass after every intermediate fold. Require
its complete current-head Actions/review gate before the single master merge. Earlier
open layers can target master so their included commits are accounted for by that
combined merge. If master changes during the batch, integrate it and validate the
resulting tree before the final merge. Verify the fetched head and resulting tree;
do not infer completion from a queued operation.

## Final classic release closeout

The five-layer artwork batch PRs161–165 is complete. Under the user's subsequent
priority to finish the classic release promptly, its remaining tab-icon fix,
validation-output isolation and release evidence form one coherent final
closeout PR. This is acceptance work following the delivered batch, rather than
a new fidelity implementation batch. Preserve the same isolated current-head
inspection, quick PR gate, one master merge and full-master release gate. Future
substantive fidelity batches retain the five-layer policy above. The final
annotated `classic-v1` tag records the accepted exact master commit and successful
full run without requiring another result-only documentation commit.

## Quick PR checks and full master validation

`bun run test:e2e:smoke` is the quick browser selection for PRs;
`bun run test:e2e:offline` retains the complete existing mock/synthetic selection
for master. Both commands build the production application first. Formatting and
the complete fast rule suite run for both events. PR jobs have a 10-minute safety
cap; post-merge/manual jobs have 45 minutes for the long suite.

The post-merge job sets `BT3_PLAYTHROUGH_LONG_RUN=1`, giving the existing pilot a
10-minute wall-clock budget. Ordinary local pilot calls keep their existing
5-minute budget. The same input sequence, 200,000-frame simulation cap and all
upgrade/boss/badge/Continue assertions remain. Earlier readiness deadline failures
are preserved as failures; this scheduling/budget change is explicit, not a claim
that those runs passed or that a production gameplay bug was diagnosed.

A passing quick PR gate permits the authorized merge. Classic release acceptance
also requires inspecting the resulting master full-suite run and repairing any
concrete post-merge regression. Pending or failed master validation is not a
completed classic release. See [the classic release criteria](classic-release.md).

## Vercel deployment budget

Stacking alone does not suppress preview builds. `vercel.json` sets
`git.deploymentEnabled["stack/**"]` to false, using Vercel's supported minimatch branch
rules. Pushes to those batch branches therefore skip automatic Vercel deployments.
Unspecified branches retain their normal behavior, including master. Keeping every
layer under `stack/**` leaves the one master merge as the automatic production
deployment for a batch. A deliberate preview on another branch remains optional.

See [Vercel's Git configuration](https://vercel.com/docs/project-configuration/git-configuration).
Do not add a broad true rule overlapping `stack/**`: Vercel deploys when any matching
rule enables it. A deliberate intermediate preview skip is expected; continue to
require Actions and reviews. Only the previously observed daily deployment-quota
failure is waived. Investigate other actual deployment failures, and do not retry
deployments or change billing as a response to quota exhaustion.

Validate repository configuration before pushing and inspect provider feedback to
confirm the intended skip. Configuration validity alone does not prove that Vercel
honored the branch rule. No provider account, production-branch or billing setting is
changed by this repository rule.
