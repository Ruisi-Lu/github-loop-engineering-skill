# Coordinating parallel agents

Use this reference when you fan out a parent issue's ready leaves to parallel agents, as described in [Fan out from a parent issue](../SKILL.md#fan-out-from-a-parent-issue), and when you resume a fan-out after an interruption. You are the coordinator: you claim the leaves, brief the agents, review and verify their work, open and merge the pull requests, and keep GitHub current. Each leaf agent implements one leaf and reports back.

These practices come from a production run in which parallel agents completed a milestone of several dozen leaves. Repository guidance wins over them.

## Contents

- [Who writes what](#who-writes-what)
- [Write one brief](#write-one-brief)
- [Agent report](#agent-report)
- [Review before anything goes out](#review-before-anything-goes-out)
- [Verify risky leaves independently](#verify-risky-leaves-independently)
- [Resume after an interruption](#resume-after-an-interruption)
- [Keep a run log](#keep-a-run-log)
- [Clean up](#clean-up)

## Who writes what

Decide which writes stay with you before you hand out the first leaf. By default, keep these with the coordinator:

- pushing branches and opening pull requests;
- review labels, Status, Priority, assignees, milestones, and dependencies;
- merges.

A leaf agent then works on its own branch in its own workspace and stops before the first push. It reports its head commit, its evidence, and a pull request body draft. On GitHub it changes only its own issue: the `State` section and the acceptance criteria it has evidence for, keeping the rest of the body byte for byte, plus implementation notes as comments. It never merges, and it doesn't create issues. Follow-up work goes into its report as a proposal.

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
- GitHub access through MCP only, with the tool notes it needs. For example, `issue_read` can't resolve a pull request number, so a pull request's labels come from `pull_request_read`;
- commit conventions, signing, and the pre-commit review gate, which it never bypasses, not even for a work-in-progress commit;
- bringing in the base branch with a merge rather than a rebase, because a rebase rewrites commits without running the pre-commit hook;
- where heavy builds and tests run, and the lock on any shared test environment, so parallel agents don't overload one machine or deploy over each other;
- where test evidence and scratch files go, and what never goes into them in a public repository;
- the [report](#agent-report) to send, and when to stop: done, blocked by something outside the leaf, or the same failure twice without a new approach.

Keep a brief that names your own machines or habits out of the repository's shared guidance files, because every contributor's agent loads those. Tell agents to commit a checkpoint every hour or so, through the pre-commit gate, so an interruption loses little. Choose each agent's model and effort for its leaf's risk rather than one setting for every leaf.

## Agent report

Ask for a short report in this shape, so you can check it item by item:

```markdown
- Branch and head commit: <branch> <sha>
- Pull request body draft: <path>
- Review lane: review:ai or review:human, and why
- Commits: each commit and its pre-commit review outcome (passed the first time, or what it blocked and how that was fixed)
- Acceptance criteria: each criterion with its evidence (command and result, or test report path), or "not met" and why
- Checks: each command, where it ran, and its result
- Docs changed: paths
- Follow-up proposals: one line each
- Side effects: anything left running or changed on shared machines or environments
- Not done: what the agent couldn't do, and why
```

## Review before anything goes out

The report is a claim. Before you push:

1. Read the diff, the commits, and the pull request body draft. Check them against the issue's acceptance criteria and the repository's rules. In a public repository, also check them for secrets, internal hostnames or addresses, customer names, and personal data.
2. Decide the review lane from the change yourself, as in [Classify](pull-requests.md#classify). Don't copy the agent's choice.
3. Audit each commit's pre-commit review in the agent's transcript or the host's record of its tool calls, and rerun the checks in a clean checkout, as the [merge gate](pull-requests.md#merge-gate) requires.
4. Push, open the pull request, and label it, as in [Open](pull-requests.md#open). Read CI yourself, and send any failure back to the agent, which fixes it with a new commit.

## Verify risky leaves independently

For a leaf with security or design risk, such as authentication, tenant isolation, secrets, or release signing, have a second agent try to break the change before the pull request opens. Give it the issue, the branch, and the claims to attack, but not the implementing agent's reasoning. In practice, such verifiers found real defects that the implementing agent's own tests passed: a way around an isolation boundary, secret material left behind, a race, and a check that accepted too much.

Hand each finding back to the implementing agent with a concrete fix, a regression test, and a mutation that undoes the fix and must make that test fail. Then review the fix yourself for variants of the same finding. A fix often closes the reported case and leaves a sibling open.

## Resume after an interruption

A usage limit, a crash, or a context reset can stop one agent or all of them at once. The agents' workspaces stay. Before you resume anyone, rebuild the state from GitHub: the parent's children, their Status, the open pull requests, and their CI. Then read your [run log](#keep-a-run-log) for what GitHub doesn't hold.

A resumed agent, or a new agent that takes over a leaf, first rechecks its own state: its branch and uncommitted changes, anything it pushed, the locks it holds, and the jobs it started.

## Keep a run log

GitHub holds the state of the work, but not the coordinator's own state: which agent has which leaf, workspace paths, background jobs and locks, and the next step for each item. Keep that in a local file outside the repository, update it at each transition, and read it after a context reset. The log never replaces an issue's `State`. Anything another person needs goes to GitHub.

## Clean up

After a leaf's pull request merged and its issue closed, remove the leaf's workspace and local branch, and release any lock or job it left behind. A host can keep the workspace of an agent that might still be resumed locked. Leave that workspace until the agent is done.
