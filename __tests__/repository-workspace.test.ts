import {
  RepositoryManifestSchema,
  SourceContentSchema,
  safeSourcePath,
  matchSourceFiles,
  visibleSourceTree,
  fileSourceUrl,
} from "../utils/repository-workspace";
import { safeXImage } from "../utils/x-profile";
import { readXSnapshot } from "../utils/x-snapshot";
const files = [
  "README.md",
  "apps/x/index.tsx",
  "apps/vscode/index.tsx",
  "pages/index.tsx",
].map((path) => ({
  path,
  language: "typescript" as const,
  bytes: 10,
  asset: "a".repeat(64),
}));
const manifest = {
  version: 1,
  repository: "Alex-Unnippillil/kali-linux-portfolio",
  ref: "main",
  revision: "b".repeat(40),
  generatedAt: "2026-09-18T00:00:00Z",
  files,
  omitted: 0,
};
it("accepts fixed-repository manifests and rejects duplicate files or an arbitrary repository", () => {
  expect(RepositoryManifestSchema.safeParse(manifest).success).toBe(true);
  expect(
    RepositoryManifestSchema.safeParse({
      ...manifest,
      repository: "other/repo",
    }).success,
  ).toBe(false);
  expect(
    RepositoryManifestSchema.safeParse({
      ...manifest,
      files: [...files, files[0]],
    }).success,
  ).toBe(false);
});
it("never constructs a traversal or external asset request", () => {
  for (const path of ["../secret", "/absolute", "x/../secret", "x\\secret"])
    expect(safeSourcePath(path)).toBe(false);
  expect(
    SourceContentSchema.safeParse({ path: "../key", content: "x" }).success,
  ).toBe(false);
  expect(fileSourceUrl("apps/x/index.tsx", "b".repeat(40))).toBe(
    `https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/${"b".repeat(40)}/apps/x/index.tsx`,
  );
});
it("supports path and fuzzy file search, folder-first trees, and collapsed descendants", () => {
  expect(matchSourceFiles(files, "apps/x")[0].path).toBe("apps/x/index.tsx");
  expect(matchSourceFiles(files, "vsc")[0].path).toBe("apps/vscode/index.tsx");
  expect(
    visibleSourceTree(files, new Set()).map((entry) => entry.path),
  ).toEqual(["apps", "pages", "README.md"]);
  expect(
    visibleSourceTree(files, new Set(["apps", "apps/x"])).map(
      (entry) => entry.path,
    ),
  ).toContain("apps/x/index.tsx");
});
it("only permits hashed local X images and does not invent an empty archive", () => {
  const local = `/showcase/x-media/${"a".repeat(64)}.png`;
  expect(safeXImage(local)).toBe(local);
  for (const url of [
    "/showcase/x-media/../private.png",
    "/showcase/x-media/test.svg",
    "//evil.example/a.png",
  ])
    expect(safeXImage(url)).toBeUndefined();
  expect(
    readXSnapshot({
      version: 1,
      source: "https://x.com/AUnnippillil",
      feed: null,
    }),
  ).toBeNull();
});
