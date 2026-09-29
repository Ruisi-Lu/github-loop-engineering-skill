# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The version in `.claude-plugin/plugin.json` is the release version.

## [Unreleased]

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

[Unreleased]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/compare/github-loop-engineering--v1.0.0...HEAD
[1.0.0]: https://github.com/Ruisi-Lu/github-loop-engineering-skill/releases/tag/github-loop-engineering--v1.0.0
