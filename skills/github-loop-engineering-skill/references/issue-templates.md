# Issue templates

This skill's templates in [`../assets/issue-templates/`](../assets/issue-templates/) are the source of truth for every repository that installed them. They carry the cold-start sections from the [work-item format](work-item-format.md), so a person who opens an issue in the web UI writes the same body that an agent writes through the API.

## Contents

- [Managed set](#managed-set)
- [Install](#install)
- [Keep them current](#keep-them-current)
- [Write bodies through the API](#write-bodies-through-the-api)

## Managed set

- One directory per locale: `en` and `zh-TW`.
- Each locale has `feature.md`, `bug.md`, `task.md`, and `config.yml`. They install into `.github/ISSUE_TEMPLATE/` with unchanged file names and front matter keys.
- Only two local adjustments are expected:
  - remove each `type:` line if the repository doesn't support issue types;
  - set `blank_issues_enabled: true` in `config.yml` if the user chose to keep blank issues.

## Install

First-use initialization installs the chosen locale (see [initialization](initialization.md#issue-templates)). Record in repository guidance that the templates come from this skill, and which locale. Later sessions use that record to know the templates are managed.

## Keep them current

When repository guidance says the templates come from this skill, compare them with this skill's copy before the first write in a session:

1. Read `.github/ISSUE_TEMPLATE/` on the default branch with `get_file_contents`.
2. Compare each file with the same file in the recorded locale, after applying the expected local adjustments.
3. If nothing differs, continue the original request.
4. If something differs, finish the current transition first. Then propose the update as its own pull request:
   - Take this skill's current files.
   - Keep any deliberate local change, such as an added section or repository-specific wording, and apply the skill's changes around it.
   - List the local changes you kept in the pull request description.

Never push to the default branch, and leave the merge to a human. Templates take effect only after they reach the default branch. If the user declines the update, record that in repository guidance so later sessions don't propose it again.

## Write bodies through the API

GitHub applies templates only in the web UI. When you create an issue through the API, read the repository's template for that issue type and write its sections yourself, in the repository's language, following each section's comment. Leave the comments out of the body you send.
