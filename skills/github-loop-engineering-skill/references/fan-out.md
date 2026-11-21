# Coordinating parallel agents

Use this reference when you fan out a parent issue's ready leaves to parallel agents, as described in [Fan out from a parent issue](../SKILL.md#fan-out-from-a-parent-issue), and when you resume a fan-out after an interruption. You are the coordinator: you claim the leaves, brief the agents, check their reports, open and merge the pull requests, and keep GitHub current. Each leaf agent implements one leaf, asks you what its issue and the brief don't answer, and reports back.

These practices come from a production run in which parallel agents completed a milestone of several dozen leaves. Repository guidance wins over them.

## Contents

- [Who writes what](#who-writes-what)
- [Write one brief](#write-one-brief)
- [Agent report](#agent-report)
- [Answer the agents' questions](#answer-the-agents-questions)
- [Review before anything goes out](#review-before-anything-goes-out)
- [Verify risky leaves independently](#verify-risky-leaves-independently)
- [Batch leaves into one pull request](#batch-leaves-into-one-pull-request)
- [Resume after an interruption](#resume-after-an-interruption)
- [Keep a run log](#keep-a-run-log)
- [Clean up](#clean-up)

## Who writes what

Decide which writes stay with you before you hand out the first leaf. By default, the coordinator keeps:

- pushing branches and opening pull requests;
- review labels, Status, Priority, assignees, milestones, and dependencies;
- merges.

A leaf agent works on its own branch in its own workspace and stops before the first push. It reports its head commit, its evidence, and a pull request body draft. On GitHub it changes only its own issue: the `State` section and the acceptance criteria it has evidence for, keeping the rest of the body byte for byte, plus implementation notes as comments. It never merges, and it doesn't create issues. Follow-up work goes into its report as a proposal. When its leaf turns out too large, it stops at a clean point and proposes the parts in its report, and you [split the leaf](../SKILL.md#split-an-issue-that-turns-out-too-large).

The reasons:

- A host can deny a delegated agent's GitHub writes, and sometimes its reads, while it allows the same call from the session the user works in. An agent stalls on a denied write. A coordinator that owns the write doesn't.
- In a public repository, everything an agent pushes or writes is published at once, and history keeps it after an edit or a deletion. The coordinator reads it first.
- Only the coordinator sees every open pull request, so only it can order the merges and check that each one lands the tree CI tested.
- CI runs on every push. An agent that pushes to see what CI says spends minutes and reruns that a local check would have saved.

When the host denies an agent's action, don't have another agent retry it. Make the write yourself only if the user's authorization covers it. Otherwise ask the user.

## Write one brief

Write one brief for the whole run, in a file every agent reads, and point each agent's prompt at it together with the issue number. Every agent then follows the same rules, and a fix to the brief reaches every later agent. The brief covers what an agent doesn't inherit:

- the repository guidance to read first, and that the issue body is the specification;
- the [write split](#who-writes-what), including the issue sections it may change;
- GitHub access through gh only, inside the [command boundary](gh-cli.md#command-boundary), with `-R owner/repo` on every command and every body passed with `--body-file`;
- commit conventions, signing, and the pre-commit review gate, which it never bypasses, not even for a work-in-progress commit;
- running the repository's checks on its final head commit in a clean checkout, such as a new git worktree of that commit with no uncommitted or untracked files, and reporting each command with its result, because that run is the one the pull request records;
- bringing in the base branch only when you ask for it, because its pull request conflicts with the base at its turn to merge, and then with a merge rather than a rebase, because a rebase rewrites commits without running the pre-commit hook. A pull request that is only behind the base doesn't catch up. A merge commit holds only the merge and its conflict resolutions, a generated file is regenerated rather than merged by hand, and the agent never merges another leaf's branch into its own;
- where heavy builds and tests run, and the lock on any shared test environment, so parallel agents don't overload one machine or deploy over each other;
- where test evidence and scratch files go, and what never goes into them in a public repository;
- to [ask you](#answer-the-agents-questions), not the user and not another agent, whatever its issue, the brief, and the repository don't answer, instead of guessing, and how a question reaches you on this host;
- the [report](#agent-report) to send, and when to stop: done, blocked by something outside the leaf, a question it can't work around while it waits for your answer, or the same failure twice without a new approach.

Keep a brief that names your own machines or habits out of the repository's shared guidance files, because every contributor's agent loads those. Tell agents to commit a checkpoint every hour or so, through the pre-commit gate, so an interruption loses little. Choose each agent's model and effort for its leaf's risk rather than one setting for every leaf.

## Agent report

Ask for a short report in this shape, so you can check it item by item:

```markdown
- Branch and head commit: <branch> <sha>
- Pull request body draft: <path>
- Review lane: review:ai or review:human, and why
- Commits: each commit and its pre-commit review outcome (passed the first time, or what it blocked and how that was fixed)
- Checks: each command, where it ran, the commit it ran on, and its result
- Acceptance criteria: each criterion with its evidence (command and result, or test report path), or "not met" and why
- Docs changed: paths
- Follow-up proposals: one line each
- Questions: none, or each question still open, what the agent checked, and the options it sees. You decide which ones go to the user
- Split proposal: none, or the parts the leaf should split into, which part is done, and which criteria each part proves
- Descoping proposal: none, or each criterion or scope line that looks unneeded and why. The agent still meets every criterion unless the coordinator relays the user's decision to drop it
- Side effects: anything left running or changed on shared machines or environments
- Not done: what the agent couldn't do, and why
```

## Answer the agents' questions

A leaf agent asks you when its issue, the brief, and the repository don't answer a question, instead of guessing or stopping. You answer it yourself. Don't route it to a separate advisor agent: you hold the run's context, such as what other leaves changed or decided, which shared files they touch, and what the user already decided in this run, and an advisor would first need all of that in its brief. A leaf agent doesn't ask the user directly either, so every question reaches the user through you, once, together with the other agents' questions.

- Answer what the run settles: another leaf's interface or the shared file it touches, how the brief applies, or a decision the user already made. Point to where it is recorded when it is.
- A question only the user can answer, such as dropping a criterion or a product tradeoff, goes to the user as a [pending decision](../SKILL.md#mark-or-clear-a-blocker). Don't answer it for them. The agent works on what the question doesn't touch, or stops at a clean point.
- Don't design the leaf for the agent. Name the constraints that bind it and leave the design to the agent, so the change you review later is its own.
- When an answer changes what the leaf builds or how a criterion reads, write it into the issue as an implementation note when you answer. Then someone who resumes the leaf cold, and the [acceptance check](pull-requests.md#acceptance-check), read what the agent was told. An answer that only explains needs no note.
- Give the acceptance check and the [verifier](#verify-risky-leaves-independently) the issue, not your conversation with the agent. The issue carries every answer that changed the work.
- When a second agent asks the same question, the brief is missing it. Add it to the brief, so every later agent reads it, and answer by pointing there.

How the question reaches you depends on the host. When an agent can message you while it runs, it asks and waits. When it can't, it commits a checkpoint through the pre-commit gate, stops, and puts the question in its report. You answer and resume the same agent, or start a new one on its workspace when the host can't resume it.

## Review before anything goes out

The report is a claim. Check it against what you can read, and don't do the agent's work again:

1. Read the diff, the commits, and the pull request body draft. Check them against the repository's rules. In a public repository, also check them for secrets, internal hostnames or addresses, customer names, and personal data.
2. Have a fresh agent run the [acceptance check](pull-requests.md#acceptance-check) on every leaf, on a smaller and faster model than the leaf agent's. Give it the issue, the branch and head commit, and the report's acceptance evidence, but not the leaf agent's reasoning. It is cheap enough to run on every leaf, and it keeps the line-by-line comparison with the criteria out of your own context. Send each "not met" back to the leaf agent, which fixes it with a new commit, and have only the criteria the fix touches checked again.
3. Decide the review lane from the change yourself, as in [Classify](pull-requests.md#classify). Don't copy the agent's choice. Answer the report's questions as in [Answer the agents' questions](#answer-the-agents-questions), and ask the user those only they can answer as [pending decisions](../SKILL.md#mark-or-clear-a-blocker) now, so they are settled before the pull request opens.
4. In the agent's transcript or the host's record of its tool calls, confirm that each commit passed the pre-commit review without a bypass, and that the reported checks ran on the head commit in a clean checkout and passed. Run a check yourself only when that record doesn't show it.
5. Write what you confirmed, and the acceptance check's result, into the pull request body's [verification record](pull-requests.md#verification-record). You are the one who can read the agent's transcript, so your entry is what the merge gate and every later reviewer rely on, and nobody has to audit those commits or run those checks again.
6. Push, open the pull request, and label it, as in [Open](pull-requests.md#open). When other ready leaves change the same files and meet the conditions in [Batch leaves into one pull request](#batch-leaves-into-one-pull-request), batch them into one pull request instead. Read CI yourself, and send any failure back to the agent, which fixes it with a new commit. A batch that fails is handled as that section describes.

## Verify risky leaves independently

For a leaf with security or design risk, such as authentication, tenant isolation, secrets, or release signing, have a second agent try to break the change before the pull request opens. Give it the issue, the branch, and the claims to attack, but not the implementing agent's reasoning. In practice, such verifiers found real defects that the implementing agent's own tests passed: a way around an isolation boundary, secret material left behind, a race, and a check that accepted too much.

Hand each finding back to the implementing agent with a concrete fix, a regression test, and a mutation that undoes the fix and must make that test fail. Then review the fix yourself for variants of the same finding. A fix often closes the reported case and leaves a sibling open.

Write the verification into the pull request's [verification record](pull-requests.md#verification-record) as its security review: the commit it covered, the verifier's model, the claims it attacked, and each finding with its fix. This is the one independent attack on the change. Whoever reviews or merges the pull request later reads that entry instead of attacking the same code again.

## Batch leaves into one pull request

Every pull request runs CI, and leaves that change the same files conflict with each other one merge at a time, each resolution followed by another CI run. Leaves of one feature that each wait for a person meet the same conflicts, and each resolution also asks the person to approve a new head. When several leaves that change the same files are ready together, combine them locally into one batch branch and open one pull request for it. CI runs once for the whole batch, you resolve the conflicts between its leaves once, before anything is pushed, a person reviews the feature once, and the checks on the batch's head catch two leaves that break only together before they reach the base branch. Only the batch branch is pushed. The leaves' own branches stay local.

**Which leaves go together.** A batch holds leaves that:

- each passed [review](#review-before-anything-goes-out) on its own branch: its report checked, its acceptance check run, and every finding fixed;
- change the same files or the same [shared hotspot](../SKILL.md#shared-hotspots), so their conflicts are resolved once. Leaves that share no file save only CI time, while each one widens what a single failure holds back. Batch them only when CI time is what limits the run;
- share a review lane. A batch is either all `review:ai`, or all `review:human` leaves of one feature: leaves of the same parent that change the same screen or flow. The person then reviews the feature once, as a whole, in one [review interview](pull-requests.md#review-interview), instead of approving each part alone and approving again whenever a sibling's merge changes its head. Keep `review:ai` leaves out of a human batch, even the logic behind its screens, because they would wait for the reviewer for nothing;
- are ready now. Don't hold a finished leaf back for a sibling still in progress. It goes out alone, or with the next batch if that one is ready first.

A high-risk leaf, one that [independent verification](#verify-risky-leaves-independently) covers, can join a batch too. Its security review goes into its own part of the record with its scope stated as that leaf's commits, so nobody reads it as covering the other leaves, and its merge commit inside the batch lets you revert it alone. When a resolution in the batch changes code in that review's scope, have that change reviewed too and add it to the leaf's entry, as step 3 of [How to read it](pull-requests.md#how-to-read-it) requires.

Don't batch when the repository allows only squash merges or a linear history, because a batch needs a merge commit to keep each leaf's commits and to revert one leaf alone. Keep a batch small: at most five leaves, unless repository guidance sets another limit. A larger batch is harder to read, and one failure in it holds back more work.

**Build it.**

1. Create the batch branch from the base branch's tip.
2. Merge each leaf's branch into it with `git merge --no-ff`, one leaf at a time, starting with the leaf that changes the most shared files. Never squash or rebase a leaf. A merge keeps the leaf's commits, with their signatures and their pre-commit review records, and its merge commit lets you revert that one leaf later.
3. Resolve a conflict in its merge commit. A resolution is new code, so it goes through the pre-commit review gate like any other commit. Check what each merge changed beyond its two parents with `git show --remerge-diff <merge commit>`. A merge that changed nothing there needs no review entry.
4. When a resolution changes code or evidence that a leaf's acceptance criterion depends on, have that criterion checked again on the batch's head, as in [Acceptance check](pull-requests.md#acceptance-check). The other criteria keep their results, because the leaves' commits are unchanged.
5. Run the repository's checks once on the batch's head in a clean checkout. This is the run the pull request records. Each leaf's own run on its head showed that the leaf works alone, so a failure here comes from the combination or a resolution.

**When the batch fails.** Find the leaf, or the pair of leaves, behind the failure, for example by rebuilding the batch without one leaf at a time. When the fix is quick, the leaf agent fixes it with a new commit on its own branch, and you merge that branch into the batch again. Otherwise take the leaf out: rebuild the batch without it from the same base commit, and send the leaf out alone or with a later batch. A rebuilt batch has new merge commits, so its resolutions go through the pre-commit review gate again, and its checks run again on the new head. Before the push, rebuilding changes only your local branch. Once the pull request is open, push the rebuilt batch as a new branch with a new pull request, and close the old one with a comment that points to the new one, rather than force-pushing over commits that the old pull request's record names. Update each leaf issue's `State` to name the new pull request, and the leaf you took out to say where it goes next.

**Open and merge it.** Write one pull request for the batch, with the batch layout described in [Open](pull-requests.md#open) and `Closes owner/repo#N` for every leaf. Name the batch pull request in each leaf issue's `State`, so someone who resumes a leaf finds it. A batch that holds a `review:human` leaf is `review:human` as a whole: list every leaf's points in the body's review lane section, cover them in one review interview that opens each leaf's screens, and take one approval for the batch's head. Merge it with a merge commit, like any pull request that integrates several issues, as in [Merge](pull-requests.md#merge). When the base branch's CI fails on the merge and one leaf alone is behind it, revert only that leaf's merge commit inside the batch with `git revert -m 1 <leaf merge commit>`. When a pair of leaves is behind it, or a later leaf's merge resolved a conflict with it so the revert doesn't apply cleanly, fix forward or revert the whole batch's merge commit instead. A revert is a new change: it goes through its own pull request and the merge gate like any other. Reopen each issue whose leaf it took out, and update its `State` with the revert and what is left to do. The leaf's commits stay in the base's history, so to land the leaf again later, revert that revert first and then add the fix.

## Resume after an interruption

A usage limit, a crash, or a context reset can stop one agent or all of them at once. The agents' workspaces stay. Before you resume anyone, rebuild the state from GitHub: the parent's children, their Status, the open pull requests, their CI, and their verification records. Then read your [run log](#keep-a-run-log) for what GitHub doesn't hold. An open batch pull request names its leaves and their heads in its body. A batch that wasn't pushed yet exists only in your workspace and the run log, so rebuild it from the leaves' heads the log names.

A resumed agent, or a new agent that takes over a leaf, first rechecks its own state: its branch and uncommitted changes, anything it pushed, the locks it holds, and the jobs it started.

## Keep a run log

GitHub holds the state of the work, but not the coordinator's own state: which agent has which leaf, workspace paths, background jobs and locks, each batch's branch, the leaves it holds with their head commits and the order they were merged in, and the next step for each item. Keep that in a local file outside the repository, update it at each transition, and read it after a context reset. The log never replaces an issue's `State` or a pull request's verification record. Anything another person needs goes to GitHub.

## Clean up

After a leaf's pull request, or the batch that holds it, merged and its issue closed, remove the leaf's workspace and local branch, and release any lock or job it left behind. A host can keep the workspace of an agent that might still be resumed locked. Leave that workspace until the agent is done.
