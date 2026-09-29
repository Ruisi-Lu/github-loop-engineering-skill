# Work-item format

Every issue must be cold-startable. A collaborator who has never seen the work, or a fresh agent session with no chat history, must be able to read the issue and act on it without asking anyone. The issue is the unit of handoff in this loop, so an issue that fails this test is not done being written.

Follow repository issue templates and language conventions first. Use this format only when the repository has no stronger one. It matches the templates in [`../assets/issue-templates/`](../assets/issue-templates/). When an agent creates an issue through the API, templates are not applied, so the agent writes these sections itself in the repository's language.

## Cold-start contract

- **The title is the handle; the body carries the context.** Write the title as one recognizable work name in the repository's naming style. Never leave the body empty.
- **Every required section is present.** If a section truly does not apply, write `N/A` rather than omitting it, so a reader can tell that nothing is missing.
- **Self-contained.** No references that only make sense inside a session or someone's head, such as "the bug from before" or "as discussed". Name the file, the issue, the commit, or the decision.
- **Absolute dates.** Write `2026-07-17`, never "today" or "last week".
- **Pointers are clickable.** Give file paths, issue and PR references, commit SHAs, docs, and exact commands.
- **The body is a current-state snapshot.** Whenever Status changes, update `State` and the acceptance criteria to match the facts. Put the chronology in comments, not in the body.

## Cold-start check

Run this check before creating an issue, after each substantial body update, at each Status change, and before closing. Read the body back from GitHub, not from the text you sent.

1. Could someone with no context state the goal, the boundary, and the current state from the body alone?
2. Are `Why`, `What`, `State`, `Acceptance criteria`, and `Pointers` all present, with content or an explicit `N/A`?
3. Is every date absolute, and is every reference resolvable without chat history?
4. Can each acceptance criterion be verified by a command, an observable behavior, or an artifact?
5. Does `State` reflect the latest verified status, not the state when the issue was created?

If any answer is no, fix the body before continuing the transition.

## Issue body

```markdown
## Why

The problem or goal and why it matters, in one or two sentences.

## What

### In scope

- Concrete change

### Out of scope

- Explicit boundary

## State

Current progress with absolute dates. For a new issue: `Not started.`

## Acceptance criteria

- [ ] Observable behavior or artifact
- [ ] Exact validation command and expected result

## Pointers

- Files: path/to/file
- PRs and commits: owner/repo#123, abc1234
- Docs: docs/...
- Commands: `command`
```

A bug adds a `Reproduction` section after `Why`, with minimal steps, the expected and actual behavior, and the environment. Its acceptance criteria include a regression check that fails before the fix and passes after it.

In a `zh-TW` repository, use the headings from the `zh-TW` templates: `背景 (Why)`, `重現 (Reproduction)`, `範圍 (What)` with `包含` and `不包含`, `現狀 (State)`, `驗收條件 (Acceptance Criteria)`, and `指標 (Pointers)`.

Make acceptance criteria independently verifiable. Avoid vague items such as "works correctly", "tests pass", or "handle edge cases" unless they name the expected behavior or test.

## Managed blocker section

When blocked, add or update this section without rewriting unrelated body content:

```markdown
## Blocked by

- Blocker: owner/repo#123 or a precise external cause
- Since: YYYY-MM-DD
- Unblock condition: concrete event or evidence
```

When unblocked, remove resolved blockers, preserve unresolved ones, and record the resolution in a comment. Remove the entire section only when no blocker remains.

## Implementation note

Put chronological notes in comments:

```markdown
**Implementation note (YYYY-MM-DD):** Decision, discovery, or progress. Evidence: PR/commit/path/test. Remaining: concrete next step.
```

Add a note for a durable decision, non-obvious gotcha, partial handoff, validation result, or commit/PR reference. Do not add routine narration. A note must be as cold-startable as the body.

## Completion comment

```markdown
**Completed (YYYY-MM-DD)**

- Outcome: what changed
- Changes: PR, commit, or artifact links
- Validation: commands and observed results
- Scope changes: none, or an explicit descoping decision
- Follow-ups: issue links, proposals, or none
```

Do not mark acceptance criteria complete merely because the implementation exists. Record the evidence that proves each criterion.
