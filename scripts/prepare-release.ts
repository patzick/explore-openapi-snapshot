#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type PackageJson = {
  version: string;
};

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function run(command: string, args: string[], options: { capture?: boolean } = {}): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    fail(`failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    fail(`${command} ${args.join(" ")} failed`);
  }

  return options.capture ? result.stdout.trim() : "";
}

function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function stableVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function nextPatch(version: string): string {
  const parts = version.split(".").map(Number);
  return [parts[0], parts[1], parts[2] + 1].join(".");
}

function tagExists(tag: string): boolean {
  return (
    spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
      stdio: "ignore",
    }).status === 0
  );
}

function remoteTagExists(tag: string): boolean {
  return (
    spawnSync("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], {
      stdio: "ignore",
    }).status === 0
  );
}

function packageVersion(): string {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
  return packageJson.version;
}

function latestVersionTag(): string {
  return (
    run("git", ["tag", "--list", "v[0-9]*.[0-9]*.[0-9]*", "--sort=-version:refname"], {
      capture: true,
    })
      .split("\n")
      .find(Boolean) ?? ""
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function updateChangelog(entry: string): void {
  if (!existsSync("CHANGELOG.md")) {
    writeFileSync("CHANGELOG.md", `# Changelog\n\n${entry}`, "utf8");
    return;
  }

  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const lines = changelog.split(/\r?\n/);
  const title = lines[0] || "# Changelog";
  const rest = lines.slice(1);

  while (rest[0] === "") {
    rest.shift();
  }

  writeFileSync("CHANGELOG.md", `${title}\n\n${entry}${rest.join("\n")}`, "utf8");
}

async function main(): Promise<void> {
  for (const command of ["git", "node", "pnpm"]) {
    if (!commandExists(command)) {
      fail(`missing required command: ${command}`);
    }
  }

  const currentBranch = run("git", ["branch", "--show-current"], { capture: true });
  if (!currentBranch) {
    fail("detached HEAD is not supported");
  }

  if (currentBranch === "main") {
    fail("create a release branch first, then run this script there");
  }

  if (run("git", ["status", "--porcelain"], { capture: true })) {
    fail("working tree must be clean before preparing a release");
  }

  run("git", ["fetch", "--tags", "origin"]);

  const currentVersion = packageVersion();
  if (!stableVersion(currentVersion)) {
    fail(`current package version must be stable X.Y.Z, got ${currentVersion}`);
  }

  const latestTag = latestVersionTag();
  const suggestedVersion = nextPatch(currentVersion);

  console.log(`Current package version: ${currentVersion}`);
  console.log(`Latest release tag: ${latestTag || "none"}`);
  console.log(`Suggested next patch: ${suggestedVersion}`);

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `Release version, without or with v prefix [${suggestedVersion}]: `,
  );
  rl.close();

  const version = (answer.trim() || suggestedVersion).replace(/^v/, "");
  if (!stableVersion(version)) {
    fail("version must look like 2.0.1");
  }

  const tag = `v${version}`;
  if (tagExists(tag)) {
    fail(`local tag already exists: ${tag}`);
  }

  if (remoteTagExists(tag)) {
    fail(`remote tag already exists: ${tag}`);
  }

  const notesRange = latestTag ? `${latestTag}..HEAD` : "HEAD";
  const notes =
    run("git", ["log", "--pretty=format:- %s (%h)", notesRange], { capture: true }) ||
    `- Release ${tag}`;
  const changelogEntry = `## ${tag} - ${today()}\n\n${notes}\n\n`;

  updateChangelog(changelogEntry);

  console.log("\nGenerated changelog entry:\n");
  process.stdout.write(changelogEntry);

  console.log(`Bumping package version to ${version}...`);
  run("pnpm", ["version", version, "--no-git-tag-version"]);
  run("pnpm", ["install", "--lockfile-only"]);

  console.log("\nRunning release preparation checks...");
  run("pnpm", ["typecheck"]);
  run("pnpm", ["lint"]);
  run("pnpm", ["build"]);
  run("pnpm", ["test"]);
  run("pnpm", ["format:check"]);

  console.log("\nRelease preparation complete.");
  console.log("Review CHANGELOG.md, package.json, pnpm-lock.yaml, and dist/index.js.");
  console.log("Then commit these changes, push the release branch, and open a PR to main.");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
