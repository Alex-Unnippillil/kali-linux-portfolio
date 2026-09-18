/** @jest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.resolve("scripts/changed-files.mjs")).href;
let dir: string;
function git(...args: string[]) {
  const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
function commit(name: string) {
  fs.writeFileSync(path.join(dir, name), "export const value = 1;\n");
  git("add", name);
  git("commit", "-qm", name);
  return git("rev-parse", "HEAD");
}
function scope(env: Record<string, string> = {}) {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { collectChangedFiles } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(collectChangedFiles(${JSON.stringify(dir)}, ${JSON.stringify(env)})));`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout) as string[];
}
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-scope-"));
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
it("does not fall through from current origin/main to obsolete origin/master", () => {
  const old = commit("legacy.js");
  git("update-ref", "refs/remotes/origin/master", old);
  commit("earlier.js");
  const head = commit("release.ts");
  git("update-ref", "refs/remotes/origin/main", head);
  expect(scope()).toEqual(["release.ts"]);
});
it("lints every changed file in a multiple-commit push", () => {
  const before = commit("legacy.js");
  commit("first.ts");
  const after = commit("second.ts");
  const event = path.join(dir, "push.json");
  fs.writeFileSync(event, JSON.stringify({ before, after }));
  expect(
    scope({ GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: event }),
  ).toEqual(["first.ts", "second.ts"]);
});
it("uses the PR base and includes unstaged, staged and untracked files with spaces", () => {
  const base = commit("old.js");
  git("update-ref", "refs/remotes/origin/main", base);
  commit("new.ts");
  fs.writeFileSync(path.join(dir, "old.js"), "export const changed = 2;");
  fs.writeFileSync(path.join(dir, "new file.ts"), "export {};");
  fs.writeFileSync(path.join(dir, "staged.tsx"), "export {};");
  git("add", "staged.tsx");
  expect(scope({ GITHUB_BASE_REF: "main" })).toEqual([
    "new file.ts",
    "new.ts",
    "old.js",
    "staged.tsx",
  ]);
});
it("lints a root commit against the empty tree", () => {
  commit("initial.js");
  expect(scope()).toEqual(["initial.js"]);
});
it("fails closed when a push base is missing instead of silently skipping lint", () => {
  const after = commit("initial.js");
  const event = path.join(dir, "push.json");
  fs.writeFileSync(event, JSON.stringify({ after, before: "1".repeat(40) }));
  expect(() =>
    scope({ GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: event }),
  ).toThrow("Push base is unavailable");
});
it("omits deleted files and non-code documentation", () => {
  const base = commit("gone.js");
  git("update-ref", "refs/remotes/origin/main", base);
  git("rm", "gone.js");
  commit("changed.ts");
  fs.writeFileSync(path.join(dir, "notes.md"), "notes");
  expect(scope({ GITHUB_BASE_REF: "main" })).toEqual(["changed.ts"]);
});

it("does not mistake a shallow checkout for a root commit", () => {
  commit("legacy.js");
  commit("release.ts");
  const upstream = dir;
  const shallow = path.join(upstream, "shallow-checkout");
  const clone = spawnSync(
    "git",
    ["clone", "--quiet", "--depth=1", pathToFileURL(upstream).href, shallow],
    { encoding: "utf8" },
  );
  if (clone.status !== 0) throw new Error(clone.stderr);
  dir = shallow;
  try {
    expect(git("rev-parse", "--is-shallow-repository")).toBe("true");
    expect(() => scope()).toThrow("Shallow checkout has no lint base");
    git("fetch", "--quiet", "--unshallow");
    expect(scope()).toEqual(["release.ts"]);
  } finally {
    dir = upstream;
  }
});
it("fetches full history before changed-file lint in the Pages workflow", () => {
  const workflow = fs.readFileSync(".github/workflows/gh-deploy.yml", "utf8");
  expect(workflow).toMatch(
    /uses: actions\/checkout@v4\s+with:\s+fetch-depth: 0/,
  );
});
