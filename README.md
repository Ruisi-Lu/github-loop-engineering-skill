# GitHub Project Board Skill

An Agent Skill for managing GitHub Issues and GitHub Projects through the official [GitHub MCP Server](https://github.com/github/github-mcp-server).

It turns project-board maintenance into a portable, MCP-only workflow: discover the live project schema, create and triage issues, update fields, split sub-issues, record blockers and implementation notes, and close work with evidence.

## Why this skill

- **MCP-only:** no `gh` CLI, `curl`, direct REST calls, or handwritten GraphQL.
- **Repository-agnostic:** no hard-coded owner, repository, project number, field ID, option ID, label, language, or status vocabulary.
- **Schema-aware:** reads projects, fields, options, labels, and issue types before writing.
- **Safe updates:** preserves existing bodies and labels, handles partial failure idempotently, and verifies every mutation.
- **Honest capability handling:** reports missing toolsets or permissions and does not bypass the connected MCP server.

## Contents

| Path | Purpose |
|:--|:--|
| `skills/github-project-board/SKILL.md` | Core workflow and safety contract |
| `skills/github-project-board/references/github-mcp-tools.md` | Official GitHub MCP tool map and payload patterns |
| `skills/github-project-board/references/work-item-format.md` | Portable issue, blocker, note, and completion formats |
| `skills/github-project-board/agents/openai.yaml` | Skill UI metadata and GitHub MCP dependency |

## Prerequisites

Connect the official GitHub MCP Server to your agent host with access to the target repository and GitHub Project.

Enable at least the `issues` and `projects` toolsets. `context`, `repos`, `labels`, and `pull_requests` are recommended for the full workflow:

```text
context,repos,issues,labels,projects,pull_requests
```

The server's default toolsets can omit `projects`, so board operations require enabling it explicitly. Project writes also require project-write authorization. Follow the official server's [configuration guide](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md) for your MCP host; do not commit access tokens.

## Install

With an Agent Skills-compatible installer after publishing the repository:

```bash
npx skills add <github-owner>/github-project-board-skill
```

Or copy the skill directory into the location used by your agent:

```bash
cp -R skills/github-project-board ~/.codex/skills/
```

For a repository-local Claude Code installation:

```bash
cp -R skills/github-project-board .claude/skills/
```

Restart or reload the agent host if it does not discover newly installed skills automatically.

## Use

Example prompts:

```text
Use $github-project-board to create an issue for the failing upload retries,
add it to our engineering project, and set the existing priority to High.
```

```text
Use $github-project-board to start issue #42, preserve its labels, and verify
that both the issue and project item reflect the new state.
```

```text
Use $github-project-board to close issue #42 only if every acceptance criterion
is supported by evidence, then synchronize the project status.
```

The skill follows repository instructions and existing project vocabulary. When a target or field mapping is genuinely ambiguous, it pauses before writing to the wrong resource.

## Design boundaries

The skill targets the official GitHub MCP Server's documented tool surface. It does not silently switch to a CLI or direct API when an MCP capability is unavailable. Native issue dependencies and arbitrary project configuration are therefore conditional on the tools exposed by the connected server.

## License

MIT — see [LICENSE](LICENSE).
