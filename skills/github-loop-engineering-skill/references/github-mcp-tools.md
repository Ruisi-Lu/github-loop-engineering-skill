# GitHub MCP tool map

Use this reference with the official [GitHub MCP Server](https://github.com/github/github-mcp-server). Tool names and schemas can evolve, and MCP hosts can add a namespace prefix. Inspect the connected schema before calling a tool; the live schema wins over these examples.

## Contents

- [Bootstrap when the server is absent](#bootstrap-when-the-server-is-absent)
- [Required toolsets and access](#required-toolsets-and-access)
- [Canonical operations](#canonical-operations)
- [Payload patterns](#payload-patterns)
- [Capability gaps](#capability-gaps)

## Bootstrap when the server is absent

Let the agent install or connect the dependency when the host permits it:

1. Identify the MCP host before editing configuration; formats and install surfaces differ.
2. Use only the official `github/github-mcp-server` distribution.
3. Prefer the official remote server when supported. Otherwise use the project's official container or binary setup for the detected host.
4. Request host-required approval before downloads, global/user configuration changes, or interactive authentication.
5. Put credentials in the host's protected input/secret store or environment. Never persist a token in the repository or skill.
6. Enable the toolsets below, reload the host's tool discovery, and inspect the resulting schemas.
7. Verify `get_me`, an issue read, a Project read, and every write tool required by the original request.
8. Resume the original task from a fresh Discover pass.

A source clone alone is not a configured MCP dependency. The host must connect to the remote endpoint or launch the local server. If the agent cannot perform that host-level step, return the smallest exact action the user must complete and stop without substituting another GitHub client.

Select toolsets with the mechanism of the chosen distribution:

| Distribution | Toolsets | Read-only switch |
|:--|:--|:--|
| Remote server (`https://api.githubcopilot.com/mcp/`) | `X-MCP-Toolsets` header with a comma-separated list | `X-MCP-Readonly` header |
| Local container or binary | `--toolsets` flag or `GITHUB_TOOLSETS` environment variable | `--read-only` flag or `GITHUB_READ_ONLY` |

The official server's configuration guide is authoritative when these mechanisms change.

## Required toolsets and access

The official server's default toolsets are `context`, `issues`, `pull_requests`, `repos`, and `users`. They omit `projects`, `labels`, and `actions`, so board operations and reads of workflow runs fail until those toolsets are requested explicitly. Enable the relevant toolsets for the workflow:

| Toolset | Use |
|:--|:--|
| `context` | Resolve the authenticated GitHub identity |
| `repos` | Read repository instructions and templates |
| `issues` | Read/write issues, comments, types, and sub-issues |
| `labels` | List or maintain repository labels |
| `projects` | Discover Projects, add items, and update fields |
| `pull_requests` | Read, review, and merge pull requests, and update their linkage |
| `actions` | Read workflow runs, jobs, and job logs when the token can't read check runs. Use it only to read: the loop doesn't trigger or rerun workflows |

Project reads require project-read access; project writes require project-write access. Issue and repository operations require access to the target repository. A server configured in read-only mode will not expose write tools even when a write toolset is requested.

If a needed tool is absent, tell the user which toolset or write capability is missing. Stay MCP-only, apart from the authorized fallbacks under [Capability gaps](#capability-gaps).

## Canonical operations

| Goal | Tool | Method or important input |
|:--|:--|:--|
| Identify current user | `get_me` | no input |
| Read an issue | `issue_read` | `get`; also returns hierarchy flags and `closed_by_pull_requests` |
| Read comments | `issue_read` | `get_comments` |
| Read hierarchy | `issue_read` | `get_sub_issues` or `get_parent` |
| Read issue labels | `issue_read` | `get_labels` |
| Create/update/close issue | `issue_write` | `create` or `update` |
| Create a child under a parent | `issue_write` | `create` with `parent_issue_number` |
| Set custom issue fields | `issue_write` | `issue_fields`, validated against `list_issue_fields` |
| Add a timeline note | `add_issue_comment` | body and issue number |
| Search for duplicates | `search_issues` | GitHub issue search query |
| List issue types | `list_issue_types` | owner and optional repo |
| List custom issue fields | `list_issue_fields` | owner and optional repo |
| Attach/reorder a sub-issue | `sub_issue_write` | `add`, `remove`, or `reprioritize` |
| List labels | `list_label` | owner and repo |
| Create/update/delete label | `label_write` | explicit `method` |
| Find Projects | `projects_list` | `list_projects` |
| List project fields | `projects_list` | `list_project_fields` |
| List project items | `projects_list` | `list_project_items` |
| Find work that can start now | `projects_list` | `list_project_items` with a `query` such as `status:Todo -is:blocked` |
| Find a parent's ready children | `projects_list` | `list_project_items` with `parent-issue:owner/repo#N` in the `query` |
| Read many issues compactly | `list_issues` | `fields`, for example `["number", "labels"]` |
| Read one project resource | `projects_get` | `get_project`, `get_project_field`, or `get_project_item` |
| Add/update/delete project item | `projects_write` | `add_project_item`, `update_project_item`, or `delete_project_item` |
| Set one field on many items | `projects_write` | `update_project_items`, up to 50 items per call |
| Create a project view | `projects_write` | `create_project_view` with `name`, `layout`, and `visible_field_names` |
| Read a PR | `pull_request_read` | `get`, `get_comments`, `get_files`, or related method |
| Update a PR | `update_pull_request` | PR number and changed fields |
| Read a PR's labels | `pull_request_read` | `get`; `issue_read` can't resolve a PR number |
| Label a PR | `issue_write` | `update` with the PR number and the complete label set |
| Read a PR's CI results | `pull_request_read` | `get_check_runs` and `get_status` |
| Read a workflow's runs | `actions_list` | `list_workflow_runs` with the workflow file as `resource_id`; match each run's head SHA |
| Read a run's jobs | `actions_list` | `list_workflow_jobs` with the run ID as `resource_id` |
| Read failed jobs' logs | `get_job_logs` | `run_id` with `failed_only` |
| Read a PR's commits | `pull_request_read` | `get_commits` |
| Read a PR's reviews | `pull_request_read` | `get_reviews` |
| Request reviewers | `create_pull_request` or `update_pull_request` | `reviewers` |
| Merge a PR | `merge_pull_request` | `merge_method` and `expectedHeadSha` |
| Read repository files, such as issue templates | `get_file_contents` | owner, repo, and `path` |
| Propose file changes | `create_branch`, `push_files`, `create_pull_request` | a new branch, one commit, and a PR against the default branch |

Pagination parameter names differ by tool. Issue and project list tools currently use `perPage`, and project lists return a cursor for `after`. Follow the connected schema instead of these examples.

Some reads can return more than a host accepts in one result: `get_files` and `get_diff` on a large pull request, `get_sub_issues` on a parent with many children, because it returns full bodies, and `get_file_contents` on a large file. Use a smaller `perPage`, read only the fields you compare, such as `list_project_items` with `field_names` and a `parent-issue:` query, or read the diff from a local fetch of the pull request's head.

Use `projects_write` with `create_project` only when the user explicitly requests a new project. An empty project may still need field and workflow configuration that the MCP server cannot fully create. Use project views, iteration fields, and `create_project_status_update` only when the user or repository policy asks for them. They are project configuration or reporting, not ordinary work-item transitions.

## Payload patterns

The examples omit any host-specific namespace.

### Discover projects and fields

```json
{
  "method": "list_projects",
  "owner": "octo-org",
  "owner_type": "org",
  "perPage": 50
}
```

After selecting a project by verified title and number:

```json
{
  "method": "list_project_fields",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "perPage": 50
}
```

Retain the returned field types and option names for the current operation only. Refresh them when an update fails because a field or option cannot be resolved.

### Create an issue

Call `issue_write`:

```json
{
  "method": "create",
  "owner": "octo-org",
  "repo": "widgets",
  "title": "Make upload retries observable",
  "body": "## Outcome\n...\n\n## Acceptance criteria\n- [ ] ...",
  "labels": ["area:api", "type:enhancement"],
  "assignees": ["octocat"],
  "type": "Task"
}
```

Include only fields confirmed to exist. Omit `type`, labels, or assignees when unsupported or unspecified. Search for duplicates before creation.

### Add an issue to a project

Call `projects_write`:

```json
{
  "method": "add_project_item",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "item_type": "issue",
  "item_owner": "octo-org",
  "item_repo": "widgets",
  "issue_number": 42
}
```

An auto-add workflow can race this call. If the issue is already present, locate the existing item and continue rather than creating a duplicate.

### Update a project field

Prefer name-based resolution when the live schema accepts it. Call `projects_write` once per field:

```json
{
  "method": "update_project_item",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "item_owner": "octo-org",
  "item_repo": "widgets",
  "issue_number": 42,
  "updated_field": {
    "name": "Status",
    "value": "In Progress"
  }
}
```

This issue locator avoids carrying a stale project item ID. If the connected schema requires IDs instead, obtain them from fresh project reads and use the exact returned value.

Set a supported field value to `null` only when the user requests clearing it.

### Update one field on many items

When the same field and value apply to several items, use one `update_project_items` call per batch of at most 50 items instead of looping over `update_project_item`:

```json
{
  "method": "update_project_items",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "items": [
    { "item_owner": "octo-org", "item_repo": "widgets", "issue_number": 42 },
    { "item_owner": "octo-org", "item_repo": "widgets", "issue_number": 43 }
  ],
  "updated_field": {
    "name": "Status",
    "value": "Todo"
  }
}
```

Each entry uses exactly one locator form. Option names have resolved in batches too, but the server documents them only for single-item updates. If a batch rejects an option name, use the option ID from a fresh `list_project_fields` read. A batch can partially succeed. Read back every item before you report the batch done.

### Verify project values

Call `projects_list` with `method: "list_project_items"` and request the relevant `field_names`, for example `["Status", "Priority"]`. Without `field_names` or `fields`, the server can return only titles.

Paginate and match the content by repository plus issue number. If the add/update response returned an item ID, `projects_get` with `get_project_item` can verify that exact item.

To check many items at once, filter instead of listing everything. For example, `no:priority` must return nothing after every item got a Priority. First run a query that must match, such as `no:assignee` on unassigned work, so a filter that matches nothing because of a typo can't pass as proof.

### Find work that can start now

The Project filter `is:blocked` matches items with an open blocked-by dependency, so `-is:blocked` keeps only items whose prerequisites are all closed. `parent-issue:` limits the query to one parent's sub-issues:

```json
{
  "method": "list_project_items",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "query": "parent-issue:octo-org/widgets#40 status:Todo -is:blocked",
  "field_names": ["Status", "Priority"],
  "perPage": 50
}
```

Use the project's own option names in `status:`. `parent-issue:` matches direct sub-issues, so query each container in a deeper hierarchy. Order the result by Priority.

### Preserve labels during issue updates

1. Read labels with `issue_read` and `method: "get_labels"`.
2. Compute the complete desired label set.
3. Call `issue_write` with `method: "update"` and that set.
4. Re-read labels.

Treat `labels` on an update as replacement-capable. Never send only the new label unless the current schema explicitly guarantees additive behavior.

### Set assignees when work starts

`assignees` takes GitHub logins. It doesn't accept the `@me` shorthand, so resolve the authenticated login with `get_me` first. Like `labels`, treat `assignees` on an update as replacement-capable: read the current assignees with `issue_read` `get`, send the complete intended set, and re-read.

```json
{
  "method": "update",
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 42,
  "assignees": ["octocat"]
}
```

### Create a missing label during initialization

Call `label_write` once per missing label, after listing all labels to confirm it is absent:

```json
{
  "method": "create",
  "owner": "octo-org",
  "repo": "widgets",
  "name": "tech-debt",
  "color": "D93F0B",
  "description": "Refactoring, cleanup, or missing tests"
}
```

The color has no `#` prefix. Use `method: "update"` on an existing label only with explicit approval.

### Add a project view during initialization

```json
{
  "method": "create_project_view",
  "owner": "octo-org",
  "owner_type": "org",
  "project_number": 7,
  "name": "Board",
  "layout": "board",
  "visible_field_names": ["Title", "Assignees", "Status", "Priority", "Linked pull requests", "Sub-issues progress"]
}
```

`visible_field_names` is honored on creation for table and board layouts. Roadmap views accept only `[]`.

### Propose issue templates in a pull request

Check `.github/ISSUE_TEMPLATE` with `get_file_contents` first. Then create a branch from the default branch with `create_branch`, push the template files and any guidance update in one commit with `push_files`, and open a PR with `create_pull_request`:

```json
{
  "owner": "octo-org",
  "repo": "widgets",
  "branch": "chore/issue-templates",
  "message": "chore(github): add cold-start issue templates",
  "files": [
    { "path": ".github/ISSUE_TEMPLATE/feature.md", "content": "..." },
    { "path": ".github/ISSUE_TEMPLATE/bug.md", "content": "..." },
    { "path": ".github/ISSUE_TEMPLATE/task.md", "content": "..." },
    { "path": ".github/ISSUE_TEMPLATE/config.yml", "content": "blank_issues_enabled: false\n" }
  ]
}
```

Follow the repository's commit and branch conventions. Never push to the default branch. Label the PR `review:human` and leave the merge to a human. Templates apply only after they reach the default branch.

### Create and attach a sub-issue

If the connected `issue_write` schema exposes `parent_issue_number`, create the child and attach it in one call:

```json
{
  "method": "create",
  "owner": "octo-org",
  "repo": "widgets",
  "title": "Emit retry metrics",
  "body": "## Outcome\n...",
  "parent_issue_number": 40
}
```

Add `parent_owner` and `parent_repo` together only when the parent is in a different repository. The schema doesn't let `parent_issue_number` be combined with `issue_fields`. When both are needed, create the child with its fields first, then attach it as below.

To attach an existing issue, use the child's numeric issue `id` from the create or `issue_read` response:

```json
{
  "method": "add",
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 40,
  "sub_issue_id": 123456789
}
```

Here `issue_number` identifies the parent and `sub_issue_id` is the child's numeric database ID, not its issue number or GraphQL node ID. Use `replace_parent: true` only when intentionally moving a child from another parent.

With either path, confirm the relationship with `issue_read` `get_sub_issues` on the parent or `get_parent` on the child.

### Update and close an issue

Call `issue_write` with the full intended body when changing checkboxes:

```json
{
  "method": "update",
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 42,
  "body": "...preserved body with evidence-backed checkbox changes..."
}
```

Close only after the completion ritual:

```json
{
  "method": "update",
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 42,
  "state": "closed",
  "state_reason": "completed"
}
```

Re-read both issue state and project status. Do not assume one automatically changed the other.

To close a duplicate, use `state_reason: "duplicate"` with `duplicate_of` set to the canonical issue number. Use `not_planned` only for an explicit decision not to do the work.

`issue_read` `get` returns `closed_by_pull_requests`. Use it as linkage evidence when a completion depends on a PR, not as proof that the PR was merged or validated.

### Add an implementation or completion note

Call `add_issue_comment`:

```json
{
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 42,
  "body": "**Implementation note (2026-07-17):** Chose bounded exponential backoff because ... Validation: `make test`. Remaining: ..."
}
```

Use an absolute date and include links or commit SHAs when available.

### Label a pull request

A pull request is also an issue, so `issue_write` sets its labels. `create_pull_request` takes no labels, and `issue_read` can't resolve a PR number, so read the current labels with `pull_request_read` `get` first. Then send the complete set:

```json
{
  "method": "update",
  "owner": "octo-org",
  "repo": "widgets",
  "issue_number": 128,
  "labels": ["area:api", "review:ai"]
}
```

To move a PR to the other lane, drop the old review label and keep every unrelated label. Re-read the PR's labels afterwards.

### Read CI results

Read the head commit's check runs and commit statuses with `pull_request_read`:

```json
{
  "method": "get_check_runs",
  "owner": "octo-org",
  "repo": "widgets",
  "pullNumber": 128
}
```

A token without access to checks gets `403 Resource not accessible by personal access token`, which has been seen with fine-grained personal access tokens. Then read GitHub Actions results through the `actions` toolset, if the server exposes it and the token can read Actions:

1. `actions_list` with `method: "list_workflow_runs"` and the workflow file as `resource_id` lists that workflow's runs. Keep the runs whose head SHA is the PR's head commit and whose event is `pull_request`. The connected schema says which filters `workflow_runs_filter` accepts.
2. `actions_list` with `method: "list_workflow_jobs"` and a run ID as `resource_id` lists the run's jobs and their conclusions.
3. `get_job_logs` with `run_id` and `failed_only: true` returns the logs of the failed jobs, for whoever fixes them.

Count a job as passed only when it finished with success or its own conditions skipped it. Don't infer CI from the PR's `mergeable_state`. GitHub computes it in the background, it also reflects reviews and branch rules, and it doesn't name a failing check.

### Merge a pull request

Merge a `review:ai` PR only after the merge gate in the [pull request reference](pull-requests.md#merge-gate) passes, and a `review:human` PR only after a human approved its head commit for merging, as described in [Human review](pull-requests.md#human-review). Fresh `pull_request_read` reads must show the same head SHA, no change requests, and green CI, and a fresh fetch must show that the head still contains the base branch's tip. Pass that SHA:

```json
{
  "owner": "octo-org",
  "repo": "widgets",
  "pullNumber": 128,
  "merge_method": "squash",
  "expectedHeadSha": "6dcb09b5b57875f334f61aebed695e2e4193db5e",
  "commit_title": "feat(api): make upload retries observable (#128)"
}
```

Use `merge` instead of `squash` for a PR that integrates several issues. If the head moved after the gate, the call fails, and the gate runs again on the new head. Re-read the PR to confirm that it merged.

## Capability gaps

The official server can't yet write native issue dependencies or create milestones. Prefer an MCP tool for either as soon as the connected schema exposes one.

Some tokens also can't read check runs through the server, as described in [Read CI results](#read-ci-results). Prefer the `actions` toolset or a token with access to checks.

Each of these gaps has one fallback through the GitHub CLI's authenticated API client. Use it only after the user explicitly authorizes that operation for the repository, and record a standing authorization in repository guidance so later sessions don't ask again. Nothing else goes through the CLI:

| Operation | Request |
|:--|:--|
| List an issue's prerequisites | `gh api repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by` |
| Add a prerequisite | `gh api -X POST repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by -F issue_id={id}` |
| Remove a prerequisite | `gh api -X DELETE repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by/{id}` |
| Create a milestone | `gh api -X POST repos/{owner}/{repo}/milestones -f title={title} -f description={description}` |
| Read a commit's check runs, only when the token can't read them through the server | `gh api repos/{owner}/{repo}/commits/{sha}/check-runs` |

`{number}` is the waiting issue's number. `{id}` is the prerequisite's numeric database ID from `issue_read`, not its issue number. `{sha}` is the PR's head commit. Each write counts against the secondary rate limits. Read the list back after writing.

Without authorization, record the prerequisite in the waiting issue's `Pointers` and disclose that the native relation remains unchanged. A CI result that neither the server nor an authorized read can provide fails the merge gate's CI condition. Do not route any other operation through direct HTTP, a CLI, or GraphQL.

Similarly, do not assume the MCP server can create arbitrary project fields, configure project workflows, or edit draft cards. Scope setup requests to tools actually exposed by the connected server. The current surface can't add single-select fields or options, configure or read project workflows, link a Project to a repository, or manage issue types and issue fields. During initialization, hand those steps to the user as exact UI instructions.
