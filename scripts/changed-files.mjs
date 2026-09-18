import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const extensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
export function collectChangedFiles(cwd = process.cwd(), env = process.env) {
  const git = (args, required = false) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8", input: "" });
    if (result.status !== 0) {
      if (required)
        throw new Error(`Cannot determine lint scope: git ${args[0]} failed`);
      return "";
    }
    return result.stdout;
  };
  const head = git(["rev-parse", "HEAD"], true).trim();
  let base = "";
  // A push can contain multiple commits. Use its actual before/after range,
  // rather than the last commit or an unrelated historical origin/master.
  if (env.GITHUB_EVENT_NAME === "push" && env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    if (
      event.after === head &&
      /^[a-f0-9]{40,64}$/.test(event.before || "") &&
      !/^0+$/.test(event.before)
    ) {
      base = git(["rev-parse", "--verify", `${event.before}^{commit}`]).trim();
      if (!base)
        throw new Error(
          "Push base is unavailable; fetch full history before linting.",
        );
    }
  }
  if (!base) {
    const remotes = env.GITHUB_BASE_REF
      ? [`origin/${env.GITHUB_BASE_REF}`]
      : ["origin/main", "origin/master"];
    for (const remote of remotes) {
      const mergeBase = git(["merge-base", remote, "HEAD"]).trim();
      if (!mergeBase) continue;
      // On main the tracked remote equals HEAD. Stop here and use the parent;
      // falling through to an obsolete master branch lints unrelated legacy code.
      base =
        mergeBase === head ? git(["rev-parse", "HEAD^"]).trim() : mergeBase;
      break;
    }
  }
  if (!base) base = git(["rev-parse", "HEAD^"]).trim();
  if (!base) base = git(["hash-object", "-t", "tree", "--stdin"], true).trim();
  const files = new Set([
    ...git(
      ["diff", "--name-only", "-z", "--diff-filter=ACMRTUXB", base, "HEAD"],
      true,
    ).split("\0"),
    ...git(
      ["diff", "--name-only", "-z", "--diff-filter=ACMRTUXB", "HEAD"],
      true,
    ).split("\0"),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"], true).split(
      "\0",
    ),
  ]);
  return [...files]
    .filter(
      (file) =>
        file &&
        !file.split("/").includes("node_modules") &&
        fs.existsSync(path.join(cwd, file)) &&
        extensions.has(path.extname(file)),
    )
    .sort();
}
