# Five-PR delivery stacks

The current user policy is to accumulate five dependent PRs before integrating the
batch into master. Keep each layer coherent and reviewable. Assemble five layers
before the final combined merge to master.

```text
master ← PR1 ← PR2 ← PR3 ← PR4 ← PR5
```

The bottom PR targets master. Each later PR targets the preceding layer's branch,
so its review shows that layer's change. Use `stack/<bottom-PR>-<layer>-<description>`
for intermediate branches. Preserve the legacy recreation checkpoint unchanged.

While an earlier layer runs CI, build the next dependent layer when its scope is
clear. Up to five layers may be in flight together. Keep fixes on their owning
branch, propagate them through dependent layers, and validate each resulting head.
Do not open a sixth layer or fold a partial batch into master merely to avoid a wait.

For each finalized PR, create an isolated get-green agent. Require its current-head
GitHub Actions run and the named `Rules, build and mock browser` job to complete
successfully, and address actionable review findings. Pending, missing or failed
Actions is not green. Escalate uncertain fundamental changes from the child to the
parent. Never remove assertions or suites merely to obtain green checks.

Once five layers exist, assemble all changes on the last PR's branch and target that
PR directly at master. A dependent top branch already contains its ancestors; verify
that ancestry and fold in any missing layer or repair. Validate the final combined
head once instead of waiting for a new CI pass after every intermediate fold. Require
its complete current-head Actions/review gate before the single master merge. Earlier
open layers can target master so their included commits are accounted for by that
combined merge. If master changes during the batch, integrate it and validate the
resulting tree before the final merge. Verify the fetched head and resulting tree;
do not infer completion from a queued operation.

## Vercel deployment budget

Stacking alone does not suppress preview builds. `vercel.json` sets
`git.deploymentEnabled["stack/**"]` to false, using Vercel's supported minimatch branch
rules. Intermediate pushes and merges therefore skip automatic Vercel deployments.
Unspecified branches retain their normal behavior, including master and the current
bottom integration branch. The assembled bottom branch can receive a final preview;
the one master merge can trigger the production deployment.

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
