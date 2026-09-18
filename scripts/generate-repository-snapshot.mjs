/** Build a same-origin, read-only source snapshot. Never publish working-directory secrets. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_PATH = "data/repository-source-catalog.json";
const REPOSITORY = "Alex-Unnippillil/kali-linux-portfolio";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".md",
  ".yml",
  ".yaml",
  ".html",
  ".txt",
  ".py",
  ".sh",
  ".sql",
]);
const EXCLUDED =
  /(^|\/)(?:node_modules|\.git|\.next[^/]*|\.yarn|out|dist|coverage|vendor|fixtures|portfolio-browser-report|test-results)(\/|$)/;
const PRIVATE_NAME =
  /(^|\/)(?:\.env[^/]*|[^/]*\.(?:pem|key|p12|pfx)|id_rsa|id_ed25519|credentials[^/]*|secrets?[^/]*)(\/|$)/i;

export function isPublicSource(file) {
  return (
    typeof file === "string" &&
    file.length <= 300 &&
    !file.startsWith("/") &&
    !file.includes("\\") &&
    file.split("/").every((part) => part && part !== "." && part !== "..") &&
    !EXCLUDED.test(file) &&
    !PRIVATE_NAME.test(file) &&
    !file.startsWith("public/") &&
    !file.startsWith("qa/") &&
    !file.startsWith("data/x-profile-snapshot") &&
    file !== CATALOG_PATH &&
    (EXTENSIONS.has(path.extname(file).toLowerCase()) ||
      ["LICENSE", "Dockerfile"].includes(file))
  );
}
export function sourceLanguage(file) {
  return (
    {
      ".ts": "typescript",
      ".tsx": "typescript",
      ".js": "javascript",
      ".jsx": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript",
      ".json": "json",
      ".css": "css",
      ".scss": "scss",
      ".md": "markdown",
      ".yml": "yaml",
      ".yaml": "yaml",
      ".html": "html",
      ".py": "python",
      ".sh": "shell",
      ".sql": "sql",
    }[path.extname(file).toLowerCase()] || "plaintext"
  );
}

function trackedSource(root) {
  const options = {
    cwd: root,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  };
  const git = (...args) =>
    execFileSync("git", args, options).toString("utf8").trim();
  // Never inherit the index of an unrelated parent checkout.
  if (path.resolve(git("rev-parse", "--show-toplevel")) !== path.resolve(root))
    throw new Error("No Git index at the deployment root");
  const revision = git("rev-parse", "HEAD");
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Invalid Git revision");
  return {
    revision,
    tracked: execFileSync("git", ["ls-files", "-z"], options)
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .sort(),
  };
}

export async function writeSourceCatalog(root = ROOT) {
  const { tracked } = trackedSource(root);
  const catalog = {
    version: 1,
    repository: REPOSITORY,
    files: tracked.filter(isPublicSource),
  };
  await mkdir(path.join(root, "data"), { recursive: true });
  await writeFile(
    path.join(root, CATALOG_PATH),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  return catalog;
}

async function deploymentSource(root, env) {
  try {
    return trackedSource(root);
  } catch {
    // Vercel/CLI/archive builds can omit .git. Only a committed allowlist is
    // eligible in that case: never scan the working tree or export injected env files.
    const revision = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA;
    if (!/^[a-f0-9]{40}$/.test(revision || ""))
      throw new Error(
        "Git metadata is unavailable; an exact deployment revision (VERCEL_GIT_COMMIT_SHA or GITHUB_SHA) is required",
      );
    let catalog;
    try {
      const info = await lstat(path.join(root, CATALOG_PATH));
      if (!info.isFile() || info.isSymbolicLink() || info.size > 512 * 1024)
        throw new Error("Invalid catalog file");
      if ((await lstat(path.join(root, "data"))).isSymbolicLink())
        throw new Error("Invalid catalog directory");
      catalog = JSON.parse(
        await readFile(path.join(root, CATALOG_PATH), "utf8"),
      );
    } catch {
      throw new Error(
        "A reviewed source catalog is required for a Git-less build; run yarn source:catalog in the checkout and commit it",
      );
    }
    if (
      catalog?.version !== 1 ||
      catalog.repository !== REPOSITORY ||
      !Array.isArray(catalog.files) ||
      catalog.files.length > 5000 ||
      !catalog.files.includes("README.md") ||
      !catalog.files.every(isPublicSource) ||
      new Set(catalog.files).size !== catalog.files.length
    )
      throw new Error("Invalid reviewed source catalog");
    return { revision, tracked: [...catalog.files].sort() };
  }
}

export async function generateRepositorySnapshot(
  root = ROOT,
  env = process.env,
) {
  root = path.resolve(root);
  const destination = path.join(root, "public", "showcase", "repository");
  const staging = `${destination}.tmp`;
  const { tracked, revision } = await deploymentSource(root, env);
  await rm(staging, { recursive: true, force: true });
  await mkdir(path.join(staging, "files"), { recursive: true });
  const files = [];
  let bytes = 0;
  let omitted = 0;
  try {
    for (const file of tracked) {
      if (!isPublicSource(file)) {
        omitted++;
        continue;
      }
      const filename = path.join(root, file);
      let stat;
      try {
        stat = await lstat(filename);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        // A deployment may prune tracked documentation/CI files. Missing files
        // are omitted, not replaced by untracked working-directory contents.
        omitted++;
        continue;
      }
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > MAX_SOURCE_BYTES
      ) {
        omitted++;
        continue;
      }
      // Reject symlinked parent directories as well as symlinked files.
      let parent = path.dirname(filename);
      let safe = true;
      while (parent !== root) {
        if ((await lstat(parent)).isSymbolicLink()) {
          safe = false;
          break;
        }
        parent = path.dirname(parent);
      }
      if (!safe) {
        omitted++;
        continue;
      }
      const buffer = await readFile(filename);
      const content = buffer.toString("utf8");
      if (
        content.includes("\0") ||
        !Buffer.from(content, "utf8").equals(buffer)
      ) {
        omitted++;
        continue;
      }
      bytes += buffer.length;
      if (bytes > MAX_TOTAL_BYTES)
        throw new Error("Repository source snapshot exceeds its 16 MiB budget");
      const payload = JSON.stringify({ path: file, content });
      const asset = createHash("sha256").update(payload).digest("hex");
      await writeFile(path.join(staging, "files", `${asset}.json`), payload);
      files.push({
        path: file,
        language: sourceLanguage(file),
        bytes: buffer.length,
        asset,
      });
    }
    if (!files.some((file) => file.path === "README.md"))
      throw new Error("The repository snapshot must include README.md");
    const manifest = {
      version: 1,
      repository: REPOSITORY,
      ref: "main",
      revision,
      generatedAt: new Date().toISOString(),
      files,
      omitted,
    };
    await writeFile(path.join(staging, "index.json"), JSON.stringify(manifest));
    await rm(destination, { recursive: true, force: true });
    await rename(staging, destination);
    console.log(
      `Repository showcase: ${files.length} real text files, ${bytes} bytes, source ${revision.slice(0, 7)}`,
    );
    return manifest;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes("--catalog")) await writeSourceCatalog();
  else await generateRepositorySnapshot();
}
