import { z } from "zod";

export const REPOSITORY = "Alex-Unnippillil/kali-linux-portfolio";
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
export const REPOSITORY_ASSETS = "/showcase/repository";
export const safeSourcePath = (value: string) =>
  value.length > 0 &&
  value.length <= 300 &&
  !value.startsWith("/") &&
  !value.includes("\\") &&
  !value.split("/").some((part) => !part || part === "." || part === "..");
const pathSchema = z.string().refine(safeSourcePath);
export const SourceFileSchema = z.object({
  path: pathSchema,
  language: z.enum([
    "typescript",
    "javascript",
    "json",
    "css",
    "scss",
    "markdown",
    "yaml",
    "html",
    "python",
    "shell",
    "sql",
    "plaintext",
  ]),
  bytes: z
    .number()
    .int()
    .min(0)
    .max(256 * 1024),
  asset: z.string().regex(/^[a-f0-9]{64}$/),
});
export const RepositoryManifestSchema = z
  .object({
    version: z.literal(1),
    repository: z.literal(REPOSITORY),
    ref: z.literal("main"),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    generatedAt: z.string().datetime(),
    omitted: z.number().int().nonnegative(),
    files: z.array(SourceFileSchema).min(1).max(4000),
  })
  .refine(
    (value) =>
      new Set(value.files.map((file) => file.path)).size === value.files.length,
  );
export const SourceContentSchema = z.object({
  path: pathSchema,
  content: z.string().max(256 * 1024),
});
export type SourceFile = z.infer<typeof SourceFileSchema>;
export type RepositoryManifest = z.infer<typeof RepositoryManifestSchema>;
export type TreeEntry = {
  path: string;
  name: string;
  depth: number;
  directory: boolean;
  file?: SourceFile;
};

export function fuzzyMatch(value: string, query: string): boolean {
  let index = 0;
  for (const char of value.toLowerCase())
    if (char === query.toLowerCase()[index]) index++;
  return index === query.length;
}
export function matchSourceFiles(
  files: SourceFile[],
  query: string,
): SourceFile[] {
  const value = query.trim().toLowerCase();
  if (!value) return files;
  return files
    .filter((file) => fuzzyMatch(file.path, value))
    .sort((a, b) => {
      const aExact = a.path.toLowerCase().includes(value);
      const bExact = b.path.toLowerCase().includes(value);
      return (
        Number(bExact) - Number(aExact) ||
        a.path.length - b.path.length ||
        a.path.localeCompare(b.path)
      );
    });
}
export function sourceParents(file: string): string[] {
  const segments = file.split("/");
  return segments
    .slice(0, -1)
    .map((_, index) => segments.slice(0, index + 1).join("/"));
}
export function visibleSourceTree(
  files: SourceFile[],
  expanded: Set<string>,
): TreeEntry[] {
  const directories = new Map<string, TreeEntry>();
  const children = new Map<string, TreeEntry[]>();
  const add = (parent: string, entry: TreeEntry) =>
    children.set(parent, [...(children.get(parent) || []), entry]);
  for (const file of files) {
    for (const folder of sourceParents(file.path)) {
      if (directories.has(folder)) continue;
      const segments = folder.split("/");
      const entry = {
        path: folder,
        name: segments[segments.length - 1],
        depth: segments.length - 1,
        directory: true,
      };
      directories.set(folder, entry);
      add(segments.slice(0, -1).join("/"), entry);
    }
    const segments = file.path.split("/");
    add(segments.slice(0, -1).join("/"), {
      path: file.path,
      name: segments[segments.length - 1],
      depth: segments.length - 1,
      directory: false,
      file,
    });
  }
  const result: TreeEntry[] = [];
  const visit = (parent: string) => {
    for (const entry of (children.get(parent) || []).sort(
      (a, b) =>
        Number(b.directory) - Number(a.directory) ||
        a.name.localeCompare(b.name),
    )) {
      result.push(entry);
      if (entry.directory && expanded.has(entry.path)) visit(entry.path);
    }
  };
  visit("");
  return result;
}
export function fileSourceUrl(file: string, revision: string): string {
  return `${REPOSITORY_URL}/blob/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;
}
