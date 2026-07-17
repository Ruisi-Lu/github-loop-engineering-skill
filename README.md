# GitHub Loop Engineering Skill

> The GitHub-native control plane for Loop Engineering.

An Agent Skill that turns GitHub Issues and GitHub Projects into durable state, evidence, and handoff for repeatable agent work—all through the official [GitHub MCP Server](https://github.com/github/github-mcp-server).

Loop Engineering is about designing the repeatable system around an agent: what it discovers, which bounded transition it attempts, how the result is verified, what gets persisted, and when the loop continues or stops. This skill applies that discipline to the work lifecycle.

```mermaid
flowchart LR
    D["Discover state"] --> F["Frame transition"]
    F --> A["Act once"]
    A --> V{"Verify evidence"}
    V -->|Pass| P["Persist state"]
    V -->|Fail or partial| R["Recover or stop"]
    R --> D
    P --> N{"Continue?"}
    N -->|Next bounded step| D
    N -->|Done or human gate| S["Stop and hand off"]
```

## The project board as loop memory

GitHub is more than the task list in this loop:

| Loop stage | What the skill does | Durable artifact |
|:--|:--|:--|
| Discover | Read live repository, issue, hierarchy, Project fields, and policy | Current world state |
| Frame | Define one authorized transition and the evidence that would prove it | Acceptance criteria and target state |
| Act | Make the smallest MCP mutation in dependency order | Issue or Project change |
| Verify | Re-read the affected resources instead of trusting the write response | Observed state and validation evidence |
| Persist | Record decisions, blockers, validation, and completion | Body, comments, fields, and links |
| Continue or stop | Route a bounded next step or stop at completion, ambiguity, or a human gate | Follow-up, handoff, or verified done state |

The result is an evidence-gated lifecycle: an agent cannot turn “I changed it” into “Done” without a read-back and proof.

## Why this skill

- **Loop-native:** every mutation is one pass through discover, frame, act, verify, and persist.
- **Evidence-gated:** acceptance criteria and current read-back state control lifecycle transitions.
- **Durable:** GitHub Issues and Projects carry context across agents, sessions, and human handoffs.
- **MCP-only:** no `gh` CLI, `curl`, direct REST calls, or handwritten GraphQL.
- **Host-portable:** ships only standard skill instructions and references, with no vendor-specific agent metadata.
- **Repository-agnostic:** no hard-coded owner, project number, field ID, option ID, label, language, or status vocabulary.
- **Recoverable:** partial failures trigger a fresh read and bounded recovery, never blind replay.
- **Honest about limits:** missing tools, permissions, or authority become explicit stop conditions.

## What it manages

- issue creation, triage, assignment, priority, and status;
- project item attachment and custom field updates;
- sub-issue decomposition and hierarchy verification;
- blockers, implementation notes, and PR/commit references;
- evidence-backed acceptance criteria;
- completion, follow-up routing, and human handoff.

This is the lifecycle control and memory layer, not an autonomous scheduler or coding-agent runtime. It does not launch agents, run code, merge changes, or bypass a missing MCP capability.

## Contents

| Path | Purpose |
|:--|:--|
| `skills/github-loop-engineering-skill/SKILL.md` | Core loop, lifecycle rules, and safety contract |
| `skills/github-loop-engineering-skill/references/github-mcp-tools.md` | Official GitHub MCP tool map and payload patterns |
| `skills/github-loop-engineering-skill/references/work-item-format.md` | Portable issue, blocker, note, and completion formats |

## Bootstrap the GitHub MCP dependency

This skill has one runtime dependency: the official [github/github-mcp-server](https://github.com/github/github-mcp-server).

If it is not connected, ask the agent to bootstrap it:

```text
Install or connect the official github/github-mcp-server for this MCP host.
Use the host's supported installation method, keep credentials out of files
and chat, enable the toolsets required by $github-loop-engineering-skill, reload the
tools, verify the connection, and then resume the original request.
```

The agent should perform the setup itself when the host exposes an approved installer, connector manager, or shell workflow. Installation is host-specific: prefer the official remote server when supported; otherwise use the official container or binary instructions. Do not assume that cloning the source repository configures an MCP host.

Before downloading software, changing user/global host configuration, or starting an authentication flow, the agent must obtain any approval required by the host. Store OAuth or PAT credentials through the host's secret/input mechanism or environment—not in the repository, skill, command transcript, or chat.

Enable at least the `issues` and `projects` toolsets. `context`, `repos`, `labels`, and `pull_requests` are recommended for the full loop:

```text
context,repos,issues,labels,projects,pull_requests
```

The server's default toolsets can omit `projects`, so board operations require enabling it explicitly. Project writes also require project-write authorization. Follow the official server's [configuration guide](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md) for the detected MCP host.

After setup, verify that identity, issue reads, Project reads, and the requested write tools are actually available. Only then resume the skill at Discover.

## Install

With an Agent Skills-compatible installer:

```bash
npx skills add Ruisi-Lu/github-loop-engineering-skill
```

Or copy the skill directory into the location used by your agent:

```bash
cp -R skills/github-loop-engineering-skill ~/.codex/skills/
```

For a repository-local Claude Code installation:

```bash
cp -R skills/github-loop-engineering-skill .claude/skills/
```

Restart or reload the agent host if it does not discover newly installed skills automatically.

## Use

Run one bounded work loop:

```text
Use $github-loop-engineering-skill to inspect issue #42 and its project item, choose the
next authorized transition, apply it, verify it, and persist the evidence.
```

Create and route work:

```text
Use $github-loop-engineering-skill to create an issue for the failing upload retries,
add it to our engineering project, set the existing priority to High, and
verify every resulting state.
```

Enforce a completion gate:

```text
Use $github-loop-engineering-skill to close issue #42 only if every acceptance criterion
has current evidence, then synchronize and verify the project status.
```

The skill follows repository instructions and existing project vocabulary. Ambiguous targets, insufficient evidence, missing capabilities, and new authority requirements stop the loop before an unsafe transition.

## Design boundaries

The skill targets the official GitHub MCP Server's documented tool surface. It never silently switches to a CLI or direct API. Native issue dependencies and arbitrary project configuration remain conditional on the tools exposed by the connected server.

The skill completes one requested lifecycle operation or bounded recovery at a time. Scheduling, isolated worktrees, coding-agent execution, independent code evaluation, deployment, and unattended repetition belong to the surrounding Loop Engineering harness.

## License

MIT — see [LICENSE](LICENSE).
