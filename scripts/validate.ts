/**
 * Repository consistency checks for the skill and its Claude Code plugin packaging.
 *
 * Covers invariants that `claude plugin validate` does not know about (marketplace entry
 * alignment, changelog version, Agent Skills frontmatter, cold-start issue templates,
 * relative Markdown links), then
 * delegates to `claude plugin validate --strict` when the CLI is available. In CI the CLI
 * is required.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const errors: string[] = [];
const warnings: string[] = [];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// Claude Code installs dependencies for every user when the plugin root has one of these.
const ROOT_LOCKFILES = ["bun.lock", "bun.lockb", "npm-shrinkwrap.json", "package-lock.json"];
const SKILL_NAME_MAX = 64;
const SKILL_DESCRIPTION_MAX = 1024;

type JsonObject = Record<string, unknown>;

function display(path: string): string {
  return relative(root, path) || ".";
}

function fail(path: string, message: string): void {
  errors.push(`${display(path)}: ${message}`);
}

function warn(path: string, message: string): void {
  warnings.push(`${display(path)}: ${message}`);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(path: string): Promise<JsonObject | undefined> {
  if (!existsSync(path)) {
    fail(path, "file is missing");
    return undefined;
  }
  try {
    const value: unknown = await Bun.file(path).json();
    if (isObject(value)) return value;
    fail(path, "must contain a JSON object");
  } catch (error) {
    fail(path, `invalid JSON: ${(error as Error).message}`);
  }
  return undefined;
}

async function checkManifests(): Promise<void> {
  const pluginPath = join(root, ".claude-plugin", "plugin.json");
  const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
  const plugin = await readJsonObject(pluginPath);
  const marketplace = await readJsonObject(marketplacePath);
  if (!plugin || !marketplace) return;

  const { name, version } = plugin;
  if (typeof name !== "string" || !KEBAB_CASE.test(name)) {
    fail(pluginPath, "name must be a kebab-case string");
    return;
  }
  if (typeof version !== "string" || !SEMVER.test(version)) {
    fail(pluginPath, "version must be a semantic version such as 1.2.3");
  } else {
    await checkChangelog(version);
  }

  const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const matches = entries.filter((entry) => isObject(entry) && entry.name === name);
  if (matches.length !== 1) {
    fail(marketplacePath, `expected exactly one plugins[] entry named "${name}", found ${matches.length}`);
    return;
  }
  const entry = matches[0] as JsonObject;
  if (entry.source !== "./" && entry.source !== ".") {
    fail(marketplacePath, `entry "${name}" must use the repository root ("./") as its source`);
  }
  if ("version" in entry) {
    fail(marketplacePath, `entry "${name}" must not set version; plugin.json is the single source of truth`);
  }
}

async function checkChangelog(version: string): Promise<void> {
  const path = join(root, "CHANGELOG.md");
  if (!existsSync(path)) {
    fail(path, "file is missing");
    return;
  }
  const text = await Bun.file(path).text();
  const released = [...text.matchAll(/^## \[([^\]]+)\]/gm)]
    .map((match) => match[1])
    .find((heading) => heading !== undefined && heading.toLowerCase() !== "unreleased");
  if (released !== version) {
    fail(path, `latest released section is "${released ?? "none"}" but plugin.json version is "${version}"`);
  }
}

function parseFrontmatter(path: string, text: string): JsonObject | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match?.[1]) {
    fail(path, "missing YAML frontmatter");
    return undefined;
  }
  try {
    const value: unknown = Bun.YAML.parse(match[1]);
    if (isObject(value)) return value;
    fail(path, "frontmatter must be a YAML mapping");
  } catch (error) {
    fail(path, `invalid frontmatter YAML: ${(error as Error).message}`);
  }
  return undefined;
}

async function checkSkills(): Promise<void> {
  const skillsDir = join(root, "skills");
  const skillFiles = [...new Bun.Glob("*/SKILL.md").scanSync({ cwd: skillsDir, absolute: true })];
  if (skillFiles.length === 0) {
    fail(skillsDir, "no <skill>/SKILL.md found");
    return;
  }
  for (const path of skillFiles) {
    const frontmatter = parseFrontmatter(path, await Bun.file(path).text());
    if (!frontmatter) continue;
    const dirName = dirname(path).split("/").at(-1);
    const { name, description } = frontmatter;
    if (typeof name !== "string" || !KEBAB_CASE.test(name) || name.length > SKILL_NAME_MAX) {
      fail(path, `name must be kebab-case and at most ${SKILL_NAME_MAX} characters`);
    } else if (name !== dirName) {
      fail(path, `name "${name}" must match its directory "${dirName}"`);
    }
    if (typeof description !== "string" || description.trim() === "") {
      fail(path, "description must be a non-empty string");
    } else if (description.length > SKILL_DESCRIPTION_MAX) {
      fail(path, `description is ${description.length} characters; the limit is ${SKILL_DESCRIPTION_MAX}`);
    }
  }
}

// Cold-start sections every template must carry, per locale; bug templates add a reproduction section.
const TEMPLATE_SECTIONS: Record<string, { base: string[]; bug: string }> = {
  en: {
    base: ["## Why", "## What", "## State", "## Acceptance criteria", "## Pointers"],
    bug: "## Reproduction",
  },
  "zh-TW": {
    base: ["## 背景 (Why)", "## 範圍 (What)", "## 現狀 (State)", "## 驗收條件 (Acceptance Criteria)", "## 指標 (Pointers)"],
    bug: "## 重現 (Reproduction)",
  },
};
const TEMPLATE_FILES = ["bug.md", "config.yml", "feature.md", "task.md"];
const TEMPLATE_TYPES: Record<string, string> = { "bug.md": "Bug", "feature.md": "Feature", "task.md": "Task" };

async function checkIssueTemplates(): Promise<void> {
  for (const skillDir of new Bun.Glob("*/").scanSync({ cwd: join(root, "skills"), onlyFiles: false })) {
    const templatesDir = join(root, "skills", skillDir, "assets", "issue-templates");
    if (!existsSync(templatesDir)) continue;
    for (const [locale, sections] of Object.entries(TEMPLATE_SECTIONS)) {
      const localeDir = join(templatesDir, locale);
      const files = existsSync(localeDir) ? [...new Bun.Glob("*").scanSync({ cwd: localeDir })].sort() : [];
      if (files.join(",") !== TEMPLATE_FILES.join(",")) {
        fail(localeDir, `expected exactly ${TEMPLATE_FILES.join(", ")}; found ${files.join(", ") || "nothing"}`);
        continue;
      }
      await checkTemplateConfig(join(localeDir, "config.yml"));
      for (const [file, type] of Object.entries(TEMPLATE_TYPES)) {
        const path = join(localeDir, file);
        const text = await Bun.file(path).text();
        const frontmatter = parseFrontmatter(path, text);
        if (!frontmatter) continue;
        if (typeof frontmatter.name !== "string" || frontmatter.name.trim().length <= 3) {
          fail(path, "name must be longer than 3 characters");
        }
        if (typeof frontmatter.about !== "string" || frontmatter.about.trim() === "") {
          fail(path, "about must be a non-empty string");
        }
        if (frontmatter.type !== type) fail(path, `type must be "${type}"`);
        if ("assignees" in frontmatter) fail(path, "must not assign anyone; assignment is decided when work starts");
        const headings = new Set(stripCode(text).split("\n").map((line) => line.trimEnd()));
        const required = file === "bug.md" ? [...sections.base, sections.bug] : sections.base;
        for (const heading of required) {
          if (!headings.has(heading)) fail(path, `missing cold-start section "${heading}"`);
        }
      }
    }
  }
}

async function checkTemplateConfig(path: string): Promise<void> {
  try {
    const value: unknown = Bun.YAML.parse(await Bun.file(path).text());
    if (!isObject(value) || typeof value.blank_issues_enabled !== "boolean") {
      fail(path, "blank_issues_enabled must be a boolean");
    }
  } catch (error) {
    fail(path, `invalid YAML: ${(error as Error).message}`);
  }
}

function stripCode(markdown: string): string {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
}

// Mirrors GitHub's heading anchor generation, including -1, -2 suffixes for repeats.
function headingAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  for (const match of stripCode(markdown).matchAll(/^#{1,6}[ \t]+(.+?)[ \t#]*$/gm)) {
    const base = (match[1] ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

async function checkMarkdownLinks(): Promise<void> {
  const glob = new Bun.Glob("**/*.md");
  const files = [...glob.scanSync({ cwd: root, absolute: true, dot: true })].filter(
    (path) => !/[\\/](?:node_modules|\.git)[\\/]/.test(path),
  );
  const anchorCache = new Map<string, Set<string>>();
  const anchorsOf = async (path: string): Promise<Set<string>> => {
    let anchors = anchorCache.get(path);
    if (!anchors) {
      anchors = headingAnchors(await Bun.file(path).text());
      anchorCache.set(path, anchors);
    }
    return anchors;
  };

  for (const file of files) {
    const text = stripCode(await Bun.file(file).text());
    for (const match of text.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const target = match[1] ?? "";
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const hashIndex = target.indexOf("#");
      const pathPart = hashIndex === -1 ? target : target.slice(0, hashIndex);
      const anchor = hashIndex === -1 ? "" : decodeURIComponent(target.slice(hashIndex + 1));
      const resolved = pathPart === "" ? file : resolve(dirname(file), decodeURIComponent(pathPart));
      if (!resolved.startsWith(root)) {
        fail(file, `link "${target}" points outside the repository`);
        continue;
      }
      if (!existsSync(resolved)) {
        fail(file, `link "${target}" points to a missing file`);
        continue;
      }
      if (anchor && resolved.endsWith(".md") && statSync(resolved).isFile()) {
        if (!(await anchorsOf(resolved)).has(anchor)) {
          fail(file, `link "${target}" points to a missing heading`);
        }
      }
    }
  }
}

function checkRootDependencies(): void {
  if (!existsSync(join(root, "package.json"))) return;
  for (const lockfile of ROOT_LOCKFILES) {
    const path = join(root, lockfile);
    if (existsSync(path)) {
      fail(path, "the plugin root must not pair package.json with a lockfile; keep tooling under scripts/");
    }
  }
}

function runOfficialValidator(): void {
  const claude = Bun.which("claude");
  if (!claude) {
    const message = "Claude Code CLI not found; skipped `claude plugin validate --strict`";
    if (process.env.CI) fail(root, message);
    else warn(root, message);
    return;
  }
  const targets = [root, join(root, ".claude-plugin", "plugin.json"), join(root, "skills")];
  for (const target of targets) {
    const result = Bun.spawnSync([claude, "plugin", "validate", "--strict", target], {
      stdout: "inherit",
      stderr: "inherit",
    });
    if (result.exitCode !== 0) {
      fail(target, `claude plugin validate --strict exited with ${result.exitCode}`);
    }
  }
}

await checkManifests();
await checkSkills();
await checkIssueTemplates();
await checkMarkdownLinks();
checkRootDependencies();
runOfficialValidator();

for (const message of warnings) console.warn(`warning: ${message}`);
for (const message of errors) console.error(`error: ${message}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) found.`);
  process.exit(1);
}
console.log(`\nAll repository checks passed${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ""}.`);
