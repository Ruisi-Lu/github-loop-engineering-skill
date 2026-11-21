# GitHub CLI reference

Use this reference with the GitHub CLI, `gh`. It was written against gh 2.97.0. Flags and JSON fields change between releases, so when a command or flag here is unclear or rejected, run `gh <command> <subcommand> --help` on the installed version. Its help wins over these examples.

## Contents

- [Set up gh](#set-up-gh)
- [Command boundary](#command-boundary)
- [Conventions](#conventions)
- [Canonical operations](#canonical-operations)
- [Command patterns](#command-patterns)
- [What gh can't do](#what-gh-cant-do)

## Set up gh

Check the client before the first GitHub operation in a session:

```sh
gh --version
gh auth status
```

1. **Version.** gh 2.97.0 or later. Older versions lack flags this skill relies on, such as `--blocked-by`, `--parent`, and `--type` on `gh issue`, `--query` on `gh project item-list`, and `--field` with `--value` on `gh project item-edit`. When gh is missing or older, ask the user to install or upgrade it from the official distribution, through the tool manager the repository or organization prescribes. Get the host's approval before downloading software.
2. **Authentication.** `gh auth status` names the account and the token's scopes. When it reports no login, the user runs `gh auth login` themselves, because it is interactive: in Claude Code, suggest `! gh auth login`. A headless environment can set `GH_TOKEN` instead.
3. **Scopes.** Issue and pull request work needs `repo` for a private repository, or `public_repo` for a public one. Project reads need `read:project`, and project writes need `project`: `gh auth refresh -s project` adds it, and the user runs it, because it opens a browser. A fine-grained personal access token needs the matching repository permissions, Projects permission on the owning organization, and Actions read to read CI.
4. **Smoke test.** Read the authenticated login, one issue, and the selected Project before the first write:

```sh
gh api user --jq .login
gh issue view 1 -R octo-org/widgets --json number,title
gh project view 7 --owner octo-org --format json --jq .title
```

Never print, echo, or pass the token itself. Don't run `gh auth token`, don't write a token into a file, the repository, or chat, and don't put one on a command line. gh keeps its credentials in the system keyring or its own configuration.

If gh can't be installed or authenticated, stop with the exact step the user must complete. Don't substitute `curl` or another client that needs the raw token.

## Command boundary

gh can do far more than this skill needs, including deleting repositories and changing their settings. Use a command only when the framed transition needs it:

| Allowed | Use |
|:--|:--|
| `gh issue`, `gh pr`, `gh label`, `gh project`, `gh search` | The operations in this reference |
| `gh run list`, `gh run view`, `gh pr checks`, `gh workflow view` | Reading CI. The loop never triggers, reruns, or cancels a workflow |
| `gh api` with GET, or with the writes this reference shows | Reads the porcelain commands don't cover, and the writes listed here |
| `gh repo view`, `gh repo clone` | Reading repository metadata, and a checkout for a pull request |

Never run these unless the user asks for exactly that operation: `gh repo delete`, `gh repo edit`, `gh repo archive`, `gh repo rename`, `gh secret`, `gh variable`, `gh ruleset`, `gh release`, `gh workflow run`, `gh workflow enable` or `disable`, `gh run rerun` or `cancel`, `gh issue delete`, `gh issue transfer`, `gh project delete`, `gh project field-delete`, `gh label delete`, `gh label create --force`, `gh label edit` on an existing label, `gh pr merge --admin`, `gh pr merge --auto`, and any `gh api` request with `-X DELETE`, `PUT`, or `PATCH` other than those shown here. A denial by the host's permission system for any gh command is a human gate, as [Failure handling](../SKILL.md#failure-handling) says.

## Conventions

- **Name the repository.** Pass `-R owner/repo` to every `gh issue`, `gh pr`, `gh label`, and `gh run` command unless the working directory is a checkout of that exact repository. A checkout's `origin` can be a fork.
- **Read JSON, not tables.** Pass `--json` with the fields you compare, or `--format json` for `gh project`, and filter with `--jq`. Table output changes between versions and truncates text.
- **Write text from a file.** Write every issue body, pull request body, and comment to a file in a temporary directory and pass it with `--body-file`, or `-F body=@file` for `gh api`. A body passed inline goes through the shell, which expands backticks, `$`, and quotes, and a body full of Markdown code spans is exactly what it mangles. Read what you wrote back from GitHub before you report it.
- **Paginate.** List commands return 30 items by default. Pass `--limit` above the count you expect, and treat a result that returns exactly the limit as possibly cut short: raise the limit and read again. For `gh api` lists, pass `--paginate`, and `--slurp` when you need one JSON array.
- **Identifiers.** gh resolves issues and pull requests by number or URL, labels, milestones, and Projects by name or title, and Project fields and options by name with `--field` and `--value`. Use those, and fetch an ID only when a command needs one, in the same session. An issue's number, its database ID, its node ID, and its Project item ID are four different values.
- **Exit codes.** A non-zero exit means the command failed, except `gh pr checks`, which exits 8 while checks are pending. An error on a write doesn't prove the write didn't happen: read before retrying, as [Failure handling](../SKILL.md#failure-handling) says.

## Canonical operations

| Goal | Command |
|:--|:--|
| Identify the current user | `gh api user --jq .login`, or `@me` where a flag accepts it |
| Read an issue | `gh issue view N --json number,title,body,state,stateReason,labels,assignees,milestone,issueType,parent,subIssues,subIssuesSummary,blockedBy,blocking,projectItems,closedByPullRequestsReferences,updatedAt` |
| Read an issue's comments | `gh issue view N --json comments`, or `gh api repos/{owner}/{repo}/issues/N/comments --paginate` for a long thread |
| Search for duplicates | `gh issue list --search "<words> in:title,body" --state all --json number,title,state --limit 50` |
| Read many issues compactly | `gh issue list --json number,labels,assignees --limit 500` with only the fields you compare |
| Create an issue | `gh issue create --title ... --body-file ... --label ... --type ... --milestone ...` |
| Create a child under a parent | `gh issue create ... --parent N` |
| Attach or detach a sub-issue | `gh issue edit CHILD --parent N`, `gh issue edit CHILD --remove-parent`, or `gh issue edit N --add-sub-issue CHILD` |
| Reorder sub-issues | `gh api -X PATCH repos/{owner}/{repo}/issues/N/sub_issues/priority -F sub_issue_id=<id> -F after_id=<id>` |
| Add or remove a prerequisite | `gh issue edit N --add-blocked-by M` or `--remove-blocked-by M` |
| Update body, title, type, or milestone | `gh issue edit N --body-file ...`, `--title`, `--type`, `--milestone` |
| Add or remove labels | `gh issue edit N --add-label ... --remove-label ...` |
| Assign or unassign | `gh issue edit N --add-assignee @me` or `--remove-assignee login` |
| Add a timeline note | `gh issue comment N --body-file ...` |
| Close an issue | `gh issue close N --reason completed`, `--reason "not planned"`, or `--duplicate-of M` |
| Reopen an issue | `gh issue reopen N` |
| List issue types | `gh api graphql -f query='query($o:String!,$r:String!){repository(owner:$o,name:$r){issueTypes(first:50){nodes{name description}}}}' -f o=OWNER -f r=REPO` |
| Create a milestone | `gh api repos/{owner}/{repo}/milestones -f title=... -f description=...` |
| List labels | `gh label list --json name,color,description --limit 500` |
| Create a missing label | `gh label create NAME --color RRGGBB --description ...` |
| Find Projects | `gh project list --owner OWNER --format json --limit 100` |
| Read a Project | `gh project view N --owner OWNER --format json` |
| List a Project's fields and options | `gh project field-list N --owner OWNER --format json --limit 100` |
| List a Project's items | `gh project item-list N --owner OWNER --format json --limit 500` |
| Find work that can start now | `gh project item-list N --owner OWNER --query "status:Todo -is:blocked" --format json` |
| Find a parent's ready children | `--query "parent-issue:owner/repo#N status:Todo -is:blocked"` |
| Add an issue to a Project | `gh project item-add N --owner OWNER --url <issue URL> --format json` |
| Set a Project field | `gh project item-edit N --owner OWNER --url <issue URL> --field Status --value "In Progress"` |
| Clear a Project field | `gh project item-edit --id <item ID> --project-id <project ID> --field-id <field ID> --clear` |
| Create a Project, only when asked | `gh project create --owner OWNER --title ...` |
| Link a Project to a repository | `gh project link N --owner OWNER --repo REPO` |
| Create a single-select field | `gh project field-create N --owner OWNER --name Priority --data-type SINGLE_SELECT --single-select-options "P0,P1,P2"` |
| Create a Project view | `createProjectV2View` through `gh api graphql`, as in [Add a project view](#add-a-project-view-during-initialization) |
| Read Project workflows | `gh api graphql` on `projectV2.workflows`, as in [Read project workflows](#read-project-workflows) |
| Read a pull request | `gh pr view N --json number,title,body,state,isDraft,isCrossRepository,headRefName,headRefOid,baseRefName,mergeable,labels,latestReviews,reviewDecision,closingIssuesReferences,author` |
| Read a PR's files | `gh pr view N --json files`, or `gh pr diff N --name-only` |
| Read a PR's commits | `gh pr view N --json commits`, or `gh api repos/{owner}/{repo}/pulls/N/commits --paginate` for many |
| Read a PR's comments and reviews | `gh pr view N --json comments,reviews` |
| Read a PR's CI | `gh pr checks N --json name,state,bucket,workflow,event,link` |
| Read a commit's workflow runs | `gh run list --commit SHA --json databaseId,workflowName,event,status,conclusion,headSha --limit 100` |
| Read a run's jobs and steps | `gh run view RUN --json jobs` |
| Read failed jobs' logs | `gh run view RUN --log-failed` |
| Open a PR | `gh pr create --base ... --head ... --title ... --body-file ... --label review:ai` |
| Edit a PR | `gh pr edit N --body-file ...`, `--add-label`, `--remove-label`, `--add-reviewer`, `--add-assignee` |
| Merge a PR | `gh pr merge N --squash --match-head-commit SHA --subject ...`, or `--merge` |
| Read a file at a ref without a checkout | `gh api -H "Accept: application/vnd.github.raw" "repos/{owner}/{repo}/contents/PATH?ref=REF"` |
| Propose file changes | A branch, commits, and `gh pr create` in a checkout, as in [Propose issue templates](#propose-issue-templates-in-a-pull-request) |

Inside a checkout of the target repository, `gh api` fills in `{owner}` and `{repo}` itself. Elsewhere, write the owner and repository out.

Some reads return more than a host accepts in one result, such as the files or the diff of a large pull request, or a parent's sub-issues with full bodies. Request only the fields you compare, filter with `--jq`, use a Project query with `parent-issue:`, or read the diff from a local fetch of the pull request's head.

Create a Project only when the user explicitly asks for one. Use views, fields, and status updates only when the user or repository policy asks for them: they are project configuration or reporting, not ordinary work-item transitions.

## Command patterns

The examples use `octo-org/widgets` and Project 7 of `octo-org`. `$TMP` stands for a temporary directory outside the repository.

### Discover projects and fields

```sh
gh project list --owner octo-org --format json --limit 100 --jq '.projects[] | {number, title, closed}'
gh project field-list 7 --owner octo-org --format json --limit 100
```

`--owner` takes an organization or a user login, or `@me`. The field list includes each single-select field's options. Keep the field and option names for the current operation only, and read them again when an update can't resolve a name.

### Create an issue

```sh
cat > "$TMP/body.md" <<'EOF'
## Why
...

## What
...

## State
Not started.

## Acceptance criteria
- [ ] ...

## Pointers
- ...
EOF
gh issue create -R octo-org/widgets \
  --title "Make upload retries observable" \
  --body-file "$TMP/body.md" \
  --label area:api --type Task
```

The quoted `'EOF'` keeps the shell from expanding anything in the body. Write the body to the [work-item format](work-item-format.md#issue-body). Pass only labels, a milestone, and a type that exist: gh fails on an unknown label or type. Leave out `--assignee` unless the user names someone. Don't use `--project` here: add the issue to the Project as below, so that an auto-add workflow that already attached it is handled. gh prints the new issue's URL. Search for duplicates before creating.

### Add an issue to a project

```sh
gh project item-add 7 --owner octo-org --url https://github.com/octo-org/widgets/issues/42 --format json
```

An auto-add workflow can race this call. Adding an issue that is already on the board returns its existing item, and a failure doesn't prove the issue is absent: list the items before retrying.

### Update a project field

```sh
gh project item-edit 7 --owner octo-org \
  --url https://github.com/octo-org/widgets/issues/42 \
  --field Status --value "In Progress"
```

`--owner` selects the Project's owner, and `--url` the issue, whose owner can differ. For a single-select field, `--value` is the option name. Set one field per call. There is no batch command: when one value applies to many items, run one call per item, pace the run as [Change many items](../SKILL.md#change-many-items) describes, and read every item back.

Clear a field only when the user asks. `--clear` takes IDs: the item ID from `gh project item-list`, the project ID from `gh project view --format json --jq .id`, and the field ID from `gh project field-list`, all read in this session.

### Verify project values

```sh
gh project item-list 7 --owner octo-org --format json --limit 500 \
  --query "repo:octo-org/widgets"
```

Match items by repository and issue number in `content`. The JSON carries each item's field values. Use `--query` to narrow the read, for example `no:priority`, which must return nothing once every item has a Priority. First run a query that must match, such as `no:assignee` on unassigned work, so that a filter that matches nothing because of a typo can't pass as proof.

### Find work that can start now

```sh
gh project item-list 7 --owner octo-org --format json --limit 200 \
  --query "parent-issue:octo-org/widgets#40 status:Todo -is:blocked"
```

`is:blocked` matches items with an open blocked-by dependency, so `-is:blocked` keeps the items whose prerequisites are all closed. `parent-issue:` matches direct sub-issues, so query each container in a deeper hierarchy. Use the Project's own option names in `status:`, and order the result by Priority.

### Labels and assignees

`--add-label`, `--remove-label`, `--add-assignee`, and `--remove-assignee` change only what they name and keep the rest:

```sh
gh issue edit 42 -R octo-org/widgets --add-label priority:P1 --remove-label priority:P2
gh issue edit 42 -R octo-org/widgets --add-assignee @me
gh issue view 42 -R octo-org/widgets --json labels,assignees
```

`@me` resolves to the authenticated user. Re-read after every change, because someone else can claim or relabel the issue at the same time.

### Update an issue body

```sh
gh issue view 42 -R octo-org/widgets --json body,updatedAt > "$TMP/issue.json"
# edit the body from issue.json into $TMP/body.md
gh issue view 42 -R octo-org/widgets --json updatedAt   # unchanged since the read?
gh issue edit 42 -R octo-org/widgets --body-file "$TMP/body.md"
```

`--body-file` replaces the whole body, so start from the body you just read and change only the sections the transition needs. If `updatedAt` moved between the read and the write, read again and merge, so that you never overwrite newer content.

### Create and attach a sub-issue

```sh
gh issue create -R octo-org/widgets --title "Emit retry metrics" --body-file "$TMP/child.md" --parent 40
gh issue edit 57 -R octo-org/widgets --parent 40
gh issue view 40 -R octo-org/widgets --json subIssues,subIssuesSummary
```

`--parent` takes a number or, for a parent in another repository, a URL. Moving a child that already has another parent is a deliberate change: do it only when the plan says so. Confirm the relationship by reading `subIssues` on the parent or `parent` on the child. For a parent with many children, `gh api repos/{owner}/{repo}/issues/40/sub_issues --paginate` lists them all.

### Add a prerequisite

```sh
gh issue edit 57 -R octo-org/widgets --add-blocked-by 55
gh issue view 57 -R octo-org/widgets --json blockedBy
```

Issue 57 waits for issue 55. `--blocked-by` on `gh issue create` sets prerequisites at creation, when they already exist. Each relationship write counts against the secondary rate limits.

### Update and close an issue

```sh
gh issue close 42 -R octo-org/widgets --reason completed
gh issue view 42 -R octo-org/widgets --json state,stateReason,projectItems
```

Close only after the completion ritual, then read both the issue's state and its Project status: one doesn't imply the other. Close a duplicate with `--duplicate-of` and the canonical issue, and use `--reason "not planned"` only for an explicit decision not to do the work.

`closedByPullRequestsReferences` in `gh issue view` lists the pull requests that close the issue. It is linkage evidence, not proof that a pull request merged or was validated.

### Add an implementation or completion note

```sh
gh issue comment 42 -R octo-org/widgets --body-file "$TMP/note.md"
```

For example: `**Implementation note (2026-07-17):** Chose bounded exponential backoff because ... Validation: make test passed. Remaining: ...`. Use an absolute date, and include links or commit SHAs when available.

### Create a missing label during initialization

```sh
gh label list -R octo-org/widgets --json name --limit 500 --jq '.[].name'
gh label create tech-debt -R octo-org/widgets --color D93F0B --description "Refactoring, cleanup, or missing tests"
```

Create a label only after the list shows it is missing. The color has no `#`. Never pass `--force`, which overwrites an existing label's color and description, and change an existing label only with explicit approval.

### Add a project view during initialization

gh has no view command, so use GraphQL. Read the Project's node ID and the IDs of the fields to show, then create the view:

```sh
gh project view 7 --owner octo-org --format json --jq .id
gh project field-list 7 --owner octo-org --format json --jq '.fields[] | {name, id}'
gh api graphql -f query='
  mutation($project: ID!, $name: String!, $fields: [ID!]!) {
    createProjectV2View(input: {
      projectId: $project, name: $name, layout: BOARD_LAYOUT,
      configuration: { visibleFieldIds: $fields }
    }) { projectV2View { name number layout } }
  }' -f project=PVT_... -f name=Board -f 'fields[]=PVTF_...' -f 'fields[]=PVTSSF_...'
```

Use `TABLE_LAYOUT` for a table. A view's filter and its grouping are set in the GitHub UI, so hand those steps to the user, such as the `Ready` view's filter.

### Read project workflows

```sh
gh api graphql -f query='
  query($owner: String!, $number: Int!) {
    organization(login: $owner) { projectV2(number: $number) {
      workflows(first: 20) { nodes { name enabled } }
    } }
  }' -f owner=octo-org -F number=7
```

Use `user(login:)` for a Project a user owns. This reads which workflows exist and whether they are on, not their filters or the status they set. Turning a workflow on or off, and configuring it, happen in the GitHub UI.

### Propose issue templates in a pull request

Work in a checkout of the repository. Clone it with `gh repo clone` into a temporary directory when there is none. Create a branch from the default branch, add the files, and commit through the repository's normal hooks:

```sh
git switch -c chore/issue-templates origin/HEAD
mkdir -p .github/ISSUE_TEMPLATE
# copy the templates and any guidance update
git add .github/ISSUE_TEMPLATE
git commit -m "chore(github): add cold-start issue templates"
git push -u origin chore/issue-templates
gh pr create --base main --head chore/issue-templates \
  --title "chore(github): add cold-start issue templates" \
  --body-file "$TMP/pr.md" --label review:human
```

Use the repository's default branch for `--base`: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` names it. Follow the repository's commit and branch conventions. Never push to the default branch, and never merge this pull request yourself. Templates apply only after they reach the default branch.

### Open and label a pull request

```sh
gh pr create -R octo-org/widgets --base main --head feat/retry-metrics \
  --title "feat(api): make upload retries observable" \
  --body-file "$TMP/pr.md" --label review:ai
gh pr view feat/retry-metrics -R octo-org/widgets --json number,labels,headRefOid
```

`--label` labels the pull request as it opens. To move it to the other lane, swap the label in one call and read it back:

```sh
gh pr edit 128 -R octo-org/widgets --add-label review:human --remove-label review:ai
```

Request reviewers with `--reviewer` on `gh pr create` or `--add-reviewer` on `gh pr edit`.

### Read CI results

```sh
gh pr checks 128 -R octo-org/widgets --json name,state,bucket,workflow,event,link
```

`gh pr checks` lists the head commit's check runs and commit statuses together. `bucket` sorts each into `pass`, `fail`, `pending`, `skipping`, or `cancel`. A check passed only in `pass`, or in `skipping` when its own conditions skipped it. Check that `gh pr view --json headRefOid` still names the head you gate.

When checks can't be read, as with some fine-grained personal access tokens, or when you need the jobs and their steps, read GitHub Actions directly:

```sh
gh run list -R octo-org/widgets --commit 6dcb09b5b57875f334f61aebed695e2e4193db5e \
  --json databaseId,workflowName,event,status,conclusion,headSha --limit 100
gh run view 30433642 -R octo-org/widgets --json jobs
gh run view 30433642 -R octo-org/widgets --log-failed
```

Keep the runs whose head SHA is the commit and whose event is `pull_request`, or `push` for the base branch's CI on a merge commit. `--json jobs` lists each job's conclusion and steps. `--log-failed` prints the logs of the failed steps for whoever fixes them.

Don't infer CI from `mergeStateStatus`. GitHub computes it in the background, it also reflects reviews and branch rules, and it doesn't name a failing check.

The merge gate also needs to know which commands CI ran, so that it runs only the rest itself. Read the workflow file at the head commit, with `git show <sha>:.github/workflows/<file>` in a checkout or the raw contents read with `?ref=<sha>`, and match its steps with the steps the run reports as succeeded. A skipped step didn't run its command, and a step that can't fail, through `continue-on-error` or `|| true`, proves nothing.

### Merge a pull request

Merge a `review:ai` pull request only after the [merge gate](pull-requests.md#merge-gate) passes, and a `review:human` one only after a human approved its head commit, as in [Human review](pull-requests.md#human-review). Fresh reads must show the same head SHA, no merge conflicts, no change requests, and green CI. The head doesn't need the base branch's latest commits.

```sh
gh pr merge 128 -R octo-org/widgets --squash \
  --match-head-commit 6dcb09b5b57875f334f61aebed695e2e4193db5e \
  --subject "feat(api): make upload retries observable (#128)"
gh pr view 128 -R octo-org/widgets --json state,mergedAt,mergeCommit
```

Use `--merge` instead of `--squash` for a pull request that integrates several issues. If the head moved after the gate, the merge fails. Then check the gate again for what the new commits change. Never pass `--admin` or `--auto`: the first bypasses the repository's rules, and the second merges later, after the gate's reads are stale. When the repository uses a merge queue, gh adds the pull request to the queue instead of merging it, so read its state until it merged or left the queue. `mergeCommit` names the merge commit for [After the merge](pull-requests.md#after-the-merge).

## What gh can't do

These need the GitHub UI. Hand them to the user as exact steps during initialization, and record them as confirmed by the user:

- adding, renaming, recoloring, or describing the options of an existing single-select field, such as Status;
- setting a field's option colors and descriptions, which `gh project field-create` doesn't take;
- configuring Project workflows, and a view's filter and grouping;
- creating issue types and organization issue fields, which an organization owner does;
- repository features and settings, such as enabling issues.

Don't route these through GraphQL mutations either. Replacing a single-select field's options through the API can drop the values every item holds, and the UI handles that safely.
