# First-use initialization

Use this reference when a repository's issues or its Project board are about to be used with this workflow for the first time. Initialization brings labels, issue templates, the Project, and its automations to a known baseline. The ordinary lifecycle rules then have a vocabulary to work with.

The baseline comes from a production setup that has run this workflow. It is a proposal, not a mandate. Repository guidance, existing templates, and an existing board vocabulary always win.

## Contents

- [When to initialize](#when-to-initialize)
- [Authorization gate](#authorization-gate)
- [Decisions to confirm](#decisions-to-confirm)
- [Baseline profile](#baseline-profile)
- [What MCP can apply](#what-mcp-can-apply)
- [Procedure](#procedure)

## When to initialize

Initialize only the part that is missing. Treat issues and the board as separate targets.

**Issues are uninitialized** when all of these hold:

- the repository has no `.github/ISSUE_TEMPLATE/` directory on its default branch;
- its labels are only GitHub's defaults, such as `bug`, `documentation`, `enhancement`, `question`, and `wontfix`;
- no repository guidance, such as an agent instruction file, contributing guide, or policy skill, defines issue conventions.

**The board is uninitialized** when the request needs a Project and either:

- no Project is linked to or documented for the repository; or
- the selected Project lacks an intake status, a blocked status, or a priority field, and no repository guidance defines a different vocabulary.

Never initialize over documented conventions. If guidance exists, follow it even when it differs from the baseline. A repository that deliberately has no board, for example one that tracks work only in issues, is initialized; don't create a Project for it.

## Authorization gate

Initialization changes repository and project configuration, so it is never implied by an ordinary request.

1. Stop the original transition before any write.
2. Present the plan in three lists: changes the agent will apply, steps the user must perform in the GitHub UI, and items that already match or will stay as they are.
3. Ask the [decisions](#decisions-to-confirm) that have no documented answer.
4. Apply only the approved groups. Labels, the templates pull request, a new Project, and views are separately approvable.

If the user declines, record that in the handoff and continue the original request with the vocabulary that already exists. Don't invent labels or statuses to fill the gap.

## Decisions to confirm

1. **Language:** the language for label descriptions, status descriptions, and templates. Default to the repository's established language. The skill ships `en` and `zh-TW` templates.
2. **Project:** reuse an existing Project, identified by its verified title and number, or create a new one under a confirmed owner. Create one only when the user asks.
3. **Area labels:** one `area:<component>` label per top-level component, proposed from the repository layout, for example the directories under `apps/` and `packages/` in a monorepo.
4. **Priority mirror:** mirror the board Priority in `priority:*` labels (baseline), in an organization Priority issue field if one exists, or nowhere. The board field stays the source of truth.
5. **Blank issues:** whether the template chooser should hide blank issues from people without write access (baseline: hide).

## Baseline profile

Write names exactly as shown. Write descriptions in the confirmed language.

### Project Status field

The Status field already exists on a new Project. Its options must match this list, in this order:

| Option | Color | Meaning |
|:--|:--|:--|
| `Triage` | Gray | Created by an agent or not yet reviewed. A human approves it into `Todo` or closes it. Agents never promote out of `Triage` on their own |
| `Todo` | Green | Approved and ready to start |
| `In Progress` | Yellow | Being worked on |
| `Blocked` | Red | Waiting on a dependency. The issue carries the `blocked` label and a `Blocked by` section |
| `Done` | Purple | Completed |

### Project Priority field

A single-select field named `Priority`:

| Option | Color | Meaning |
|:--|:--|:--|
| `P0` | Red | Production incident or blocker. Drop other work and tell the user |
| `P1` | Orange | Current focus |
| `P2` | Gray | Scheduled backlog |

An unset Priority means the item has not been triaged yet.

### Labels

Create only the labels that are missing. Keep GitHub's default labels. Never rename, recolor, or delete an existing label without explicit approval.

| Label | Color | Purpose |
|:--|:--|:--|
| `priority:P0` | `B60205` | Mirror of Priority `P0`, when labels are the chosen mirror |
| `priority:P1` | `FBCA04` | Mirror of Priority `P1` |
| `priority:P2` | `BFDADC` | Mirror of Priority `P2` |
| `blocked` | `B60205` | Blocked by a dependency. The body has a `Blocked by` section and Status is `Blocked` |
| `tech-debt` | `D93F0B` | Refactoring, cleanup, or missing tests |
| `security` | `67060C` | Security issue or hardening |
| `area:ci` | `D5E697` | CI, release, and deployment pipelines |
| `area:<component>` | distinct per label | One per confirmed component. The description names its path |

Every issue gets at least one `area:*` label, or `documentation` for documentation-only work. Each issue carries exactly one `priority:*` label when labels mirror Priority.

### Issue types

Use `Feature` for a new capability, `Bug` for incorrect behavior or a security vulnerability, and `Task` for everything else, such as refactoring, verification, operations, decisions, and documentation. Issue types are organization settings. Check them with `list_issue_types`. If they are missing, an organization owner has to add them. Personal repositories may not support them.

### Project workflows

Configure these in the Project's **Workflows** page:

| Workflow | Baseline | Consequence for agents |
|:--|:--|:--|
| Auto-add to project | On, filtered to the repository's open issues and pull requests | An issue can appear on the board before `add_project_item` runs. Treat "already exists" as success |
| Auto-add sub-issues to project | On | Children join the board with their parent |
| Item added to project | On, sets Status to `Triage` | New items land in intake until a human approves them |
| Item closed | On, sets Status to `Done` | Closing moves the card. Still verify it |
| Pull request linked to issue | On, sets Status to `In Progress` | Linking a PR starts the work on the board |
| Pull request merged | On, sets Status to `Done` | Merging moves the card. Still verify it |
| Auto-close issue | On | Setting Status to `Done` closes the issue. Never set `Done` before the completion ritual |
| Item reopened | Off | After a reopen, move Status back explicitly |

### Views

Keep existing views. Add a view only when no view with that layout exists:

- a board layout grouped by Status;
- a table layout.

Show `Title`, `Assignees`, `Status`, `Priority`, `Linked pull requests`, and `Sub-issues progress`.

### Issue templates

Install the chosen locale from this skill's `assets/issue-templates/<locale>/` into the repository's `.github/ISSUE_TEMPLATE/`. The set has `feature.md`, `bug.md`, `task.md`, and `config.yml`. Keep file names and front matter keys unchanged. Adjust them only in these cases:

- remove each `type:` line if the repository doesn't support issue types;
- set `blank_issues_enabled: true` in `config.yml` if the user chose to keep blank issues.

The templates never assign anyone. Assignment is decided when work starts. They take effect only after they reach the default branch.

### Repository settings

- Issues are enabled.
- The Project is linked to the repository, so the repository's **Projects** tab lists it and auto-add can target it.
- The resulting conventions are recorded in repository guidance: the Project owner, title, and number, the vocabulary above, the language, and the priority mirror. Record names, never IDs.

## What MCP can apply

| Item | How |
|:--|:--|
| Missing labels | `label_write` with `method: "create"` |
| New Project, only when requested | `projects_write` with `method: "create_project"` |
| Views | `projects_write` with `method: "create_project_view"` |
| Issue templates and guidance | A pull request. Use the host's normal branch-and-PR workflow when working in a checkout. Otherwise use `create_branch`, `push_files`, and `create_pull_request`. Never push to the default branch, and never merge |
| Status options and the Priority field | Manual: Project **Settings** → field |
| Workflows | Manual: Project **Workflows** |
| Project ↔ repository link | Manual: repository **Projects** tab → **Link a project** |
| Issue types and issue fields | Manual, by an organization owner |
| Repository features | Manual: repository **Settings** |

Don't route a manual item through another API client. Give the user the exact UI path and wait for confirmation.

## Procedure

1. **Discover:** read labels (paginate), `.github/ISSUE_TEMPLATE/` via `get_file_contents`, repository guidance, the Project list, the selected Project's fields, options, and views, and the available issue types and fields.
2. **Frame:** diff the current state against the baseline. Build the three-list plan and ask the open decisions.
3. **Act:** after approval, create missing labels, create the Project and views if approved, and open the templates-and-guidance pull request.
4. **Hand off:** give the manual checklist with exact UI paths. Wait until the user confirms each step or explicitly skips it.
5. **Verify:** re-read labels, the Project's Status options and Priority field, the views, and the pull request's files. MCP can't read workflows, so record them as confirmed by the user, not as verified.
6. **Persist:** report what changed, what the user confirmed, and what remains, such as a pending template PR. Then resume the original request from Discover.

Re-running initialization on a repository that already matches the baseline changes nothing.
