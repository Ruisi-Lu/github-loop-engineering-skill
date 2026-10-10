---
name: github-loop-engineering-skill
description: Run an evidence-gated Loop Engineering control loop for GitHub Issues and GitHub Projects through the official GitHub MCP Server, keeping every issue cold-startable for a new collaborator or a fresh agent session. Use when an agent needs to discover work state; create, triage, prioritize, assign, split, block, start, finish, close, or verify work items; plan a parent issue's sub-issues and dependencies so agents can work in parallel, or fan out a parent's ready work to parallel agents; update project fields; maintain acceptance criteria and implementation notes; persist handoff state; initialize labels and a project board on first use; install or update issue templates; or route the next bounded task without using gh CLI or cached GraphQL IDs.
---

# GitHub Loop Engineering

Use GitHub Issues and Projects as the durable control plane and memory for Loop Engineering. Move each work item through one bounded, evidence-gated pass using only the GitHub MCP tools exposed by the host.

The issue is the unit of handoff. Every issue must stay cold-startable: someone with no prior context, including a fresh agent session, can read it and act on it without asking anyone or reading chat history.

A parent issue is the unit of parallel work. Its sub-issues and the blocked-by dependencies between them form a work graph. Any agent can take the parent, find the children that can start now, and run them in parallel, each starting cold from its own issue.

## Read the references

- Read [references/github-mcp-tools.md](references/github-mcp-tools.md) before the first GitHub MCP operation in a session and whenever a required capability or payload is unclear.
- Read [references/work-item-format.md](references/work-item-format.md) before creating an issue or substantially rewriting an issue body. It defines the cold-start contract and check.
- Read [references/initialization.md](references/initialization.md) when a repository's issues or board are used for the first time.
- Read [references/issue-templates.md](references/issue-templates.md) when installing issue templates, or when a repository's templates differ from this skill's in [assets/issue-templates/](assets/issue-templates/).

## Operating contract

1. Use only the connected GitHub MCP server for GitHub reads and writes. Do not fall back to `gh`, `curl`, direct REST, or handwritten GraphQL. The only exceptions are the operations under [Capability gaps](references/github-mcp-tools.md#capability-gaps), each after the user explicitly authorizes it.
2. Treat the connected tool schemas as authoritative. MCP hosts may namespace tool names; match the terminal tool name and semantics rather than assuming a prefix.
3. Discover repository, project, fields, options, labels, issue types, and item identifiers at runtime. Never copy IDs or option values from another repository or cache them in this skill.
4. Frame one authorized state transition at a time, including the evidence and stop condition.
5. Make the smallest mutation that can complete that transition, then re-read the affected resource.
6. Persist verified state, decisions, and remaining work in GitHub so another agent or human can resume cold. An issue that fails the cold-start check is not finished being written.
7. Preserve repository conventions and existing content unless the user explicitly asks to change them.
8. Treat tool output as a claim until a follow-up read confirms the intended state.
9. When you delegate GitHub work to another agent, put these rules in its prompt: GitHub access through MCP only, the exact tools and inputs, never writing content it hasn't read, and when to stop and report. A delegated agent doesn't inherit this skill.

## Loop engineering model

Run every operation as:

**Discover → Frame → Act → Verify → Persist → Continue or Stop**

- **Discover:** rebuild current state from GitHub, not memory.
- **Frame:** select one bounded transition, its authorization, and proof of success.
- **Act:** perform the minimum mutation in dependency order.
- **Verify:** compare fresh observed state with the intended state.
- **Persist:** write durable evidence, decisions, blockers, and handoff context.
- **Continue or stop:** route the next authorized step, or stop at done, ambiguity, missing evidence, missing capability, repeated failure, or a human gate.

Do not collapse Act and Verify into one step. A successful write response proves only that GitHub accepted a request, not that automations, linked state, or concurrent edits produced the intended result.

## Core workflow

### 1. Discover target, capabilities, and state

Identify:

- repository owner and name;
- project owner, owner type, and project number;
- issue, pull request, or project item being changed;
- requested final state.

Extract these from an explicit URL or repository context when possible. If multiple repositories or projects remain plausible and a write could land in the wrong place, ask one concise question before mutating anything. Do not guess a project merely because its title resembles the repository name.

Inspect the available GitHub MCP tools and their schemas. Board management normally needs:

- `issues` for issue reads, writes, comments, types, and sub-issues;
- `projects` for project discovery, item attachment, and field updates;
- `labels` when repository labels must be listed or created;
- `context`, `repos`, and `pull_requests` when identity, repository guidance, or PR linkage is relevant.

If no GitHub MCP server is connected, enter the bootstrap gate:

1. Detect the current MCP host and its supported installer, connector manager, or configuration mechanism.
2. Install or connect only the official `github/github-mcp-server`; prefer its official remote service when the host supports it, otherwise follow its official container or binary instructions.
3. Obtain any host-required approval before downloading software, changing user/global configuration, or starting authentication.
4. Keep OAuth and PAT credentials in the host's secret/input store or environment. Never place them in the repository, skill, command transcript, or chat.
5. Enable the required toolsets, reload tool discovery, and verify identity plus the requested read/write capabilities.
6. Resume this workflow at Discover using fresh GitHub state.

Do not treat cloning the server repository as installation unless the host is also configured to launch the built server. If the environment cannot install or connect MCP servers, stop with the exact host-specific action or authentication step the user must complete.

The official server's default toolsets omit `projects` and `labels`. If a required write tool is absent, the server is read-only, or authorization is insufficient, stop before the mutation and report the missing toolset or permission. Do not bypass the boundary with another API client. The fallbacks under [Capability gaps](references/github-mcp-tools.md#capability-gaps) cover only operations the server doesn't offer at all.

Before the first write:

1. Read repository guidance and issue templates when available. When guidance says the templates come from this skill, compare them as described in [Keep issue templates current](#keep-issue-templates-current).
2. List matching projects and verify the selected project's title and number.
3. List project fields and their current options.
4. List existing repository labels.
5. List issue types and custom issue fields only when the repository supports them or the request needs them.
6. Read the current issue, its labels, relevant comments, hierarchy, and project item when updating existing work.

Paginate until uniqueness is established. Prefer human-readable project field names and option names when the current schema supports name-based resolution.

#### First-use gate

If this Discover pass shows that the repository's issues or the board have never been set up for this workflow, as defined in [references/initialization.md](references/initialization.md), stop the original transition. Propose initialization, and run it only after the user authorizes it. Resume the original request from a fresh Discover pass once initialization is verified or explicitly declined. If the user declines, work with the vocabulary that exists and don't invent labels or statuses.

### 2. Frame the next bounded transition

Define:

- current observed state;
- one requested or policy-authorized next state;
- exact issue and Project mutations needed;
- evidence that will prove success;
- conditions that require stopping or human input.

Use explicit repository instructions over the defaults below. When no policy exists:

- Represent actionable work as a real issue, not a draft project card.
- Use the repository's established language and terminology.
- Write the issue body to the cold-start contract in the work-item format reference: why, what, current state, acceptance criteria, and pointers, with absolute dates and no session-only references.
- Use project fields as the source of truth for board state.
- Triage by best judgment, as described under [Status](#status) and [Priority](#priority).
- Add a duplicate priority label only when the repository already requires field-and-label synchronization.
- Reuse existing labels. Create or rename labels only when the user requests it, standing repository policy clearly authorizes it, or an authorized initialization adds them.
- Leave assignees empty on creation unless the user names someone. Decide assignment when work starts.
- Use issue types only when supported; do not emulate them with new labels unless repository policy says to.
- Treat agent-discovered follow-up work as a proposal. Create it only when the user requested discovery-and-creation or the repository has a standing intake policy.

### 3. Act once

Perform related mutations in dependency order. Change only the fields, labels, body sections, relationships, or state required for the framed transition. Keep mutations idempotent when the API supports stable issue locators or read-before-write merging.

### 4. Verify from fresh state

Re-read the affected issue, hierarchy, PR, or project item after each mutation. Request every field needed for comparison. Verify both sides when one operation can trigger automation elsewhere, such as closing an issue and moving a Project status.

Whenever the transition created an issue, changed its body, or changed its Status, run the cold-start check on the body as read back from GitHub. A failed check means the transition is not yet verified.

If an operation partially succeeds, rebuild the involved state and recover only the missing transition. Retry only with new evidence or a changed strategy; do not repeat an unchanged failing call indefinitely.

### 5. Persist and route

Keep the issue body as the durable current-state snapshot. Put chronological decisions, validation, gotchas, and partial progress in comments. Keep Project fields synchronized with verified lifecycle state.

Report the final issue URL or number, Project, fields changed, evidence, and observed result. Route only an authorized next step. Otherwise stop with a precise handoff describing the state, blocker, and condition for the next loop.

## Work-item rules

### Status

Map workflow intent to an existing project option; never assume exact option names:

- unreviewed intake → `Triage`, `Inbox`, or equivalent;
- accepted but not started, including work that waits on other issues → `Todo`, `Ready`, or equivalent;
- active work → `In Progress`, `Doing`, or equivalent;
- work stopped by something outside the work graph → `Blocked` or equivalent;
- completed work → `Done`, `Complete`, or equivalent.

If no unambiguous option exists, leave the field unchanged and ask for the intended mapping.

Agents triage by best judgment: accepted work moves to the accepted option, and rejected work is closed as not planned. Leave triage to humans when repository guidance or the project's own Status descriptions reserve it, as boards initialized with earlier versions of this skill do.

Waiting on another issue is not a blocked status. Record the prerequisite as a native blocked-by dependency and keep the item in the accepted option. GitHub marks the item blocked until every prerequisite closes, so the Project filter `-is:blocked` separates work that can start now from work that waits. Use the blocked option only for blockers outside the work graph, such as a pending decision, missing hardware or access, or another team.

A parent issue moves to the active option when its first child starts, and closes through its own completion ritual once every child is closed.

Project automations can change state on their own, so check the documented workflows before acting:

- An **Auto-close issue** workflow closes the issue as soon as Status becomes the completed option. Never set the completed option before the completion ritual. Close the issue and let the automation move Status, then verify.
- When an issue is reopened and no reopen workflow is documented as enabled, move Status back to the correct option explicitly.

### Priority

Use the project's existing priority scheme. Infer meaning only from documented option names or repository guidance. Do not invent `P0`, `P1`, or `P2`, and do not create a Priority field as part of an ordinary issue update. The baseline scheme in the initialization reference applies only after the user authorizes initialization.

Set Priority when you create an issue, by best judgment against those meanings, unless repository guidance reserves it for humans. When the current focus follows milestones, raise the next milestone's issues when it becomes current.

When the repository mirrors priority in labels, read the full current label set, remove only the superseded priority label, add the new one, and preserve every unrelated label. An organization can also define an issue field named Priority. It is separate from the Project's field, so set it only when repository guidance chose it as the mirror.

### Acceptance criteria

Write observable, testable checkbox items. Include commands, user-visible behavior, or concrete artifacts where appropriate. Mark an item complete only when evidence supports it. Do not close an issue with incomplete criteria unless the user deliberately descopes them and the issue records that decision.

### Dates and notes

Use absolute ISO dates (`YYYY-MM-DD`) for blockers, decisions, and completion notes. Put durable current-state information in the issue body and chronological implementation notes in comments.

## Common operations

### Create and add an issue

1. Search for likely duplicates.
2. Read labels, optional issue types, repository templates, and the work-item format reference.
3. Create the issue with a complete cold-startable body and only known labels, milestone, and type. Add assignees only when the user names them.
4. Add it to the selected project.
5. Set requested project fields one at a time by current field and option name.
6. Read back both the issue and project item, including all fields just changed, and run the cold-start check on the returned body.

If the project auto-add workflow already attached the issue, treat an already-present response as success and continue with field updates.

### Update, start, or reprioritize work

1. Read the issue and current project item.
2. Preserve the body and all unrelated labels.
3. Update the relevant issue metadata or body.
4. Update only the requested project fields.
5. Verify issue and board agree.

Starting work normally means setting the existing active-status option, updating the body's current state, and adding an implementation note only when it provides durable context.

#### Assignment when work starts

Don't assign anyone when an issue is created. Decide assignment at the start transition:

1. Read the current assignees.
2. If the authenticated user is already assigned, keep the assignment.
3. If nobody is assigned, ask the user whether to assign themselves. Skip the question only when the request or repository policy already decides it. Resolve the login with `get_me`, because MCP assignee lists don't accept `@me`.
4. If someone else is assigned, don't reassign or add anyone. Report the current assignee and ask how to proceed.
5. Send the complete intended assignee set, then re-read it.

When one authorized transition sets the same field value on several items, such as moving a set of accepted children to the ready option, use the batch project update if the connected schema exposes it. Then verify every item. A batch can partially succeed.

### Split into sub-issues

Use sub-issues when parts can be independently assigned, sequenced, or accepted. Keep small implementation steps as acceptance-criteria checkboxes.

When the parts can run in parallel, plan them as a work graph that agents can execute:

- Make the parent a container. Its body states the goal and the done criteria and lists the children; nobody implements the parent directly. Nest another level only when the grouping helps someone take a slice of the work.
- Size each leaf for one agent pass that ends in one reviewable change, with its own acceptance criteria. A leaf must be startable from its own body, as the [work-item format](references/work-item-format.md#parent-issue) requires.
- When the parent's done criteria need end-to-end proof, add a final exit child that proves them, for example with an automated test. It depends on the leaves it covers.
- Add blocked-by dependencies only between leaves, and only for real prerequisites: a leaf can't start, or can't be accepted, without another leaf's result. Keep the graph acyclic. Prefer many independent leaves and a short longest chain to a long sequence of small steps.
- List each leaf's parent and prerequisites in `Pointers`.

Then create the issues:

1. Create each child as a complete, cold-startable ordinary issue that names its parent in `Pointers`. When the connected schema supports it, pass the parent on creation so creation and attachment happen in one call.
2. Otherwise, obtain the child's numeric issue ID from the create/read response and attach it with `sub_issue_write`.
3. Add each child to the project and initialize its fields.
4. Add the dependencies as described in [Mark or clear a blocker](#mark-or-clear-a-blocker).
5. Re-read the parent's sub-issues, each child project item, and the dependencies.

When bodies must reference issues that don't exist yet, create the issues one at a time in a fixed order. Check each returned number against the number the bodies assume, and stop at the first mismatch.

Do not confuse issue number, database ID, node ID, and project item ID.

### Fan out from a parent issue

Use this when you are asked to work through a parent issue and the host can run agents in parallel. Without parallel agents, work through the same ready set one leaf at a time.

1. Read the parent, its sub-issues at every level, and their project items.
2. Find the ready set: open leaves in the accepted status that nothing blocks. A Project query returns it for each container, for example `parent-issue:owner/repo#40 status:Todo -is:blocked` with the project's own option names. Order the set by Priority.
3. Claim each leaf before handing it out: move it to the active option and re-read it. Skip a leaf that someone else already started. Move the parent to the active option with its first leaf. Settle [assignment](#assignment-when-work-starts) once for the whole fan-out instead of asking for each leaf.
4. Give each claimed leaf to its own agent in an isolated workspace, such as a git worktree. The prompt names the repository and the issue number, tells the agent to run this skill's loop on that issue only, and repeats the rules it doesn't inherit: GitHub access through MCP only, the repository's guidance, and when to stop and report.
5. When an agent reports back, verify its leaf on GitHub, not from the report. Then rerun the ready-set query, because a closed leaf can unblock others, and hand out what became ready.
6. Stop when every child is closed, the same leaf fails twice, or a step needs a human. Close the parent through its completion ritual, or leave a handoff comment on the parent that lists each child's state.

### Mark or clear a blocker

A wait on another issue and a blocker outside the work graph are recorded differently.

**Prerequisite issue.** Add a native blocked-by dependency from the waiting issue to its prerequisite, list the prerequisite in `Pointers`, and leave Status unchanged. The Project's `is:blocked` filter reflects the dependency, and GitHub clears it when the prerequisite closes. Use an MCP dependency write tool when the connected schema exposes one. The official server doesn't yet, so follow [Capability gaps](references/github-mcp-tools.md#capability-gaps): with the user's authorization, use its fallback; without it, keep the prerequisite in `Pointers` and report that the native dependency relation was not changed. Never fabricate a tool or leave the task looking fully linked when it is not.

**External blocker.** When marking blocked:

1. Record the blocker, the date, and the exact unblock condition in the managed `Blocked by` section.
2. Add an existing blocked label if repository policy uses one.
3. Move the project item to the existing blocked-status option if available.
4. Verify all supported representations.

When unblocking, remove only the resolved blocker entry and blocked label, restore the appropriate workflow status, add the resolution date, and verify no other blocker remains.

### Add implementation notes and links

Use `add_issue_comment` for decisions, gotchas, partial progress, validation results, and commit references. Keep comments concise and append-only.

For PRs, use an auto-closing keyword such as `Closes owner/repo#N` only when merge should close the issue. Otherwise use a non-closing issue reference. Re-read the issue or PR after changing linkage-sensitive text.

### Complete and close

1. Re-read the issue, acceptance criteria, project fields, sub-issues, linked closing PRs, and relevant comments.
2. Confirm every acceptance criterion with evidence. Record any explicit descoping. A linked PR is a pointer to evidence, not evidence itself.
3. Update the issue body's durable state so it reads as the final, cold-startable record, then run the cold-start check.
4. Add a completion comment containing outcome, PR/commit links, validation, and authorized follow-ups.
5. Close the issue with the appropriate state reason.
6. Re-read the project item. If an automation did not move it to the completed option, update that field and verify again.
7. Check what the completion unblocks. Native dependencies need no update: GitHub stops treating a dependent as blocked once its last prerequisite closes. When you are fanning out, rerun the ready-set query. Update external blocker entries that pointed at this work only when authorized.

Do not rely on an assumed project automation. Closing an issue and setting a project status are distinct until a read proves otherwise.

### Change many items

Large runs, such as creating a work graph or retriaging a board, meet limits that single transitions don't:

- GitHub's secondary rate limits allow about 80 content-creating requests per minute and 500 per hour for each user, counting the web UI and both APIs. Count every issue create or update, comment, label change, project field update, and dependency write. Include what earlier runs spent in the past hour, and pace the run to stay under both limits.
- Use `update_project_items` when one field value applies to many items.
- Split long runs into chunks. Delegate each chunk with the exact tool inputs and one write per message, and have it report what it changed and any anomaly. When a write carries content the agent must read first, such as a prepared issue body, require the read and the write in separate messages. An agent that sends both at once writes text it hasn't seen.
- Verify with compact reads, such as `list_issues` with only the fields you compare, and with Project filters such as `no:priority`. An empty filter result proves nothing until a filter that must match returns items, so run that control first.
- Audit the writes, not only the end state. Compare every write's inputs with the intended values, using the host's record of delegated tool calls when it keeps one. A wrong write that a later write corrected still leaves a revision in the issue's edit history and a cross-reference on every issue it mentioned, and a read-back of the final state shows neither. Report any such write and what it left behind.

### Initialize issues and board

Run this only through the first-use gate, and only after the user authorizes it. Follow [references/initialization.md](references/initialization.md):

1. Diff the repository and Project against the baseline profile. Build the plan in three lists: changes MCP will apply, UI steps for the user, and items left unchanged.
2. Confirm the open decisions: language, Project, area labels, priority mirror, blank issues, and triage authority.
3. Create only the missing labels and views, plus the Project if the user asked for one.
4. Propose the chosen issue templates from [assets/issue-templates/](assets/issue-templates/), together with the recorded conventions, in a pull request. Never push to the default branch, and never merge.
5. Hand off the manual steps. Status options, the Priority field, workflows, the Project-repository link, and issue types all need the GitHub UI.
6. Verify every readable result, record user-confirmed items as confirmed rather than verified, and resume the original request from Discover.

### Keep issue templates current

This skill's issue templates are the source of truth for every repository that installed them. Follow [references/issue-templates.md](references/issue-templates.md): when the repository's templates differ from this skill's, finish the current transition, then propose the update in its own pull request. Never push to the default branch, and never merge.

## Failure handling

- On a missing field or option, refresh project fields once. Do not create, rename, or rewrite project configuration during an ordinary work-item operation. Configuration changes belong to an authorized initialization.
- On an authorization error, report the resource and required read/write capability without exposing credentials.
- On an ambiguous or stale item ID, locate the item again by repository and issue number.
- On pagination, continue with returned cursors before concluding that an item, label, field, or project is absent.
- On partial failure, report confirmed completed steps and the exact remaining mutation.
- On a repeated unchanged failure, stop and persist the attempted action, error, and required new evidence or authority.
- On a secondary rate limit, stop writing, wait at least as long as the response asks, and resume from a fresh read of the items still pending.
- On concurrent edits, re-read and merge intentionally; never overwrite newer user content with an older snapshot.
