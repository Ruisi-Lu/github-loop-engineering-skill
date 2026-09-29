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

The official server's default toolsets are `context`, `issues`, `pull_requests`, `repos`, and `users`. They omit `projects` and `labels`, so board operations fail until those toolsets are requested explicitly. Enable the relevant toolsets for the workflow:

| Toolset | Use |
|:--|:--|
| `context` | Resolve the authenticated GitHub identity |
| `repos` | Read repository instructions and templates |
| `issues` | Read/write issues, comments, types, and sub-issues |
| `labels` | List or maintain repository labels |
| `projects` | Discover Projects, add items, and update fields |
| `pull_requests` | Read or update PR linkage and completion context |

Project reads require project-read access; project writes require project-write access. Issue and repository operations require access to the target repository. A server configured in read-only mode will not expose write tools even when a write toolset is requested.

If a needed tool is absent, tell the user which toolset or write capability is missing. Stay MCP-only.

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
| Read one project resource | `projects_get` | `get_project`, `get_project_field`, or `get_project_item` |
| Add/update/delete project item | `projects_write` | `add_project_item`, `update_project_item`, or `delete_project_item` |
| Set one field on many items | `projects_write` | `update_project_items`, up to 50 items per call |
| Read a PR | `pull_request_read` | `get`, `get_comments`, `get_files`, or related method |
| Update a PR | `update_pull_request` | PR number and changed fields |

Pagination parameter names differ by tool. Issue and project list tools currently use `perPage`, and project lists return a cursor for `after`. Follow the connected schema instead of these examples.

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

Each entry uses exactly one locator form. The server documents option-name resolution for single-item updates, so if a batch rejects an option name, use the option ID from a fresh `list_project_fields` read. A batch can partially succeed. Read back every item before you report the batch done.

### Verify project values

Call `projects_list` with `method: "list_project_items"` and request the relevant `field_names`, for example `["Status", "Priority"]`. Without `field_names` or `fields`, the server can return only titles.

Paginate and match the content by repository plus issue number. If the add/update response returned an item ID, `projects_get` with `get_project_item` can verify that exact item.

### Preserve labels during issue updates

1. Read labels with `issue_read` and `method: "get_labels"`.
2. Compute the complete desired label set.
3. Call `issue_write` with `method: "update"` and that set.
4. Re-read labels.

Treat `labels` on an update as replacement-capable. Never send only the new label unless the current schema explicitly guarantees additive behavior.

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

## Capability gaps

Use a native issue-dependency mutation only if a dedicated dependency write tool appears in the connected schema. Do not route around a missing MCP capability with direct HTTP, CLI, or GraphQL. Record the blocker in the issue body/comment and available project fields or labels, then disclose that the native relation remains unchanged.

Similarly, do not assume the MCP server can create arbitrary project fields, configure project workflows, or edit draft cards. Scope setup requests to tools actually exposed by the connected server.
