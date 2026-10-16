# Pull request review and merge

Use this reference when opening, classifying, reviewing, or merging a pull request. Each PR goes to one of two lanes. A PR that needs a person's judgment waits for a human reviewer. A PR that is clearly mergeable is merged by an agent after an evidence gate.

Repository guidance wins over these defaults, including different label names, a different merge method, or a rule that humans merge every PR.

## Contents

- [Review labels](#review-labels)
- [Classify](#classify)
- [Human review](#human-review)
- [Merge gate](#merge-gate)
- [Merge](#merge)
- [After the merge](#after-the-merge)

## Review labels

| Label | Color | Purpose |
|:--|:--|:--|
| `review:human` | `D93F0B` | Needs a human reviewer before merging: interface or UX changes, or a change that isn't clearly mergeable. Agents never merge it |
| `review:ai` | `0E8A16` | Clearly mergeable. An agent merges it after CI, the pre-commit review, and the acceptance evidence all pass |

Every open PR carries exactly one of them. If the repository lacks these labels and its guidance doesn't define how PRs are reviewed, pull request review is uninitialized (see [initialization](initialization.md#when-to-initialize)). Propose initializing it, and until it is, treat every PR as `review:human`: open it and request review, but don't merge it.

## Classify

Label the PR as soon as it is open. `create_pull_request` doesn't take labels, so add the label afterwards with `issue_write`, as shown in the [MCP reference](github-mcp-tools.md#label-a-pull-request).

Use `review:human` when the PR:

- changes an interface or a UX feature: screens, interaction, user-facing copy, or frontend behavior;
- isn't clearly mergeable, for example because an acceptance criterion is unmet or deviates in a way someone must confirm, the change needs a product decision, or it reverses an earlier decision;
- changes repository conventions, such as an initialization or issue template PR;
- comes from a fork. Only people with write access can push a branch to the repository itself, while a fork can carry anyone's code, and the merge gate runs that code.

Use `review:ai` for everything else, such as backend, infrastructure, CI, or documentation changes whose acceptance criteria all have evidence.

When in doubt, choose `review:human`. Reclassify when the scope changes. A `review:ai` PR that picks up an interface or UX change becomes `review:human`, and you swap the label before doing anything else with the PR.

## Human review

For a `review:human` PR, the agent opens the PR and requests review. It never merges the PR, and it doesn't relabel the PR `review:ai` to get around a human gate.

1. Write why the PR needs a human, naming the matching reason from [Classify](#classify), and list each point the reviewer must confirm, such as a deviation from an acceptance criterion, a product decision, or an assumption that wasn't tested. Put it in the PR body and in the issue's `State`, so a reviewer who opens either one knows what to judge. The label alone doesn't say why.
2. Request the reviewers named in repository guidance, or ask the user who should review. Use `reviewers` on `create_pull_request` or `update_pull_request`.
3. Answer review feedback with new commits on the PR branch, and keep the issue's `State` current.
4. Leave the merge to the reviewer or another human. Once a human merges it, verify it as described in [After the merge](#after-the-merge).

## Merge gate

An agent merges a `review:ai` PR only when every condition below holds. The merging agent checks each one itself. The author's report, including a report from a delegated agent, is a claim.

Don't rely on branch protection, rulesets, or required checks. They may be missing, and private repositories on GitHub Free have neither: the API answers 403. This gate is the only enforcement.

1. **Still `review:ai`.** Read the PR with `pull_request_read` `get`, its files with `get_files`, and its reviews with `get_reviews`. The head branch is in the repository itself, not a fork. The final diff still fits the label, the PR isn't a draft, and it has no merge conflicts. No reviewer's latest review requests changes, and if the reviews can't be read, this condition fails. Note the head commit SHA. Every later check refers to it.
2. **CI is green.** Read the head commit's check runs with `get_check_runs` and its commit statuses with `get_status`. Every check finished and succeeded, or its own conditions skipped it. Pending, failed, cancelled, and timed-out checks all block the merge. A head commit without any checks blocks it too, unless the repository has no CI that runs on pull requests.
3. **Every commit passed the pre-commit review.** List the commits with `get_commits`. Each one went through the repository's pre-commit review gate, such as the codex-review gate, without skipping it through `git commit --no-verify` or `-n`, a bypass variable such as `CODEX_GATE_BYPASS`, or a `core.hooksPath` override. A passing gate leaves no trace in git, so audit the record of how each commit was made: the agent's transcript, or the host's record of delegated tool calls. A commit without such a record can't be shown to have passed. A repository without a pre-commit review gate fails this condition unless its guidance waives it.
4. **Every acceptance criterion has evidence.** For each issue the PR closes, every criterion has evidence recorded in an issue comment, or in a test report in the repository's docs. A checked box or a linked PR is not evidence.
5. **The checks pass again in a clean checkout.** Check out the head commit into a fresh clone or a new git worktree, not the author's working copy. Then run the repository's format check, lint, tests, and acceptance checks there, with the commands from repository guidance. Every command passes. A host that can't run commands can't meet this condition.
6. **Each issue reads as final.** The `State` section of every closing issue describes the final state, and the body passes the [cold-start check](work-item-format.md#cold-start-check).
7. **The PR closes its issues.** The PR body has `Closes owner/repo#N` for every issue it completes. Use the full `owner/repo#N` form. A PR that closes no issue fails this condition.

Before merging, record the evidence in the PR body or a PR comment: the head SHA, the check results, the audit result, the commands you ran in the clean checkout with their results, and the test reports.

If a condition fails, don't merge. Fix what is within the authorized scope, then run the whole gate again on the new head commit. If the PR can't be shown to be clearly mergeable, relabel it `review:human` and request review.

## Merge

Right before the merge call, read the PR again with `pull_request_read` `get`, `get_reviews`, `get_check_runs`, and `get_status`. Stop unless it still carries `review:ai`, its head SHA is still the one the gate checked, no reviewer's latest review requests changes, and CI is still green. Labels, reviews, and checks can change while the gate runs, and `expectedHeadSha` guards only the code.

Merge with `merge_pull_request`, and pass the head SHA you checked as `expectedHeadSha`, as shown in the [MCP reference](github-mcp-tools.md#merge-a-pull-request). If someone pushed after the gate, the merge fails instead of shipping unchecked commits.

- **One issue:** squash.
- **Several issues integrated in one PR:** use a merge commit. It keeps each issue's commits, along with their signatures, in the history.

Write the commit title and message in the repository's commit convention.

## After the merge

The merge stands in for step 5 of [Complete and close](../SKILL.md#complete-and-close). Finish steps 1 to 3 before merging, then:

1. Re-read the PR and confirm it is merged.
2. Re-read every closing issue and confirm it is closed as completed. Closing keywords work only when the PR merges into the default branch. If an issue is still open, close it through the completion ritual.
3. Re-read each issue's project item. If Status isn't the completed option, set it and verify again.
4. Add the completion comment to each issue, with the PR, the merge commit, and the validation evidence.
5. Check what the completion unblocks, as in step 7 of the completion ritual.
