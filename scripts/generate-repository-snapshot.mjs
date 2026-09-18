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
    !file.split("/").includes("..") &&
    !EXCLUDED.test(file) &&
    !PRIVATE_NAME.test(file) &&
    !file.startsWith("public/") &&
    !file.startsWith("qa/") &&
    !file.startsWith("data/x-profile-snapshot") &&
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

export async function generateRepositorySnapshot(root = ROOT) {
  const destination = path.join(root, "public", "showcase", "repository");
  const staging = `${destination}.tmp`;
  // Only Git-tracked, bounded text files are eligible. No recursive directory dump or env inspection.
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    maxBuffer: 4 * 1024 * 1024,
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root })
    .toString()
    .trim();
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
      const stat = await lstat(filename);
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
      repository: "Alex-Unnippillil/kali-linux-portfolio",
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
  await generateRepositorySnapshot();
}
