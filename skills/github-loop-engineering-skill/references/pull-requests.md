# Pull request review and merge

Use this reference when opening, classifying, reviewing, or merging a pull request. Each PR goes to one of two lanes. A PR that needs a person's judgment waits for a human reviewer. A PR that is clearly mergeable is merged by an agent after an evidence gate.

Repository guidance wins over these defaults, including different label names, a different merge method, or a rule that humans merge every PR.

## Contents

- [Open](#open)
- [Review labels](#review-labels)
- [Classify](#classify)
- [Human review](#human-review)
- [Merge gate](#merge-gate)
- [Merge](#merge)
- [After the merge](#after-the-merge)

## Open

Before the first push:

- Run the repository's checks where they are cheap, locally or on a build machine. CI is the merge gate, not a debugger: every push reruns it, and on a private repository every run spends metered minutes.
- Bring in the base branch with a merge, not a rebase, when the two conflict or once the pull request is open. A rebase rewrites commits without running the pre-commit hook, so a rebased commit has no review record for the [merge gate](#merge-gate), and a conflict resolution made during a rebase is never reviewed.
- If the repository uses a secret scanner, scan both the branch's commits and the head's tree. The tree must be clean on its own, because a squash merge puts the same content in a new commit that an allowlist entry for the old commit doesn't cover.
- In a public repository, read the commits, the body, and any evidence files for secrets, internal hostnames or addresses, customer names, and personal data. What is pushed stays readable after it is deleted.

Write a body that a reviewer can judge without the conversation:

- what changed and why;
- the changes, by file or area;
- validation: each command, where it ran, and its result;
- each acceptance criterion with its evidence, or "not met" and why;
- the review lane and why;
- `Closes owner/repo#N` for every issue the pull request completes.

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
2. Request the reviewers named in repository guidance, or ask the user who should review. Use `reviewers` on `create_pull_request` or `update_pull_request`. When the agent works with the reviewer's own token, the reviewer is the PR's author, and GitHub doesn't let an author approve their own pull request. Assign the PR to them instead, and name it in your handoff.
3. Answer review feedback with new commits on the PR branch, and keep the issue's `State` current.
4. Leave the merge to the reviewer or another human. Once a human merges it, verify it as described in [After the merge](#after-the-merge).

## Merge gate

An agent merges a `review:ai` PR only when every condition below holds. The merging agent checks each one itself. The author's report, including a report from a delegated agent, is a claim.

Don't rely on branch protection, rulesets, or required checks. They may be missing, and private repositories on GitHub Free have neither: the API answers 403. This gate is the only enforcement.

1. **Still `review:ai`.** Read the PR with `pull_request_read` `get`, its files with `get_files`, and its reviews with `get_reviews`. The head branch is in the repository itself, not a fork. The final diff still fits the label, the PR isn't a draft, and it has no merge conflicts. No reviewer's latest review requests changes, and if the reviews can't be read, this condition fails. Note the head commit SHA. Every later check refers to it.
2. **CI is green.** Read the head commit's check runs with `get_check_runs` and its commit statuses with `get_status`. Every check finished and succeeded, or its own conditions skipped it. Pending, failed, cancelled, and timed-out checks all block the merge. A head commit without any checks blocks it too, unless the repository has no CI that runs on pull requests. If `get_check_runs` answers 403, the token can't read checks. Read the head commit's workflow runs and jobs through the `actions` toolset instead, as in [Read CI results](github-mcp-tools.md#read-ci-results). If CI can't be read at all, this condition fails. A PR's `mergeable_state`, such as `clean` or `unstable`, is not evidence that CI passed or failed.
3. **Every commit passed the pre-commit review.** List the commits with `get_commits`. Each one went through the repository's pre-commit review gate, such as the codex-review gate, without skipping it through `git commit --no-verify` or `-n`, a bypass variable such as `CODEX_GATE_BYPASS`, or a `core.hooksPath` override. A passing gate leaves no trace in git, so audit the record of how each commit was made: the agent's transcript, or the host's record of delegated tool calls. A commit without such a record can't be shown to have passed. A rebase rewrites commits without running the hook, so a rebased commit has no such record. A repository without a pre-commit review gate fails this condition unless its guidance waives it.
4. **Every acceptance criterion has evidence.** For each issue the PR closes, every criterion has evidence recorded in an issue comment, or in a test report in the repository's docs. A checked box or a linked PR is not evidence.
5. **The checks pass again in a clean checkout.** Check out the head commit into a fresh clone or a new git worktree, not the author's working copy. Then run the repository's format check, lint, tests, and acceptance checks there, with the commands from repository guidance. Every command passes. A host that can't run commands can't meet this condition.
6. **Each issue reads as final.** The `State` section of every closing issue describes the final state, and the body passes the [cold-start check](work-item-format.md#cold-start-check).
7. **The PR closes its issues.** The PR body has `Closes owner/repo#N` for every issue it completes. Use the full `owner/repo#N` form. A PR that closes no issue fails this condition.
8. **CI tested what will land.** Fetch the base branch and check that the head contains its tip: `git merge-base --is-ancestor origin/<base> <head>`. Then the squash commit's tree equals the head's tree, which CI and your clean checkout tested. If the base moved after CI ran, CI tested a merge with an older base, and a green PR can still break the base branch. Merge the base into the PR branch and run the gate again on the new head.

Before merging, record the evidence in the PR body or a PR comment: the head SHA, the base commit it contains, the check results, the audit result, the commands you ran in the clean checkout with their results, and the test reports.

If a condition fails, don't merge. Fix what is within the authorized scope, then run the whole gate again on the new head commit. If the PR can't be shown to be clearly mergeable, relabel it `review:human` and request review.

## Merge

Right before the merge call, read the PR again with `pull_request_read` `get` and `get_reviews`, read its CI the way the gate did, and fetch the base branch. Stop unless it still carries `review:ai`, its head SHA is still the one the gate checked, the head still contains the base's tip, no reviewer's latest review requests changes, and CI is still green. Labels, reviews, checks, and the base can change while the gate runs, and `expectedHeadSha` guards only the head.

When several PRs are ready, merge them one at a time. Start with the one that touches the most widely shared files, such as a changelog, an index, or a decision log. Every merge moves the base, so each other open PR has to bring it in and pass CI again before it can merge.

Merge with `merge_pull_request`, and pass the head SHA you checked as `expectedHeadSha`, as shown in the [MCP reference](github-mcp-tools.md#merge-a-pull-request). If someone pushed after the gate, the merge fails instead of shipping unchecked commits.

- **One issue:** squash.
- **Several issues integrated in one PR:** use a merge commit. It keeps each issue's commits, along with their signatures, in the history.

Write the commit title and message in the repository's commit convention.

## After the merge

The merge stands in for step 5 of [Complete and close](../SKILL.md#complete-and-close). Finish steps 1 to 3 before merging, then:

1. Re-read the PR and confirm it is merged.
2. If you made the merge, fetch the base branch and check that the merge commit's tree equals the tree of the head you merged: compare `git rev-parse <merge commit>^{tree}` with `git rev-parse <head>^{tree}`, using the merge commit SHA that the merge call returned. A difference means the base moved between your last read and the merge. Find out what landed before you report the merge as verified.
3. Re-read every closing issue and confirm it is closed as completed. Closing keywords work only when the PR merges into the default branch. If an issue is still open, close it through the completion ritual.
4. Re-read each issue's project item. If Status isn't the completed option, set it and verify again.
5. Add the completion comment to each issue, with the PR, the merge commit, and the validation evidence.
6. Check what the completion unblocks, as in step 7 of the completion ritual.
