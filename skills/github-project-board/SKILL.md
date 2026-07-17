---
name: github-project-board
description: Manage GitHub Issues and GitHub Projects through the official GitHub MCP Server. Use when an agent needs to create, triage, prioritize, assign, split, block, start, finish, close, or verify work items; update project fields such as Status, Priority, iteration, or dates; maintain acceptance criteria and implementation notes; or link issue work to pull requests without using gh CLI or cached GraphQL IDs.
---

# GitHub Project Board

Keep actionable work in GitHub Issues and synchronize it with an existing GitHub Project using only the GitHub MCP tools exposed by the host.

## Read the references

- Read [references/github-mcp-tools.md](references/github-mcp-tools.md) before the first GitHub MCP operation in a session and whenever a required capability or payload is unclear.
- Read [references/work-item-format.md](references/work-item-format.md) before creating an issue or substantially rewriting an issue body.

## Operating contract

1. Use only the connected GitHub MCP server for GitHub reads and writes. Do not fall back to `gh`, `curl`, direct REST, or handwritten GraphQL.
2. Treat the connected tool schemas as authoritative. MCP hosts may namespace tool names; match the terminal tool name and semantics rather than assuming a prefix.
3. Discover repository, project, fields, options, labels, issue types, and item identifiers at runtime. Never copy IDs or option values from another repository or cache them in this skill.
4. Read before writing, make the smallest mutation that satisfies the request, and re-read the affected resource afterward.
5. Preserve repository conventions and existing content unless the user explicitly asks to change them.
6. Do not claim that a mutation succeeded until a follow-up read confirms the intended state.

## Core workflow

### 1. Resolve the target

Identify:

- repository owner and name;
- project owner, owner type, and project number;
- issue, pull request, or project item being changed;
- requested final state.

Extract these from an explicit URL or repository context when possible. If multiple repositories or projects remain plausible and a write could land in the wrong place, ask one concise question before mutating anything. Do not guess a project merely because its title resembles the repository name.

### 2. Check capabilities

Inspect the available GitHub MCP tools and their schemas. Board management normally needs:

- `issues` for issue reads, writes, comments, types, and sub-issues;
- `projects` for project discovery, item attachment, and field updates;
- `labels` when repository labels must be listed or created;
- `context`, `repos`, and `pull_requests` when identity, repository guidance, or PR linkage is relevant.

The official server's default toolsets may omit `projects`. If a required write tool is absent, the server is read-only, or authorization is insufficient, stop before the mutation and report the missing toolset or permission. Do not bypass the boundary with another API client.

### 3. Discover live conventions

Before the first write:

1. Read repository guidance and issue templates when available.
2. List matching projects and verify the selected project's title and number.
3. List project fields and their current options.
4. List existing repository labels.
5. List issue types only when the repository supports them or a type is requested.
6. Read the current issue, its labels, relevant comments, hierarchy, and project item when updating existing work.

Paginate until uniqueness is established. Prefer human-readable project field names and option names when the current schema supports name-based resolution.

### 4. Apply repository policy

Use explicit repository instructions over the defaults below. When no policy exists:

- Represent actionable work as a real issue, not a draft project card.
- Use the repository's established language and terminology.
- Keep the issue body cold-start readable: outcome, context, scope, acceptance criteria, validation, and dependencies.
- Use project fields as the source of truth for board state.
- Add a duplicate priority label only when the repository already requires field-and-label synchronization.
- Reuse existing labels. Create or rename labels only when the user requests it or standing repository policy clearly authorizes it.
- Use issue types only when supported; do not emulate them with new labels unless repository policy says to.
- Treat agent-discovered follow-up work as a proposal. Create it only when the user requested discovery-and-creation or the repository has a standing intake policy.

### 5. Execute and verify

Perform related mutations in dependency order. After each mutation, read back the affected issue or project item. If an operation partially succeeds, re-read all involved resources and resume from the confirmed state rather than replaying the entire sequence.

Report the final issue URL or number, project, fields changed, and verification result.

## Work-item rules

### Status

Map workflow intent to an existing project option; never assume exact option names:

- unreviewed intake → `Triage`, `Inbox`, or equivalent;
- accepted but not started → `Todo`, `Ready`, or equivalent;
- active work → `In Progress`, `Doing`, or equivalent;
- blocked work → `Blocked` or equivalent;
- completed work → `Done`, `Complete`, or equivalent.

If no unambiguous option exists, leave the field unchanged and ask for the intended mapping. Do not promote agent-discovered work out of an intake state without explicit authorization or repository policy.

### Priority

Use the project's existing priority scheme. Infer meaning only from documented option names or repository guidance. Do not invent `P0`, `P1`, or `P2`, and do not create a Priority field as part of an ordinary issue update.

When the repository mirrors priority in labels, read the full current label set, remove only the superseded priority label, add the new one, and preserve every unrelated label.

### Acceptance criteria

Write observable, testable checkbox items. Include commands, user-visible behavior, or concrete artifacts where appropriate. Mark an item complete only when evidence supports it. Do not close an issue with incomplete criteria unless the user deliberately descopes them and the issue records that decision.

### Dates and notes

Use absolute ISO dates (`YYYY-MM-DD`) for blockers, decisions, and completion notes. Put durable current-state information in the issue body and chronological implementation notes in comments.

## Common operations

### Create and add an issue

1. Search for likely duplicates.
2. Read labels, optional issue types, and the work-item format reference.
3. Create the issue with a complete body and only known labels, assignees, milestone, and type.
4. Add it to the selected project.
5. Set requested project fields one at a time by current field and option name.
6. Read back both the issue and project item, including all fields just changed.

If the project auto-add workflow already attached the issue, treat an already-present response as success and continue with field updates.

### Update, start, or reprioritize work

1. Read the issue and current project item.
2. Preserve the body and all unrelated labels.
3. Update the relevant issue metadata or body.
4. Update only the requested project fields.
5. Verify issue and board agree.

Starting work normally means setting the existing active-status option and adding an implementation note only when it provides durable context. Do not assign the authenticated user unless requested or required by repository policy.

### Split into sub-issues

Use sub-issues when parts can be independently assigned, sequenced, or accepted. Keep small implementation steps as acceptance-criteria checkboxes.

1. Create each child as a complete ordinary issue.
2. Add each child to the project and initialize its fields.
3. Obtain the child's numeric issue ID from the create/read response.
4. Attach it with `sub_issue_write`.
5. Re-read the parent's sub-issues and each child project item.

Do not confuse issue number, database ID, node ID, and project item ID.

### Mark or clear a blocker

When marking blocked:

1. Record the blocker, the date, and the exact unblock condition in the managed `Blocked by` section.
2. Add an existing blocked label if repository policy uses one.
3. Move the project item to the existing blocked-status option if available.
4. Add a native issue dependency only when the connected MCP schema exposes a documented dependency write tool.
5. Verify all supported representations.

The official tool surface may not expose native dependency writes. In that case, keep the linked issue or external cause in the body/comment and report that the native dependency relation was not changed. Never fabricate a tool or leave the task looking fully linked when it is not.

When unblocking, remove only the resolved blocker entry and blocked label, restore the appropriate workflow status, add the resolution date, and verify no other blocker remains.

### Add implementation notes and links

Use `add_issue_comment` for decisions, gotchas, partial progress, validation results, and commit references. Keep comments concise and append-only.

For PRs, use an auto-closing keyword such as `Closes owner/repo#N` only when merge should close the issue. Otherwise use a non-closing issue reference. Re-read the issue or PR after changing linkage-sensitive text.

### Complete and close

1. Re-read the issue, acceptance criteria, project fields, sub-issues, and relevant comments.
2. Confirm every acceptance criterion with evidence. Record any explicit descoping.
3. Update the issue body's durable state.
4. Add a completion comment containing outcome, PR/commit links, validation, and authorized follow-ups.
5. Close the issue with the appropriate state reason.
6. Re-read the project item. If an automation did not move it to the completed option, update that field and verify again.
7. Check whether completion unblocks other known work and update it only when authorized.

Do not rely on an assumed project automation. Closing an issue and setting a project status are distinct until a read proves otherwise.

## Failure handling

- On a missing field or option, refresh project fields once. Do not create, rename, or rewrite project configuration during an ordinary work-item operation.
- On an authorization error, report the resource and required read/write capability without exposing credentials.
- On an ambiguous or stale item ID, locate the item again by repository and issue number.
- On pagination, continue with returned cursors before concluding that an item, label, field, or project is absent.
- On partial failure, report confirmed completed steps and the exact remaining mutation.
- On concurrent edits, re-read and merge intentionally; never overwrite newer user content with an older snapshot.
