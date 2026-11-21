# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The version in `.claude-plugin/plugin.json` is the release version.

## [Unreleased]

## [6.2.0] - 2026-11-22

### Changed

- A pull request opens complete and is never where verification is finished (`references/pull-requests.md#verification-record`). Once it opens, a reviewer or a merging agent may start on it at any moment, so every entry the merge gate needs is in its body when it opens. Afterwards a comment adds only what happens at the pull request by design: CI results, the gate's result, a human's approval or review interview, and the record for a conflict resolution at its turn to merge or a change a reviewer asked for, written before the merge or the review is asked for again.
- The merge gate and the review interview only read (`references/pull-requests.md#merge-gate`). They no longer run checks the record doesn't cover, check a criterion again on the head, or collect evidence. A missing review, check, or piece of evidence, a red CI run, or anything else the author has to fix returns the pull request to draft with `gh pr ready --undo`, names the gap in a comment and in each closing issue's `State`, and leaves it to the author's side, which completes it locally, records it in the body, and marks the pull request ready again. For a pull request from a fork, a person with write access runs the remaining commands and records them before the gate. Review feedback is answered with new commits whose reviews, checks, and evidence are recorded before the reviewer is asked to look again.

## [6.1.0] - 2026-11-22

This change comes from a batch pull request that merged two days after it opened. Its CI was green 22 minutes after it opened, but its acceptance check had found the end-to-end evidence missing, and the end-to-end runs, the browser runs, the criterion-by-criterion evidence, and a migration's review all happened after the pull request was open. It couldn't pass the merge gate until the last of them was recorded.

### Changed

- Verify, then open (`SKILL.md#pull-requests`, `references/pull-requests.md#open`). A pull request opens only once it could merge as soon as CI is green. Before the first push, every acceptance criterion is proven, including the end-to-end, browser, hardware, and environment runs it needs against the head that will be pushed, and only then does the acceptance check run. A pull request, or a draft, is never opened to park the work while verification continues. The one exception is a criterion whose proof is a CI job that runs only on pull requests. An acceptance check that finds the code fits but the evidence missing means the work isn't ready to open. The pull request body no longer offers "not met" for a criterion.
- Fan-out leaves go out only with every criterion proven (`references/fan-out.md`). The brief tells each leaf agent to prove every criterion before it reports done, the coordinator sends a leaf with an unproven criterion back instead of opening its pull request, and a batch runs the evidence that depends on its leaves together on the batch's head before the push.
- Leaf criteria must be provable before the merge (`SKILL.md#plan-a-work-graph`, `references/work-item-format.md#cold-start-check`). A proof that needs the merged result, such as a deployment of the base branch or a test on site, belongs to a later child that depends on the leaf.

### Added

- Plan the verification (`SKILL.md#plan-the-verification`). Right after the overbuilding check, and before writing code, the agent decides what will prove each acceptance criterion and where it runs, and lines up what the proof needs. A criterion that only something after the merge can prove goes to the user at once, as a pending decision: prove it before the merge some other way, or move it into its own issue blocked by this one. In a fan-out, the coordinator plans each leaf's verification before handing it out.

## [6.0.0] - 2026-11-21

This release replaces the skill's only runtime dependency. GitHub access goes through the GitHub CLI instead of the GitHub MCP Server. Before upgrading, install `gh` 2.97.0 or later, sign in with `gh auth login`, and add the Project scope with `gh auth refresh -s project`. A GitHub MCP server is no longer needed.

### Changed

- GitHub through gh (`SKILL.md#rules`, `references/gh-cli.md`). Every GitHub read and write uses the GitHub CLI: its own commands first, and `gh api` for REST or GraphQL requests they don't cover. The MCP server added no capability the CLI lacks, cost more tokens per operation, and agents reached for `gh` anyway despite the MCP-only rule, so one session often mixed both clients. A connected GitHub MCP server isn't used for the skill's work, so every agent's commands, records, and briefs stay comparable. `references/gh-cli.md` replaces `references/github-mcp-tools.md`: setup and scopes, a command boundary, conventions, a command map, and command patterns for every operation the old reference covered.
- The installed gh wins (`SKILL.md#rules`). Rule 2 now says to follow `gh <command> --help` on the installed version when a flag is unclear, to read JSON rather than table output, and to pass bodies with `--body-file` rather than inline through the shell.
- Native blocked-by dependencies and milestones are written directly, with `gh issue edit --add-blocked-by` and `gh api`. They no longer need the user's authorization for a fallback, and reading CI from workflow runs when check runs can't be read needs none either.
- Labels and assignees change with `--add-label`, `--remove-label`, and `--add-assignee @me`, which keep everything else, instead of sending the complete set. Claiming an issue no longer needs the login looked up first.
- A pull request gets its review label as it opens, with `--label` on `gh pr create`, and merges with `gh pr merge --match-head-commit`. `--admin` and `--auto` are never used.
- Initialization can create a missing Priority field, link the Project to the repository, and read back the Project's workflows and whether each is on (`references/initialization.md#what-the-agent-can-apply`). Status options, option colors, workflow settings, view filters, and issue types stay manual steps in the GitHub UI.
- The project quiz reads with read-only `gh` commands (`skills/project-quiz/SKILL.md`).

### Added

- A command boundary (`references/gh-cli.md#command-boundary`). gh can delete repositories, change settings, rerun workflows, and bypass branch rules, so the skill lists the commands a transition may use and the ones it never runs unless the user asks for exactly that operation. The token is never printed or passed on a command line.

### Removed

- `references/github-mcp-tools.md`, the MCP toolset guidance, and the MCP bootstrap steps.

## [5.1.0] - 2026-11-21

These changes come from measuring a repository that used 5.0.0. Over ten days, 32 of the 50 merge commits on its pull request branches had to resolve conflicts, almost all in the same few files: lists that every feature appends to, generated API files, and migration numbers. Batches never formed, because the leaves that shared the most files were the parts of one screen, each waiting for a person, and the batch rules excluded them.

### Added

- Merge in line (`references/pull-requests.md#merge`). Ready pull requests merge one at a time in a line, with the pull requests of one feature next to each other. Only the one at the front brings in the base, and only when it conflicts, so it resolves its conflicts once, against every merge before it, with one CI run. Nothing further back catches up after a merge, not even a sibling of the pull request that just merged. The line is ordered by dependency first, then by how widely shared the files are, and nothing else merges while the front pull request resolves its conflicts, runs CI, or holds its review. A `review:human` pull request whose reviewer isn't ready lets the others go first, and at its turn resolves its conflicts before the review, so the approval covers the head that merges and the reviewer isn't asked twice. A sequence number that collides with the base, which git doesn't report as a conflict, is treated like one and taken again in an ordinary commit.
- Hotspots from conflict history (`SKILL.md#shared-hotspots`). The files that recent merges actually resolved, read from the `remerge CONFLICT` lines of `LC_ALL=C git show --remerge-diff`, are the best evidence of a hotspot. Generated files and sequence numbers, such as the next migration, count as hotspots. A conflict in a generated file is resolved by running its generator, and a sequence number is taken at the leaf's turn to merge. A hotspot that conflicted in several pull requests within a few days is proposed to the user for restructuring right away, with the counts, and becomes its own issue at the priority of the work it slows once accepted.
- The verification record names the skill version (`references/pull-requests.md#open`), taken from the installing plugin's `.claude-plugin/plugin.json`, so a team can tell which rules each pull request followed.

### Changed

- A batch can hold one feature for one human review (`references/fan-out.md#batch-leaves-into-one-pull-request`): the `review:human` leaves of the same parent that change the same screen or flow. The batch gets one review interview and one approval, instead of one per part and another each time a sibling's merge changes a head. A batch holds either only `review:ai` leaves or only such `review:human` leaves. A high-risk leaf can join a batch too: its security review goes into its own part of the record, scoped to its commits, merge gate condition 4 checks each high-risk leaf on its own, and its merge commit lets it be reverted alone. Before, a batch held only `review:ai` leaves without a security review.
- A merge commit holds only the merge and its conflict resolutions (`references/pull-requests.md#open`). Other changes, such as updates to a test report, go in an ordinary commit after it, and evidence isn't updated just because the base moved.
- No stacked branches (`SKILL.md#plan-a-work-graph`). A change that needs another open pull request's change waits for it to merge, or starts from its head and brings in the base once after it merged. It never merges the other branch again and again while both are open.

## [5.0.0] - 2026-11-18

This release changes which pull requests wait for a person. A change to a repository's agent guidance, CI, or pre-commit gate no longer goes to human review: an agent merges it after the merge gate, and asks the user one question when it loosens a rule. Repositories that want a person to review those changes should reserve them in their guidance before upgrading.

### Added

- Batch fan-out leaves into one pull request (`references/fan-out.md#batch-leaves-into-one-pull-request`). When several `review:ai` leaves that change the same files or the same shared hotspot are ready together, the coordinator merges their branches locally into one batch branch with `git merge --no-ff`, resolves their conflicts once before anything is pushed, runs the repository's checks once on the batch's head in a clean checkout, and opens one pull request that closes every leaf. CI runs once for the batch instead of once per leaf, and two leaves that break only together fail before they reach the base branch. A batch holds at most five leaves unless repository guidance sets another limit, never holds a `review:human` leaf or a leaf with a security review, and doesn't wait for a leaf still in progress. A leaf that breaks the batch is fixed on its own branch and merged in again, or taken out and the batch rebuilt without it, as a new pull request once the old one is open rather than a force-push. After the merge, a leaf that alone turns the base red is reverted through its merge commit inside the batch, and its issue is reopened. A batch is not used when the repository allows only squash merges or a linear history. Before, every leaf opened its own pull request, and leaves that change the same files met their conflicts one merge at a time, each resolution followed by another CI run.
- A batch layout for the verification record (`references/pull-requests.md#open`): the checks and the batch merges once for the batch's head, and each leaf's pre-commit review, acceptance check, and acceptance evidence in its own part. Reading the record treats the merge of a leaf's branch into the batch branch like a merge of the base, so only what `git show --remerge-diff` shows needs a review entry. Merge gate condition 3 reads merge commits the same way.

### Changed

- Human review is about understanding the feature (`references/pull-requests.md#classify`). A change to how the repository works, such as its agent guidance, CI workflows, pre-commit review gate, or branch or release settings, is no longer a reason for `review:human`: it goes through the merge gate like any other change. When it loosens a rule that later changes rely on, such as removing or weakening a check, a review, or a merge gate condition, adding a bypass, letting a failing step pass, or widening what CI's token or secrets reach, the agent asks the user whether to accept that as one pending decision that says in plain words what protection goes away and what the change gains. Initialization and issue template update pull requests stay `review:human`, because this skill never merges them itself.
- Comprehension questions in the review interview (`references/pull-requests.md#review-interview`) ask about the feature: what a user can now do, what a user sees or what happens in a situation the issue is about, and what the feature deliberately leaves out. They no longer ask why a high-risk change makes its technical choice, because the security review and the merge gate settle that and a reviewer who can't follow it shouldn't be asked to judge it. They are asked whenever the pull request adds or changes what a user can do or see, and a technical choice that leaves what a user sees and does unchanged is no longer a point for the reviewer.

## [4.1.0] - 2026-11-16

### Added

- Leaf agents ask the coordinator (`references/fan-out.md#answer-the-agents-questions`). In a fan-out, a leaf agent asks the coordinating agent whatever its issue, the brief, and the repository don't answer, instead of guessing or stopping, and the coordinator answers it itself rather than handing it to a separate advisor agent, because it holds the run's context: what other leaves changed or decided, which shared files they touch, and what the user already decided. The coordinator takes only what the user alone can decide to the user, doesn't design the leaf for the agent, writes every answer that changes the work into the issue as an implementation note, and adds a question asked twice to the brief. On a host where an agent can't message the coordinator while it runs, the agent commits a checkpoint, stops with the question in its report, and is resumed after the answer. Before, a leaf agent could only stop or list open decisions for the user at the end of its work.

### Changed

- The agent report's `Open decisions` field is now `Questions`, for every question still open; the coordinator decides which ones go to the user (`references/fan-out.md#agent-report`).

## [4.0.0] - 2026-11-15

This release adds a condition to the merge gate. Open pull requests without an acceptance check in their verification record go back to the author's side for one before they can merge.

### Added

- An acceptance check before every pull request opens (`references/pull-requests.md#acceptance-check`). A fresh agent that didn't write the change, on a smaller and faster model than the implementing agent's, reads the diff at the head commit against each acceptance criterion of the closing issues and reports each one as met, not met, or unclear, whether its evidence exercises it, and any change the issue doesn't ask for or excludes. It gets the issues, the diff, and the claimed evidence, not the implementing agent's reasoning. It doesn't rerun checks, judge code quality, or attack the change, so it is cheap enough for every change, not only risky ones. Its result is the verification record's new acceptance check entry. Before, only the implementing agent itself, or a fan-out coordinator reading the diff, compared the change with its criteria, and only risky leaves got an independent agent.
- A fan-out coordinator has the acceptance check run on every leaf, instead of comparing each diff with its criteria itself (`references/fan-out.md#review-before-anything-goes-out`).

### Changed

- Merge gate condition 5 requires an acceptance check on record that covers every criterion (`references/pull-requests.md#merge-gate`). A pull request without one goes back to the author's side, like a missing pre-commit or security review, and the check doesn't run at the gate.

## [3.0.0] - 2026-11-12

This release stops code review at the pull request. Repositories without a pre-commit review gate should install one, or review commits locally and record the result, before upgrading, because their pull requests otherwise fail the merge gate.

### Changed

- Pull requests no longer get a code review (`references/pull-requests.md`). Teams that use this skill review code locally under their own AI controls, so reviewing a pull request now checks only that its content meets what the skill requires, such as its verification record, label, CI, acceptance evidence, and closing issues, and never reads the diff to judge the code. A commit without a pre-commit review entry, or a high-risk change without a security review entry, fails the gate and goes back to the author's side to be reviewed locally and recorded. Before, the merging agent reviewed such commits or ran the security review at the gate. Preparing a review interview no longer reviews code either. A pull request from a fork needs a person with write access to review its commits locally.
- Human review of an interface change opens the screen for the reviewer (`references/pull-requests.md#human-review`). The agent runs the pull request's head, in a local development server, a preview deployment, or on a device or emulator, and opens each affected screen in the states the change is about before the reviewer confirms it. A reviewer on GitHub gets a preview link or the steps to reach each screen in the pull request body. Screenshots and recordings go alongside the screen but don't replace it, and an interface isn't approved until the reviewer has seen it. The approval record names the screens opened and where. Before, screenshots or a preview link were enough.

## [2.0.0] - 2026-11-11

This release changes when an agent may merge a pull request and what goes to human review, so repositories that rely on the old merge gate should read the Changed entries before upgrading.

### Added

- A verify-once rule (`SKILL.md#verify-once`). Each check, review, and audit is recorded with the commit it covers, and whoever comes next reads that record, checks it against GitHub and git, and does only what it doesn't cover: the commits after the recorded one, an area the record leaves out, or a check nobody recorded. An entry counts only when someone with write access wrote it, so it isn't reused from a fork or from a passer-by's comment on a public repository, nor when what the agent observes contradicts it, or when the user, a human reviewer, or repository guidance asks for an independent check. A high-risk change, or a rule that routes such work to a stronger model or a dedicated reviewer agent, is not a reason to repeat recorded work. Before, the skill treated every report as a claim to check and never said how, so a colleague's agent that reviewed a pull request ran the security review again although the pull request already recorded one.
- A verification record on every pull request (`references/pull-requests.md#verification-record`), with a body layout for it: the checks, each commit's pre-commit review outcome, any security review with its scope and findings, and the acceptance evidence, each with the commit it covers. The side that can read how the commits were made, the author's agent or a fan-out coordinator, writes the pre-commit review entry, so a merging agent in another session no longer needs the author's transcript. A record in any older form counts, and one that names no commit covers the commits made before it was written.
- A human review decision in first-use initialization (`references/initialization.md#decisions-to-confirm`), and a planning step that keeps interface changes in leaves of their own (`SKILL.md#plan-a-work-graph`), so that only those pull requests wait for a person.

### Changed

- Fewer pull requests go to human review (`references/pull-requests.md#classify`). `review:ai` is the default, and `review:human` is for a change to what a user sees or how they interact with it, a change to how the repository works, such as its agent guidance, CI, or pre-commit gate, a change repository guidance reserves for a person, and a pull request from a fork. A person still confirms every interface change, because how an interface looks and feels is a matter of taste: an approved design, a screenshot, or a passing test shows that the result matches a specification, not that it is good. The reviewer is shown the result, and the agent checks the rest of the merge gate before merging, so the person judges only what they can see. A frontend change with no visible effect stays `review:ai`. A `review:human` pull request now also passes the rest of the merge gate before an agent merges it. An open decision, an unmet acceptance criterion, a failed check, a high-risk change, and doubt no longer send a pull request to human review: the agent asks the user the one question as a pending decision, or fixes the failure. "When in doubt, choose `review:human`" is removed.
- The merge gate reads the verification record first (`references/pull-requests.md#merge-gate`). A command that CI ran on the head commit and passed is not run again in a clean checkout. The agent runs only the commands CI didn't run, or all of them when the pull request changes how the checks run. A commit counts as reviewed when the record's pre-commit review entry names it. A high-risk change needs one security review in the record, and one runs at the gate when none does. A command counts only when the CI step that runs it succeeded and can't be masked. A merge of the base is checked with `git show --remerge-diff`. A commit that nothing covers, such as one from a repository without a pre-commit review gate, one a rebase rewrote, or one that skipped the gate, is reviewed at the gate instead of failing it. After a failed condition, the agent checks again only what the fix could change, not the whole gate, and a failed condition no longer relabels the pull request `review:human`.
- A fan-out coordinator checks a leaf agent's report against the agent's transcript and writes what it confirmed into the pull request's verification record, instead of running the checks again in a clean checkout before the push (`references/fan-out.md#review-before-anything-goes-out`). The agent report gains the commit each check ran on and the open decisions only the user can answer. The independent verifier's result is recorded as the pull request's security review.
- Preparing a review interview uses the verification record as it stands and doesn't run checks, the pre-commit review, or a security review again (`references/pull-requests.md#review-interview`). The briefing reports the recorded security review.
- `SKILL.md` is reorganized: a contents list, named rules, one section for the loop's stages, and operations in the order work moves through them (create, update, start, plan a work graph, split, fan out, blockers, notes, pull requests, complete). Claiming an issue and the overbuilding check now sit under `Start work`. The bootstrap steps live only in the MCP reference. `references/pull-requests.md` is retitled `Pull requests` and ordered as verification record, open, classify, merge gate, human review, review interview, merge, after the merge.
- The issue examples in the MCP reference use the cold-start sections, and the reference says how to find which commands CI ran.

## [1.13.0] - 2026-11-07

### Added

- A post-merge check of the base branch's CI on the merge commit (`references/pull-requests.md#after-the-merge`). It catches two pull requests that each passed alone but break the base together. The agent doesn't hold the next merge while it runs, but once it fails, merging stops until a fix forward or a revert lands.

### Removed

- The merge gate condition that a pull request's head contain the base branch's tip (`references/pull-requests.md#merge-gate`). With many agents working in parallel, the base moved faster than a pull request could follow, so a pull request that had to catch up before merging caught up, reran CI, and fell behind again without merging. A pull request that doesn't conflict with the base now merges as it is. It brings in the base, still with a merge rather than a rebase, only when it conflicts at its turn to merge or a reviewer asks. The post-merge check that the merge commit's tree equals the head's tree assumed the head contained the base, so it is replaced by a check that the merge commit changed the same files as the pull request.

## [1.12.0] - 2026-11-07

### Changed

- Comprehension questions in the review interview (`references/pull-requests.md#review-interview`) ask why the pull request makes its high-risk choice: what problem it solves, what would go wrong with an alternative the agent explained, or what it gives up in return. They no longer ask how the system behaves in a rare or extreme situation the change wasn't made for, or about implementation details, because remembering an edge case doesn't show that the reviewer can judge the change. Each wrong option is a reason that sounds sensible but isn't the pull request's, such as the goal of a rejected alternative. Every review question uses the plain words the agent taught with and brings in no new term.
- The project quiz (`skills/project-quiz`) asks mostly why: why a choice was made, what problem a rule prevents, or what would go wrong with the alternative the discussion rejected. It doesn't ask how the system behaves in a rare or extreme situation unless handling that situation is why the pull request exists, uses plain words, and asks again about a missed idea in other words or with a different everyday situation.

## [1.11.0] - 2026-11-05

### Added

- A shared-hotspot check when planning a work graph (`SKILL.md#shared-hotspots`). Before creating the leaves, the agent looks for places that many changes extend at the same spot, such as central route or permission lists, an API document's path list, or a changelog section, using the leaves' scopes and the files the base branch's recent commits change most often. Leaves that add an entry or two to a hotspot stay parallel. When the hotspot's structure makes most leaves conflict, the agent proposes restructuring it as its own issue and makes the conflicting leaves wait for it when it can land first. It never splits or reorganizes a hotspot inside a feature leaf, because moving content conflicts with every open pull request that touches the file.

### Changed

- A pull request brings in the base branch only at its turn to merge (`references/pull-requests.md#merge`), not each time the base moves while it waits for review or CI, even when the two now conflict. At merge time the agent merges the base in once, lets CI run on the new head, runs the gate again or asks for approval of the new head, and merges right away. In a busy repository, catching up while waiting added a commit and a CI run for every move of the base and could conflict again before the merge. Leaf agents in a fan-out bring in the base only when the coordinator asks. Merging rather than rebasing is unchanged.

## [1.10.0] - 2026-11-04

### Added

- An overbuilding check when work starts (`SKILL.md#check-the-issue-for-overbuilding`). Right after claiming an issue, the agent compares its scope and acceptance criteria with its `Why` and looks for items that don't serve the goal, build generality nobody asked for, already exist in the repository, or require more verification than the repository's guidance asks for. When nothing matches, it continues silently. Otherwise it asks the user once, with every item and a recommendation to drop it, move it to a follow-up issue, or keep it, and records the answer in the issue as a dated descoping decision. In a fan-out, the coordinator checks each leaf before handing it out and asks about all of them together, and a leaf agent reports overbuilding it finds as a descoping proposal instead of dropping criteria itself. During the work, the agent builds only what the acceptance criteria need.

## [1.9.0] - 2026-10-31

### Added

- A project quiz skill (`skills/project-quiz`) that runs only when the user invokes it, such as `/github-loop-engineering:project-quiz`. It reads the repository's merged pull requests, their closing issues, and their review discussions through the GitHub MCP Server, skips routine changes such as dependency bumps and release chores, and picks the ones that explain design decisions, non-obvious rules, reverts, conventions, and breaking changes. It then asks multiple-choice questions about understanding rather than trivia, one at a time, and after every answer explains why with a link to the pull request or issue, asking again later about anything missed. It checks each fact against later changes, leaves people out of the questions, and writes nothing to GitHub.

## [1.8.0] - 2026-10-31

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

[Unreleased]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v6.2.0...HEAD
[6.2.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v6.1.0...github-loop-engineering--v6.2.0
[6.1.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v6.0.0...github-loop-engineering--v6.1.0
[6.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v5.1.0...github-loop-engineering--v6.0.0
[5.1.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v5.0.0...github-loop-engineering--v5.1.0
[5.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v4.1.0...github-loop-engineering--v5.0.0
[4.1.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v4.0.0...github-loop-engineering--v4.1.0
[4.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v3.0.0...github-loop-engineering--v4.0.0
[3.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v2.0.0...github-loop-engineering--v3.0.0
[2.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.13.0...github-loop-engineering--v2.0.0
[1.13.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.12.0...github-loop-engineering--v1.13.0
[1.12.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.11.0...github-loop-engineering--v1.12.0
[1.11.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.10.0...github-loop-engineering--v1.11.0
[1.10.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.9.0...github-loop-engineering--v1.10.0
[1.9.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.8.0...github-loop-engineering--v1.9.0
[1.8.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.7.0...github-loop-engineering--v1.8.0
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
