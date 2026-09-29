# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The version in `.claude-plugin/plugin.json` is the release version.

## [Unreleased]

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
