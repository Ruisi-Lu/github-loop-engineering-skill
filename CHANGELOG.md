# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The version in `.claude-plugin/plugin.json` is the release version.

## [Unreleased]

### Changed

- The review interview no longer assumes the reviewer has read the pull request. It opens with a plain-language briefing: the problem, what changes for users or operators before and after, the points to decide and why each needs a person, and what was and wasn't tested. Each point is explained, with its alternatives and their costs, before its question, and every question offers "I'm not sure yet, explain more", which gets a new explanation instead of a guess. Comprehension questions for high-risk changes check what was taught, and a wrong answer means explaining again from a different angle.

## [1.7.0] - 2026-10-31

### Added

- A review interview for `review:human` pull requests (`references/pull-requests.md#review-interview`). When the reviewer is in the conversation, the agent doesn't hand them the PR to read. It looks up the facts itself, then asks one multiple-choice question per point the reviewer must judge, phrased as behavior with the consequence of each option and its recommendation first. For high-risk changes, such as access control, secrets, data migrations, external API contracts, deployment, or releases, it also asks one or two comprehension questions about a concrete situation, without a recommendation, and asks for approval only after one is answered correctly. An answer that differs from the recommendation is review feedback. The questions and answers, with the head SHA, are recorded in a PR comment as the approval record.

## [1.6.0] - 2026-10-31

### Added

- An issue that turns out too large during the work is split without asking, so it doesn't block others: the original becomes the parent, every acceptance criterion moves to a child or to the parent's done criteria, the agent keeps only the leaf it continues, the other children stay unassigned and ready for others, and a dependent issue that needs only one part waits on that child. Repository guidance can reserve splitting for humans. In a fan-out, a leaf agent proposes the split in its report and the coordinator makes it.

## [1.5.0] - 2026-10-30

### Changed

- When work on an issue starts, the agent assigns the authenticated user without asking, as the claim that keeps other people and agents from taking the same issue. It claims before any other work, and if the read-back shows that someone else claimed the issue at the same time, it removes only its own login and asks. A fan-out assigns each leaf as it claims it and skips leaves that someone else is assigned to. Repository policy or the request can still leave issues unassigned.

## [1.4.0] - 2026-10-19

### Added

- A reference for coordinating parallel agents (`references/fan-out.md`): which GitHub writes stay with the coordinator, one written brief for every agent, the report to ask for, review before anything is pushed, independent verification of risky leaves, resuming after a usage limit or a context reset, a local run log, and cleanup.
- An `Open` section for pull requests: run the checks before pushing instead of using CI as a debugger, bring in the base branch with a merge rather than a rebase, scan both the branch's commits and its final tree for secrets, check text for a public repository, and write a body that a reviewer can judge without the conversation.
- A merge gate condition that CI tested what will land: the head must contain the base branch's tip, and after the merge the merge commit's tree must equal the merged head's tree. Ready pull requests merge one at a time, starting with the one that touches the most widely shared files.
- Reading CI when `get_check_runs` answers 403, as it has for fine-grained personal access tokens: workflow runs, jobs, and failed job logs through the `actions` toolset, or a user-authorized `gh api` read of the check runs. A PR's `mergeable_state` isn't CI evidence.
- Pending decisions are external blockers that the agent asks the user about directly, in self-contained batches with its recommendation first, instead of collecting them in a parent issue's body. Each answer is recorded in the issues it affects.
- Failure handling for a write that times out (read before retrying, so a create isn't duplicated), an action the host denies (a human gate, never retried through another tool or agent), and a read too large for the host.
- An operating rule for public repositories: no secrets, internal hostnames or addresses, customer names, or personal data in issues, comments, pull requests, or commits, and a delegated agent's text is read before it goes out.

### Changed

- Delegation prompts say which writes the agent may make itself and include the tool notes it needs.
- A follow-up issue gets its milestone or parent when it is created, and it joins the current run only when it belongs there.
- A criterion the user skips is recorded as pending, with its reason, unless the user drops it. A claim that something didn't happen counts as evidence only once it can no longer happen.
- When the reviewer of a `review:human` PR is also its author, because the agent works with the reviewer's token, the agent assigns the PR to them instead of requesting a review that GitHub won't let them give.
- An agent can merge a `review:human` PR once a human approves its current head commit for merging, for example in the conversation, because GitHub doesn't let a PR's author approve it. The agent first records who approved, the date, and the head SHA in a PR comment, and asks again if the head changes. It still never merges one on its own judgment.

## [1.3.1] - 2026-10-16

### Fixed

- A `review:human` PR states why it needs a human and lists what the reviewer must confirm, in the PR body and in the issue's `State`. The issue templates' `State` comment and the cold-start check ask for the same, because the label alone doesn't tell a reviewer what to judge.

## [1.3.0] - 2026-10-10

### Added

- Pull request review lanes (`references/pull-requests.md`). Every PR is labeled `review:human` or `review:ai`. Interface and UX changes, changes that aren't clearly mergeable, changes to repository conventions, and PRs from forks need a human reviewer, and agents never merge them.
- A merge gate for `review:ai` PRs. The merging agent itself confirms that no reviewer's latest review requests changes, green CI on the head commit, a pre-commit review of every commit with no bypass in the commit record, evidence for every acceptance criterion, a passing rerun in a clean checkout, a final issue `State`, and `Closes owner/repo#N` in the PR body. It doesn't count on branch protection or required checks.
- Merge rules: re-read the PR right before merging and stop unless it is still `review:ai` at the checked head SHA with no change requests and green CI, pass that SHA as `expectedHeadSha`, squash a single-issue PR, and use a merge commit for a PR that integrates several issues. After the merge, verify that the issues closed and reached the completed Status, then add the completion comment.
- `review:human` and `review:ai` labels, a merge authority decision, and an uninitialized state for pull request review in the initialization baseline.
- MCP patterns for labeling a PR with `issue_write`, reading its CI results, commits, and reviews, and merging it. `issue_read` can't resolve a PR number, so PR labels are read with `pull_request_read`.

### Changed

- Acceptance criteria evidence goes in an issue comment or a test report in the repository's docs.

## [1.2.1] - 2026-10-10

### Fixed

- Delegated writes keep reading and writing in separate messages, so an agent never sends content it hasn't seen. Delegation prompts now carry that rule.
- Bulk runs audit every write's inputs as well as the end state. A wrong write that was corrected later still leaves an edit-history revision and cross-references, which a final read-back can't show.

## [1.2.0] - 2026-10-10

### Added

- Parallel work graphs: rules for splitting a parent issue into container and leaf issues, sizing leaves for one agent pass, adding an exit child that proves the parent's done criteria, and adding blocked-by dependencies only between leaves.
- A fan-out procedure that finds a parent's ready children, claims them, hands each to its own agent in an isolated workspace, verifies each result on GitHub, and hands out work as it becomes ready.
- Project queries for work that can start now: `-is:blocked` and `parent-issue:` filters.
- Issue template management (`references/issue-templates.md`): the skill's templates are the source of truth, and the agent proposes a pull request when a repository's installed templates fall behind.
- Guidance for bulk changes: GitHub's secondary rate limits, batch field updates, chunked delegation, and a control query before trusting an empty filter result.
- A `Ready` view in the initialization baseline, filtered to `status:Todo -is:blocked`.
- A rule to repeat the MCP-only rule, exact tool inputs, and stop conditions when delegating GitHub work, because a delegated agent doesn't inherit the skill.
- Fallbacks for writing native issue dependencies and creating milestones, which the official MCP server doesn't support yet. They use the GitHub CLI's API client for exactly those requests, and only after the user authorizes them.

### Changed

- Agents triage by best judgment: they set Priority when they create an issue and move accepted work out of Triage themselves. Repository guidance, or Status descriptions on boards initialized with earlier versions, can reserve triage for humans. Initialization adds triage authority as a decision.
- Waiting on another issue is recorded as a native blocked-by dependency and keeps the accepted status. `Blocked`, the `blocked` label, and the `Blocked by` section are for blockers outside the work graph.
- Issue bodies no longer repeat board fields such as Status or Priority, and `Pointers` lists the parent and prerequisite issues. The `en` and `zh-TW` templates follow.

## [1.1.0] - 2026-09-29

### Added

- A cold-start contract and a cold-start check that runs on the read-back body when an issue is created, when its body or Status changes, and before it is closed.
- First-use initialization: a gate that detects uninitialized issues or boards, an authorization step, and a baseline for Status and Priority options, labels, project workflows, views, issue types, and repository settings. The baseline is derived from a production setup (`references/initialization.md`).
- Cold-start issue templates for Feature, Bug, and Task in `en` and `zh-TW` (`assets/issue-templates/`). Initialization proposes them through a pull request.
- MCP payload patterns for creating labels, adding project views, setting assignees, and proposing files through a pull request.
- Repository checks for the issue templates: the same file set in each locale, valid front matter, the required cold-start sections, and no preset assignees.

### Changed

- Issues are created unassigned. Assignment is decided when work starts, and the agent asks before assigning the user unless the request or repository policy already decides. `get_me` resolves the login, because MCP assignee lists don't accept `@me`.
- The work-item format now uses the template sections `Why`, `What`, `State`, `Acceptance criteria`, and `Pointers`, with a `Reproduction` section for bugs.
- Lifecycle rules now account for project automations. An Auto-close issue workflow closes the issue when Status becomes Done, and without a reopen workflow, Status must be restored by hand after a reopen.

## [1.0.0] - 2026-09-29

First versioned release. Earlier commits were unversioned.

### Added

- Claude Code plugin packaging (`.claude-plugin/plugin.json`) and a single-plugin marketplace (`.claude-plugin/marketplace.json`) that installs the unchanged skill.
- Repository checks in `scripts/` (Bun and TypeScript) covering manifest alignment, changelog version, skill frontmatter, and relative Markdown links, plus `claude plugin validate --strict`.
- A CI workflow that runs the checks on pushes and pull requests.
- Toolset selection guidance for the remote and local GitHub MCP Server distributions.
- Guidance for batch project field updates, one-call sub-issue creation with `parent_issue_number`, duplicate closes, and `closed_by_pull_requests` evidence.

### Changed

- The GitHub MCP reference now matches the current official tool schemas, for example `perPage` instead of `per_page`.
- The docs state the official server's default toolsets exactly. They omit `projects` and `labels`.
- The README covers Claude Code plugin installation and how each host invokes the skill.

[Unreleased]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.7.0...HEAD
[1.7.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.6.0...github-loop-engineering--v1.7.0
[1.6.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.5.0...github-loop-engineering--v1.6.0
[1.5.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.4.0...github-loop-engineering--v1.5.0
[1.4.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.3.1...github-loop-engineering--v1.4.0
[1.3.1]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.3.0...github-loop-engineering--v1.3.1
[1.3.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.2.1...github-loop-engineering--v1.3.0
[1.2.1]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.2.0...github-loop-engineering--v1.2.1
[1.2.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.1.0...github-loop-engineering--v1.2.0
[1.1.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.0.0...github-loop-engineering--v1.1.0
[1.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/releases/tag/github-loop-engineering--v1.0.0
