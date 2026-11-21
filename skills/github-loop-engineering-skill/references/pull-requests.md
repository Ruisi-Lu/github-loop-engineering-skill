# Pull requests

Use this reference when opening, classifying, reviewing, or merging a pull request.

Reviewing a PR doesn't mean reviewing its code. Teams that use this skill review code locally, under their own AI controls: the pre-commit review gate reviews each commit, an [acceptance check](#acceptance-check) confirms that the change does what its issues ask, and a high-risk change gets its security review, all before the PR opens. A PR review checks only whether the PR's content meets what this skill requires: its body and [verification record](#verification-record), its label, its CI and commits, and the issues it closes, as the [merge gate](#merge-gate) lists. It never reads the diff to judge the code, and it never runs a code review or a security review itself. When something required is missing, such as a review entry, the PR goes back to the author's side, which supplies it locally and adds it to the record.

Each PR is in one of two lanes. An agent merges a `review:ai` PR after the merge gate. A `review:human` PR waits for a person. A person's part is to understand the feature: what a user can now do, and how it looks and feels. Every change to what a user sees goes there, because how an interface looks and feels is a matter of taste that evidence can't settle, and little else does. Technical choices, such as how a change handles authentication, migrates data, or runs in CI, are settled by the local reviews, the security review, and the merge gate, not by a person.

Repository guidance wins over these defaults, including different label names, a different merge method, or a rule that humans merge every PR.

## Contents

- [Verification record](#verification-record)
- [Acceptance check](#acceptance-check)
- [Open](#open)
- [Classify](#classify)
- [Merge gate](#merge-gate)
- [Human review](#human-review)
- [Review interview](#review-interview)
- [Merge](#merge)
- [After the merge](#after-the-merge)

## Verification record

Every PR carries a record of what was checked, so that nobody checks the same thing twice. It applies [Verify once](../SKILL.md#verify-once) to a PR. The author's side writes the record into the PR body when the PR opens. Whoever checks something later adds a PR comment.

An entry counts only when someone with write access to the repository wrote it: the PR's author, or a commenter whose `author_association` is `OWNER`, `MEMBER`, or `COLLABORATOR`. On a public repository anyone can comment, and a comment that claims a passed check from anyone else is not a record. Some entries, such as a pre-commit review outcome or a check run outside CI, can't be checked against GitHub or git. Trusting them means trusting the people with write access, the same trust that lets them push to the repository.

### What it holds

Each entry names the commit SHA it covers and who ran it: the person, or the agent and its model.

| Entry | Content | Who writes it |
|:--|:--|:--|
| Checks | Each command, such as the format check, lint, tests, and acceptance checks, where it ran, and its result | Whoever ran it |
| Pre-commit review | Each commit and its outcome: passed the first time, or what the review blocked and how that was fixed | Whoever can read how the commits were made: the author's agent from its own transcript, or a coordinator from the host's record of a delegated agent's tool calls |
| Acceptance check | The [acceptance check](#acceptance-check): the agent and model that ran it, each criterion's result, and each finding with the commit that fixed it | Whoever ran or coordinated it |
| Security review | Only when one ran: its scope, meaning the areas it covered and the claims it attacked, and each finding with the commit that fixed it and how the fix was checked, or "no findings" | Whoever ran or coordinated it |
| Acceptance evidence | Each acceptance criterion with its evidence, or a pointer to the issue comment or test report that holds it | The author's side |
| Gate result or approval | The [merge gate](#merge-gate) result, or a human's approval | The merging agent, in a PR comment |

A security review is, for example, an independent agent's attempt to break a risky change, as in [fan-out](fan-out.md#verify-risky-leaves-independently), or a security reviewer's audit of the diff. When a later commit changes code in its scope, such as the fix for a finding, review that change too and update the entry.

In a public repository, describe each fixed finding by its kind and its fix, never as steps to exploit it. An exploitable finding left unfixed doesn't go into a public PR at all: report it as the repository's security policy says.

### How to read it

Before you run a check, a review, or an audit on a PR, or delegate one, read the record in the PR's body and comments. This holds for the merge gate, for preparing a review interview, and for any other review of the PR.

1. **Find the commit an entry covers:** the SHA it names. When it names none, take the last commit in the PR from before the entry was written. For an entry in the body, that is the PR's opening unless the body says otherwise. Commit dates can be set to anything, so prefer the PR's timeline when it shows when commits were pushed.
2. **Check the entry against the PR.** The commit is the head or an ancestor of the head, and each fix commit the entry names is in the PR. An entry whose commit is no longer in the PR, as after a rebase, covers nothing.
3. **Find what the entry doesn't cover.** List the commits after the covered one. Each of them needs its own pre-commit review entry, and, when it changes code in the security review's scope or touches a high-risk area the stated scope leaves out, a security review entry too. A scope that isn't stated is the PR's whole diff at the covered commit, except in a leaf's part of a batch's record, where it is that leaf's commits only. A merge of the base brings in code the base already accepted. Check that its other parent is a commit on the base branch, and look at what the merge itself changed with `git show --remerge-diff <merge commit>`. A merge that changed nothing there needs no entry. Its conflict resolutions need a pre-commit review entry like any other commit. A [batch](fan-out.md#batch-leaves-into-one-pull-request) pull request also holds a merge of each leaf's branch into the batch branch. Its other parent is a leaf's head, whose commits are in the PR and carry their own entries, so read it the same way: only what `git show --remerge-diff` shows needs an entry. Each leaf's entries cover that leaf's commits, the ancestors of its head that aren't on the base. The commits left for step 3 are the ones that are neither on the base nor in any recorded leaf: the batch's merge commits. Any other merge, whose other parent is neither on the base nor a batched leaf's head, is treated like any other commit. Don't review an uncovered commit's code yourself: send it back to the author's side, as conditions 3 and 4 of the [merge gate](#merge-gate) describe. Checks and acceptance evidence that the record doesn't cover, you run yourself.
4. **Add your result** to the record in a PR comment, with the commit it covers.

The exceptions in [Verify once](../SKILL.md#verify-once) apply: don't reuse an entry written by someone without write access, as in a PR from a fork, or one that what you observe contradicts, and run an independent check when the user, a human reviewer, or repository guidance asks for one. A review entry that can't be reused still isn't redone at the PR: it goes back to the author's side for a local review, or, for a PR from a fork, to a person with write access who reviews it locally and records the result. A high-risk change alone is not a reason to repeat a recorded review.

## Acceptance check

The pre-commit review gate judges each commit's code, and the implementing agent's tests prove what that agent thought to test. Neither asks whether the change as a whole does what its issues ask, so an agent can report every criterion met while one is missed or misread. Before the first push, one quick check by another agent asks that.

- **Who runs it.** A fresh agent that didn't write the change, on a smaller and faster model than the implementing agent's, at low effort. It still judges code, so it is not a model meant only for retrieval. Repository and host guidance on model choice win. When the host can't run another agent, run the check yourself in a separate pass from a fresh read of the issue, and say so in the record.
- **What it gets.** The closing issues, the diff at the head commit, and the acceptance evidence the author's side claims, but not the implementing agent's reasoning or summary, which would lead it to the same conclusion.
- **What it answers.** For each acceptance criterion: met, not met, or unclear, with the file and line or the evidence that shows it. Whether each piece of evidence exercises its criterion, for example a test that asserts what the criterion says rather than only that the code runs. Anything the diff changes that the issue's `What` and criteria don't ask for, or that its `Out of scope` excludes.
- **What it leaves out.** It doesn't run the checks again, judge code quality, which the pre-commit review did, or try to break the change, which a high-risk change's security review does. It reads, and it takes minutes.

Hand each "not met" back to the implementing agent, or fix it when you are that agent. An "unclear" that only the user can settle is a [pending decision](../SKILL.md#mark-or-clear-a-blocker). Remove extra scope, or turn it into a follow-up proposal. After the fixes, check again only the criteria the fix commits touch.

Write the result into the verification record's acceptance check entry: the commit it covered, the agent and its model, each criterion's result, and each finding with the commit that fixed it. Like every entry, it is reused. A later commit needs the check again only for the criteria whose code or evidence it changes.

## Open

Before the first push:

- Run the [acceptance check](#acceptance-check) and fix what it finds.
- Run the repository's checks where they are cheap, locally or on a build machine. CI is the merge gate, not a debugger: every push reruns it, and on a private repository every run spends metered minutes.
- If the repository uses a secret scanner, scan both the branch's commits and the head's tree. The tree must be clean on its own, because a squash merge puts the same content in a new commit that an allowlist entry for the old commit doesn't cover.
- In a public repository, read the commits, the body, and any evidence files for secrets, internal hostnames or addresses, customer names, and personal data. What is pushed stays readable after it is deleted.

Once the PR is open:

- Bring in the base branch with a merge, not a rebase. A rebase rewrites commits without running the pre-commit hook, so the rewritten commits have no review record, and a conflict resolution made during a rebase is never reviewed.
- Bring in the base branch only when the PR conflicts with it at its turn to merge, as described in [Merge](#merge), or when a reviewer asks for it. A PR doesn't need the base's latest commits to merge. Don't bring the base in just because it moved, and don't resolve a conflict while the PR still waits for review or CI, except for a `review:human` PR at its turn to merge, which resolves its conflicts right before its review, as described in [Merge](#merge). With many agents working in parallel, the base moves faster than a PR can follow, and a PR that had to catch up before merging would catch up, rerun CI, and fall behind again without ever merging.
- Keep a merge commit to the merge and its conflict resolutions. Make any other change, such as an update to a test report or other evidence, in an ordinary commit after it. Changes of its own hide among the resolutions, so whoever reads the merge with `git show --remerge-diff` gets both mixed together, and a revert of the merge takes them along. Don't update evidence just because the base moved: each entry names the commit it covers and stays valid for what that commit changed.
- Outside a [batch](fan-out.md#batch-leaves-into-one-pull-request), don't merge another open PR's branch into yours. A change that needs another open PR's change waits for it to merge, or starts from its head and brings in the base once after it merged, as in [Plan a work graph](../SKILL.md#plan-a-work-graph). Merging the other branch again and again while both are open turns every new commit on either branch into a conflict on the other.

Write a body that a reviewer or a merging agent can judge without the conversation:

```markdown
## Summary

What changed and why.

## Changes

- By file or area

## Verification

Covers commit <head SHA>. Written by <person, or agent and model> with github-loop-engineering <version>.

- Checks: `<command>` on <where it ran>: passed
- Pre-commit review: <sha> passed; <sha> blocked on <what>, fixed in <sha>
- Acceptance check: <agent and model> on <sha>; every criterion met, or <criterion> not met, fixed in <sha>
- Security review: <who ran it>, scope <areas and claims>; no findings, or <finding> fixed in <sha>, checked by <test>
- Acceptance criteria:
  - <criterion>: <evidence, or the issue comment or report that holds it>, or "not met" and why

## Review lane

`review:ai` or `review:human`, and why. For `review:human`, what the reviewer must confirm.

Closes owner/repo#N
```

Leave out the security review line when none ran. Write `Closes owner/repo#N` for every issue the PR completes. Name this skill's version, the `version` in the `.claude-plugin/plugin.json` of the plugin that installed it, so a team that compares how its work went before and after an update can tell which rules each PR followed. Leave the version out when the skill wasn't installed from a plugin.

A [batch](fan-out.md#batch-leaves-into-one-pull-request) of fan-out leaves gives each leaf its own part of the record, because each leaf was reviewed and checked against its issue on its own branch, while the checks ran once on the batch's head:

```markdown
## Verification

Covers commit <batch head SHA>. Written by <person, or agent and model> with github-loop-engineering <version>.

- Checks: `<command>` on <where it ran>, on <batch head SHA>: passed
- Batch merges: <merge sha> merges owner/repo#N, no changes beyond its parents; <merge sha> resolves <conflict>, pre-commit review passed

### owner/repo#N <title>

- Head: <leaf head SHA>
- Pre-commit review: <sha> passed
- Acceptance check: <agent and model> on <leaf head SHA>; every criterion met, or <criterion> checked again on <batch head SHA> after <resolution>
- Security review: <who ran it>, scope this leaf's commits up to <leaf head SHA>, <areas and claims>; no findings, or <finding> fixed in <sha>
- Acceptance criteria:
  - <criterion>: <evidence>
```

## Classify

| Label | Color | Purpose |
|:--|:--|:--|
| `review:ai` | `0E8A16` | An agent merges it after the merge gate passes |
| `review:human` | `D93F0B` | A person has to see or try the result before it merges, as for every interface change. An agent merges it only after a human approves it |

Every open PR carries exactly one of them. Label the PR as it opens, with `--label` on `gh pr create`, as shown in the [gh reference](gh-cli.md#open-and-label-a-pull-request).

`review:ai` is the default. Use `review:human` only when one of these holds:

- **It changes the interface.** The PR adds or changes what a user sees or how they interact with it: a screen, a layout, a visual style, an interaction, or user-facing copy. A person confirms the result, because whether an interface looks and feels right is a matter of taste. An approved design in the issue, a screenshot, or an end-to-end test shows that the result matches a specification. It doesn't show that the result is good, so none of them replaces the confirmation.
- **It sets up this skill in the repository.** An [initialization](initialization.md) PR or an [issue template update](issue-templates.md) PR. A person merges it, as those references describe, because it installs the labels and templates that every later issue and PR follow.
- **Repository guidance reserves the change for a person.**
- **The PR comes from a fork.** Only people with write access can push a branch to the repository itself, while a fork can carry anyone's code, and the merge gate runs that code.

A change to frontend code that leaves what a user sees and does unchanged, such as a refactor or a dependency update, is not an interface change. It stays `review:ai`. When you can't tell whether something visible changed, find out by running it or comparing screenshots, rather than sending it to a person on suspicion.

Keep the person's part small. Put interface changes in their own PR where the work allows, apart from the logic behind them, so that only that PR waits. When several interface leaves make up one feature, such as the parts of one screen, put them in one [batch](fan-out.md#batch-leaves-into-one-pull-request), so the person reviews the feature once and its parts don't conflict with each other one review at a time. The reviewer confirms what they can see and try, and you show it to them, as described in [Review interview](#review-interview). The rest of the PR is settled by evidence: before merging it, you check the merge gate's other conditions, as described in [Human review](#human-review).

These are not reasons for human review:

- **An open decision.** When the change needs a product decision, deviates from an acceptance criterion, or reverses an earlier decision, ask the user that one question, as a [pending decision](../SKILL.md#mark-or-clear-a-blocker). Record the answer in the issue and keep the PR `review:ai`. One question costs a person far less than reviewing a whole PR, and it is answered sooner.
- **An unmet acceptance criterion.** Meet it, or ask the user whether to descope it.
- **A failed or missing check.** Fix the failure or run the check, as described in [Merge gate](#merge-gate).
- **A high-risk change,** such as one to authentication or a data migration. It gets one security review, run locally before the PR opens and recorded in the verification record, and condition 4 of the [merge gate](#merge-gate) requires it.
- **A change to how the repository works,** such as its agent guidance, like `CLAUDE.md` or `AGENTS.md`, its CI workflows, its pre-commit review gate, or its branch or release settings. It goes through the merge gate like any other change. When it loosens a rule that later changes rely on, for example by removing or weakening a check, a review, or a merge gate condition, adding a bypass, letting a failing step pass, or widening what CI's token or secrets can reach, ask the user whether to accept that as a [pending decision](../SKILL.md#mark-or-clear-a-blocker). Say in plain words what protection goes away and what the change gains in return, and record the answer in the issue. The user decides one tradeoff, not a review of the workflow file.
- **Doubt.** When you can't tell whether the PR changes what a user sees, run it or compare screenshots. When you can't tell for another reason, ask the user the one question that decides it.

Reclassify when the scope changes. A `review:ai` PR that picks up an interface change becomes `review:human`, and you swap the label before doing anything else with the PR. Never relabel a `review:human` PR `review:ai` to get around a human gate. It becomes `review:ai` only when its reason is gone, for example because the interface change moved into its own PR.

If the repository lacks these labels and its guidance doesn't define how PRs are reviewed, pull request review is uninitialized (see [initialization](initialization.md#when-to-initialize)). Propose initializing it, and until it is, treat every PR as `review:human`: open it and request review, but don't merge it.

## Merge gate

An agent merges a `review:ai` PR only when every condition below holds on its current head commit. For a `review:human` PR, a human's approval takes the place of the lane check in condition 1, and the rest of condition 1 and conditions 2 to 8 hold as well, except that a PR from a fork passes condition 1 once a person approved it. For each condition, read the [verification record](#verification-record) first and do yourself only what it doesn't cover.

The gate reviews the PR's content, not its code: each condition checks that the PR has what this skill requires. Where a local review is missing, the condition fails and the PR goes back to the author's side.

Don't rely on branch protection, rulesets, or required checks. They may be missing, and private repositories on GitHub Free have neither: the API answers 403. This gate is the only enforcement.

1. **The lane still fits.** Read the PR with `gh pr view --json` and the fields it needs, including `isCrossRepository`, `isDraft`, `mergeable`, `headRefOid`, `files`, and `latestReviews`. The head branch is in the repository itself, not a fork. The final diff still fits `review:ai` as [Classify](#classify) defines it, the PR isn't a draft, and it has no merge conflicts with the current base. A head that lacks the base's latest commits but doesn't conflict passes. No reviewer's latest review requests changes, and if the reviews can't be read, this condition fails. Note the head commit SHA. Every later check refers to it.
2. **CI is green.** Read the head commit's check runs and commit statuses with `gh pr checks --json`. Every check finished and succeeded, or its own conditions skipped it. Pending, failed, cancelled, and timed-out checks all block the merge. A head commit without any checks blocks it too, unless the repository has no CI that runs on pull requests. If the token can't read checks, read the head commit's workflow runs and jobs with `gh run list --commit` and `gh run view` instead, as in [Read CI results](gh-cli.md#read-ci-results). If CI can't be read at all, this condition fails. A PR's `mergeStateStatus`, such as `CLEAN` or `UNSTABLE`, is not evidence that CI passed or failed.
3. **Every commit has a local review on record.** List the commits with `gh pr view --json commits`. A merge commit is read as step 3 of [How to read it](#how-to-read-it) describes: a merge of the base, or of a batched leaf's branch, that changed nothing beyond its parents needs no entry. Any other commit counts as reviewed when the record's pre-commit review entry names it as passed, or when a record you can read yourself shows that it passed the repository's pre-commit review gate, such as the codex-review gate: your own transcript, or the host's record of a delegated agent's tool calls. A passing gate leaves no trace in git, which is why the side that can read that record writes the entry. A commit that neither covers fails this condition: a commit made in a repository without a pre-commit review gate, a commit a rebase rewrote, or a commit that skipped the gate through `git commit --no-verify` or `-n`, a bypass variable such as `CODEX_GATE_BYPASS`, or a `core.hooksPath` override. Don't review it at the PR. Send the PR back to its author's side, naming each uncovered commit: the author reviews those commits locally, under the team's AI controls, or remakes them through the gate, and adds the result to the record. When you are the author's side and work in its local checkout, do that there first, then come back to the gate. The commits of a PR from a fork are never covered by the fork author's entries, so a person with write access reviews them locally and records the result. Report a skipped gate to the user as well.
4. **A high-risk change had a security review.** When the diff touches access control or authentication, secrets, data migrations or deletion, an external API or protocol contract, deployment or infrastructure configuration, a release, or anything repository guidance lists as high risk, the verification record holds a security review that covers it, as described in [How to read it](#how-to-read-it). Decide whether the change is high risk from the changed files and the PR's description, not by reviewing the code. In a [batch](fan-out.md#batch-leaves-into-one-pull-request), decide it for each leaf: each high-risk leaf needs a security review in its own part of the record, and a review in one leaf's part never covers another leaf. When no review covers it, the condition fails: send the PR back to the author's side to run the security review locally on what the record doesn't cover and add it to the record. Don't run one at the gate.
5. **Every acceptance criterion has evidence.** For each issue the PR closes, every criterion has evidence recorded in an issue comment, in a test report in the repository's docs, or in the record's acceptance evidence. A checked box or a linked PR is not evidence. Evidence recorded on an earlier commit still counts when the later commits don't change what it exercised. Otherwise, check that criterion again on the head. The record also holds an [acceptance check](#acceptance-check) that covers every criterion, on the head or on an earlier commit that the later commits don't change for that criterion. When none covers it, the condition fails: send the PR back to the author's side to run the check locally and add it to the record. Don't run one at the gate.
6. **The checks passed on the head commit.** Take the commands from repository guidance: the format check, lint, tests, and acceptance checks. A command counts as passed when CI ran it on the head commit and the step that runs it succeeded, or when the record shows that it passed on the head commit in a clean checkout, meaning a fresh clone or a new git worktree with no uncommitted or untracked files. Read the workflow file and the run's jobs to see which commands CI ran. A step that can't fail, through `continue-on-error`, `|| true`, or the like, doesn't count. When a command is a wrapper, such as `make ci`, read what it runs before you match it with CI. When you can't match a command with a CI step, treat it as not run. Run the remaining commands yourself in a clean checkout of the head commit, not the author's working copy. When the PR changes how the checks run, such as a workflow file, or a script or setting that decides which checks and tests run, CI tested it with a pipeline the PR itself changed, so its results don't count. A clean-checkout entry for the head commit still does. For a PR from a fork, run its code only after a person approved it, in an isolated environment without secrets. When commands remain and the host can't run commands, this condition fails.
7. **Each issue reads as final.** The `State` section of every closing issue describes the final state, and the body passes the [cold-start check](work-item-format.md#cold-start-check).
8. **The PR closes its issues.** The PR body has `Closes owner/repo#N` for every issue it completes. Use the full `owner/repo#N` form. A PR that closes no issue fails this condition.

The gate doesn't require the head to contain the base branch's latest commits. A PR that doesn't conflict merges as it is, however far the base moved. The cost is that CI tested the head, or, for a GitHub Actions `pull_request` run, the head merged with the base as it was when the run started. Two PRs that each passed alone can still break the base together without a textual conflict. The base branch's own CI on the merge commit catches that, as described in [After the merge](#after-the-merge).

Before merging, record the gate in a PR comment: the head SHA, the result of each condition, which entries of the record you relied on, and the commands you ran yourself with their results.

**When a condition fails,** don't merge. A missing local review or acceptance check goes back to the author's side, as conditions 3, 4, and 5 describe, and is never made up for at the PR. Fix anything else that is within the authorized scope, then check again only what the fix could change. On a new head commit, that is conditions 1 and 2, condition 3 for the new commits, and the others only where the fix touched what they check. A command that CI doesn't run is run again only when the fix changed files it checks. On an unchanged head, it is only the condition that failed.

A failed condition doesn't make the PR `review:human`. Relabel it only when it now matches a reason in [Classify](#classify). When the gate can't pass and the fix is outside your scope, stop and report what blocks it. If that is a decision, ask it as a [pending decision](../SKILL.md#mark-or-clear-a-blocker). Leave the PR open and say what it waits for in the issue's `State`.

## Human review

For a `review:human` PR, the agent opens the PR and requests review. It merges the PR only after a human approves its current head commit for merging.

1. Write why the PR needs a person, naming the matching reason from [Classify](#classify), and list each point the reviewer must confirm. Put it in the PR body and in the issue's `State`, so a reviewer who opens either one knows what to judge. The label alone doesn't say why.
2. Request the reviewers named in repository guidance, or ask the user who should review. Use `--reviewer` on `gh pr create` or `--add-reviewer` on `gh pr edit`. When the agent works with the reviewer's own token, the reviewer is the PR's author, and GitHub doesn't let an author approve their own pull request. Assign the PR to them instead, and name it in your handoff.
3. Answer review feedback with new commits on the PR branch, and keep the issue's `State` current.
4. When the reviewer is in the conversation with you, don't hand them the PR to read. Teach them its key points and ask them to decide each one in a [review interview](#review-interview), and treat an approval that skipped the interview as not given. A reviewer who reads the PR on GitHub instead judges it from the PR body.
5. **Open the screen for an interface change.** Before the reviewer confirms an interface change, run the PR's head commit, in a local development server, a preview deployment, or the app on a device or an emulator, and open each affected screen for them in the states the change is about, such as an empty list, an error, or a narrow window. When the reviewer is in the conversation, open it for them, for example in a browser the host drives, or give them the address and the steps to reach each screen, and wait until they have it open. When they review on GitHub, put the preview link, or the steps to run the head and reach each screen, in the PR body. Screenshots and recordings help compare before and after, but they don't replace the screen, because a person judges how an interface looks and feels by seeing and trying it. Run the code of a PR from a fork only as condition 6 of the [merge gate](#merge-gate) allows. When you can't open the screen, say why, and don't take an approval of the interface until the reviewer has seen it.
6. Leave the merge to a human, unless a human approves the PR for merging and asks you to merge it. The approval can come outside GitHub, for example in the conversation. Before merging, record it in a PR comment: who approved, the date, the head SHA it covers, and for an interface change the screens opened for the reviewer and where. After a review interview, that comment is the interview record. If the head changed after the approval, ask again about what changed.
7. Before you merge, check the rest of the [merge gate](#merge-gate) on that head, as its opening paragraph describes, reading the verification record first. The person's approval covers what a person can see. It doesn't show that the tests pass or that every commit was reviewed, and the reviewer shouldn't have to check that. Then merge as described in [Merge](#merge), with that SHA.
8. Once the PR merged, verify it as described in [After the merge](#after-the-merge).

## Review interview

A reviewer who can't follow a diff or an agent's summary approves it anyway, and the human gate then checks nothing. The review interview assumes the reviewer hasn't read the PR. You teach them what they need to judge it, one point at a time, and then ask multiple-choice questions they can answer from what you taught. Their answers become the approval.

**Prepare.** Finding facts is your job, never the reviewer's. Before you start, read the PR, its diff, the closing issues, CI, and the [verification record](#verification-record), and settle every fact you can look up yourself. Use the record as it stands: don't run the checks again, and never review the code or run a security review to prepare. Do only what the record doesn't cover, as described in [How to read it](#how-to-read-it). Then list the points the reviewer must judge: each point from step 1 of [Human review](#human-review), and each place where the change makes a choice the issue didn't settle about what a user sees or does. A point you can settle from evidence is not a question, and neither is a technical choice that leaves what a user sees and does unchanged: the local reviews and the merge gate settle it.

**Open with a briefing.** Before the first question, explain in a few short paragraphs, in plain language and without code:

- the problem the PR solves and why it matters now;
- what changes for a user or operator, as before and after;
- the points you will ask about, and why each one needs a person;
- what was tested and what wasn't, from the verification record. When it holds a security review, say who ran it, what it found, and how each finding was fixed.

Explain any term or mechanism the reviewer needs, such as what a token refresh is or why a migration can't be undone, with a concrete example from this change. Don't make them look anything up.

**Teach, then ask, one point at a time.** For each point, first explain it: the situation it covers, what the PR does there, and the alternatives, each with what it costs or risks. Then ask the question, with the host's question tool when it has one.

- Make each question answerable from what you just explained. Describe behavior a user or operator would see, never files or functions, and name the issue or criterion it touches. Use the plain words you taught with, and don't bring a new term into a question or its options.
- Give two to four options. Each option says what happens if the reviewer picks it. Put your recommendation first and say why.
- Include an option such as "I'm not sure yet, explain more". When the reviewer picks it, explain the point again in a different way, with another example, and ask again. A guess is not a review.
- Ask in rounds. A point whose options depend on another point's answer waits for a later round, and points that don't depend on each other can share a round, each with its own explanation.
- When the reviewer picks an option other than your recommendation, the answer is review feedback. Change the PR as the answer requires, then explain and ask again about what the change affects. Read a free-text answer literally. A multiple-choice question answered with nothing selected settles nothing, so ask it again.
- For a point about the interface, open the screen for the reviewer before you ask, as step 5 of [Human review](#human-review) describes, and ask only once they have seen and tried it. Screenshots from before and after can go alongside it. A person can't judge a screen from a description of it.
- Answer the reviewer's own questions whenever they ask, before you go on.

**Check that the feature landed.** When the PR adds or changes what a user can do or see, ask one or two comprehension questions about the feature after teaching the points, so the reviewer approves a feature they understand and can explain to a user or a colleague. Ask about the feature, never about the technical choices behind it: how the PR handles authentication, data, or deployment is settled by the security review and the merge gate, and a reviewer who can't follow those choices shouldn't be asked to judge them. A comprehension question checks the reviewer's understanding, not the code, so it is never a reason to audit the code again.

- Ask what a user can now do that they couldn't before, what a user sees or what happens in a situation the issue is about, or what the feature deliberately leaves out. The answer must follow from what you taught.
- Don't ask how the system behaves in a rare or extreme situation the PR wasn't made for, such as a crash at an exact moment or two requests racing, and don't ask about implementation details. Remembering an edge case doesn't show understanding of the feature.
- Use the same plain words as the other questions. Give three or four options, exactly one of them correct, in random order and without a recommendation. Make each wrong option a behavior that sounds plausible but isn't what the feature does, such as what an alternative the issue rejected would have done.
- A wrong answer means the teaching didn't land, not that the reviewer failed. Explain the reason again from a different angle and ask again in other words. Don't ask for approval until the reviewer answers one correctly.

**Ask for approval last.** Once every point is settled, summarize what the PR does and what was decided, and ask whether to approve the PR for merging at its current head SHA, naming the SHA. If the head changes before the merge, run the interview again for what changed.

**Record it.** Before merging, write one PR comment: the head SHA, the reviewer, the date, and for each point the question, the options, your recommendation, the answer, and what changed because of it, for each comprehension question whether the first answer was right, and for each interface point the screens you opened, where, and on which head SHA. This comment is the approval record that step 6 of [Human review](#human-review) asks for. Add the decisions to the issues they affect, in the issue's `State` or a comment.

## Merge

Right before the merge call, read the PR again with `gh pr view --json`, including its labels, `isDraft`, `headRefOid`, `mergeable`, and `latestReviews`, and read its CI as condition 2 of the [merge gate](#merge-gate) describes. Stop unless:

- its lane still allows the merge: `review:ai` with the gate passed, or `review:human` with a recorded human approval of this head and the gate's other conditions passed;
- it isn't a draft;
- its head SHA is still the one that was checked;
- it still has no merge conflicts;
- no reviewer's latest review requests changes;
- CI is still green;
- the base branch's CI is not red, unless this PR is the fix, as described in [After the merge](#after-the-merge).

Labels, reviews, checks, and conflicts can change while the gate runs, and `--match-head-commit` guards only the head. These are reads, not a second gate: don't run anything again that the gate already settled for this head.

**Merge in line.** Ready PRs merge one at a time, in a line, and each one is checked for conflicts again right before its merge, because the previous merge can make it conflict. Order the line by dependency first: a PR whose issue another PR's issue depends on goes before it, and the PRs of one feature stay next to each other in that order. Among the rest, put first the PR that touches the most widely shared files, such as a changelog, an index, or a decision log. A `review:human` PR whose reviewer isn't ready doesn't hold the line: the PRs behind it go first, and it takes the front when the reviewer is ready. While the PR at the front resolves its conflicts, runs CI, or holds its review, nothing else merges, because a merge then would make it conflict again.

**Conflicts.** Only the PR at the front of the line brings in the base, and only when it conflicts with it, when it collides with the base on a sequence number, such as two migrations with the same number, which git doesn't report as a conflict, or when a reviewer asked for it. A PR that is behind the base but doesn't conflict merges as it is. Never bring the base into a PR further back to keep it current after a merge, not even into a sibling of the PR that just merged: it waits for its turn and then resolves its conflicts once, against every merge before it, with one CI run. To resolve a conflict, merge the base into the PR branch, resolve it, and let CI run on the new head. A conflict in a generated file is resolved by running its generator, as in [Shared hotspots](../SKILL.md#shared-hotspots). A colliding sequence number is taken again in an ordinary commit after the merge, together with every reference to it. Then check the gate for what changed, as described under [Merge gate](#merge-gate), and merge right away, before another merge can make it conflict again.

For a `review:human` PR, its turn comes when the reviewer is ready. Resolve its conflicts first, then hold the review on the new head, so the approval covers the head that merges and the reviewer isn't asked twice. When a conflict appears after the approval anyway, resolve it, then run the [review interview](#review-interview) again for what the resolution changed, and ask the human to approve the new head.

**The call.** Merge with `gh pr merge`, and pass the head SHA you checked as `--match-head-commit`, as shown in the [gh reference](gh-cli.md#merge-a-pull-request). Never pass `--admin` or `--auto`. If someone pushed after the gate, the merge fails instead of shipping unchecked commits.

- **One issue:** squash.
- **Several issues integrated in one PR,** such as a [batch](fan-out.md#batch-leaves-into-one-pull-request): use a merge commit. It keeps each issue's commits, along with their signatures, in the history.

Write the commit title and message in the repository's commit convention.

## After the merge

The merge stands in for step 5 of [Complete and close](../SKILL.md#complete-and-close). Finish steps 1 to 3 before merging, then:

1. Re-read the PR and confirm it is merged.
2. If you made the merge, fetch the base branch and check that the merge landed the PR's change and nothing else: `git diff --name-only <merge commit>^1 <merge commit>` lists the same files as the PR's `files`, using the merge commit SHA that `gh pr view --json mergeCommit` names. A difference means the merge didn't land what the gate checked. Find out what landed before you report the merge as verified.
3. Read the base branch's CI on the merge commit with `gh run list --commit`, as in [Read CI results](gh-cli.md#read-ci-results), keeping the runs whose head SHA is the merge commit and whose event is `push`. Don't hold the next merge while it runs. If it fails, the base is broken for every open PR: stop merging, find the cause, often two PRs that each passed alone, and fix it forward or revert the merge at the highest priority. For a batch, revert only the merge of the leaf behind it when one leaf alone caused it, as in [fan-out](fan-out.md#batch-leaves-into-one-pull-request). Merge nothing else into a red base except the fix. If the repository's CI doesn't run on pushes to the base, say so in the completion comment, because nothing then catches two PRs that break only together.
4. Re-read every closing issue and confirm it is closed as completed. Closing keywords work only when the PR merges into the default branch. If an issue is still open, close it through the completion ritual.
5. Re-read each issue's project item. If Status isn't the completed option, set it and verify again.
6. Add the completion comment to each issue, with the PR, the merge commit, and the validation evidence.
7. Check what the completion unblocks, as in step 7 of the completion ritual.
