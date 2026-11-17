# Delivery

## Five-PR stacks

Work is delivered in batches of five dependent pull requests, merged into `master` together. Keep each layer coherent and reviewable.

```text
master ← PR1 ← PR2 ← PR3 ← PR4 ← PR5
```

The bottom PR targets `master`. Each later PR targets the branch of the layer before it, so its review shows only that layer's change. Name batch branches `stack/<batch>-<layer>-<description>`, the first layer included.

While an earlier layer runs CI, build the next layer once its scope is clear. Up to five layers may be in flight at once. Make each fix on the branch that owns it, carry it through the layers above, and check each resulting head. Do not open a sixth layer, and do not fold a partial batch into `master` just to avoid waiting.

For each finished PR, a separate agent inspects the current head's Actions and reviews, repairs concrete failures, and hands uncertain, fundamental changes back. Pending, missing or failed Actions are not green, but waiting on one layer does not block building the next.

The merge gate is the last PR's combined head: the `Rules, build and mock browser` job succeeds and no review finding needs action. Never remove assertions or test suites to get a green check.

Once five layers exist, gather every change on the last PR's branch and point that PR at `master`. A top branch already contains the layers below it; check that ancestry and fold in any missing layer or fix. Validate the combined head once, rather than after every intermediate fold, and merge it to `master` once. Earlier open layers can be pointed at `master` so the combined merge accounts for their commits. If `master` moves during the batch, merge it in and validate the result before the final merge. Check the fetched head and the resulting tree; do not assume an operation finished because it was queued.

## Quick PR checks and full master validation

| Event | What runs | Time limit |
| --- | --- | --- |
| Pull request | Formatting, `bun run check`, a production build and the quick browser check (`bun run test:e2e:smoke`) | 10 minutes |
| Push to `master`, manual run | Formatting, `bun run check`, a production build and the full browser suite (`bun run test:e2e`), including the bot playthrough | 45 minutes |

On `master` the job sets `SOAPTANK_PLAYTHROUGH_LONG_RUN=1`, which gives the bot playthrough a 10-minute budget instead of the local 5 minutes. Its inputs, simulation cap and assertions stay the same.

A passing quick check allows the merge. After merging, inspect the `master` run and repair any concrete regression it finds. A batch is not finished while that run is pending or failed.

## Vercel preview builds

Stacking alone does not stop preview builds. `vercel.json` sets `git.deploymentEnabled["stack/**"]` to false, so pushes to batch branches skip automatic Vercel deployments. Other branches, `master` included, deploy as usual, which leaves the single `master` merge as a batch's production deployment. A deliberate preview from another branch is still possible.

Do not add a broad `true` rule that overlaps `stack/**`: Vercel deploys when any matching rule enables it. See [Vercel's Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

A skipped preview on a batch branch is expected; Actions and reviews are still required. A failure caused by the daily deployment quota may be ignored. Investigate any other deployment failure. Do not retry deployments or change billing in response to quota exhaustion.

Validate repository configuration before pushing, and check the provider's feedback to confirm the skip happened. A valid configuration does not prove that Vercel honored the branch rule. This repository rule changes no provider account, production branch or billing setting.
