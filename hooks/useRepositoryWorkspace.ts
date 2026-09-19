"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  REPOSITORY_ASSETS,
  RepositoryManifestSchema,
  SourceContentSchema,
  type RepositoryManifest,
  type SourceFile,
} from "../utils/repository-workspace";

type Document = { original: string; value: string };
async function readJson(
  response: Response,
  maxBytes: number,
): Promise<unknown> {
  if (!response.ok) throw new Error("The bundled source could not be loaded.");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes)
    throw new Error("The source response exceeded its size limit.");
  const body = await response.text();
  if (body.length > maxBytes)
    throw new Error("The source response exceeded its size limit.");
  return JSON.parse(body);
}

/** Requests only build-generated assets on this origin; visitors never contact GitHub or StackBlitz. */
export default function useRepositoryWorkspace(initialPath = "README.md") {
  const [manifest, setManifest] = useState<RepositoryManifest | null>(null);
  const [activePath, setActivePath] = useState(initialPath);
  const [tabs, setTabs] = useState<string[]>([initialPath]);
  const [documents, setDocuments] = useState<Record<string, Document>>({});
  const [issue, setIssue] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setIssue(null);
    setBusy(true);
    void (async () => {
      try {
        const response = await fetch(`${REPOSITORY_ASSETS}/index.json`, {
          signal: controller.signal,
          credentials: "same-origin",
          cache: "no-cache",
        });
        const parsed = RepositoryManifestSchema.parse(
          await readJson(response, 1_500_000),
        );
        if (controller.signal.aborted) return;
        setManifest(parsed);
        const first = parsed.files.some((file) => file.path === initialPath)
          ? initialPath
          : "README.md";
        setActivePath(first);
        setTabs([first]);
      } catch {
        if (!cancelled)
          setIssue(
            "The repository snapshot could not be loaded. Please retry.",
          );
        if (!cancelled) setBusy(false);
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [initialPath, attempt]);

  useEffect(() => {
    if (!manifest) return;
    const file = manifest.files.find((entry) => entry.path === activePath);
    setIssue(null);
    if (!file || documentsRef.current[activePath]) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    void (async () => {
      try {
        const response = await fetch(
          `${REPOSITORY_ASSETS}/files/${file.asset}.json`,
          { signal: controller.signal, credentials: "same-origin" },
        );
        const result = SourceContentSchema.parse(
          await readJson(response, 1_600_000),
        );
        if (result.path !== file.path)
          throw new Error("Source identity mismatch");
        if (!cancelled && !controller.signal.aborted)
          setDocuments((current) => ({
            ...current,
            [file.path]: { original: result.content, value: result.content },
          }));
      } catch {
        if (!cancelled)
          setIssue(
            "This file could not be loaded. Your other open files and edits are unchanged.",
          );
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [activePath, manifest]);

  const openFile = useCallback(
    (file: SourceFile | string) => {
      const path = typeof file === "string" ? file : file.path;
      if (!manifest?.files.some((entry) => entry.path === path)) return;
      setTabs((current) =>
        current.includes(path) ? current : [...current, path],
      );
      setActivePath(path);
    },
    [manifest],
  );
  const closeFile = (path: string) => {
    const remaining = tabs.filter((tab) => tab !== path);
    setTabs(remaining);
    if (activePath === path)
      setActivePath(
        remaining[Math.min(tabs.indexOf(path), remaining.length - 1)] || "",
      );
    // Keep session edits even when their tab closes. The Changes panel can reopen them.
  };
  const edit = useCallback((path: string, value: string) => {
    setDocuments((current) =>
      current[path]
        ? { ...current, [path]: { ...current[path], value } }
        : current,
    );
  }, []);
  const retry = () => {
    if (manifest) setManifest({ ...manifest });
    else setAttempt((value) => value + 1);
  };
  return {
    manifest,
    activePath,
    tabs,
    documents,
    issue,
    busy,
    openFile,
    closeFile,
    edit,
    retry,
  };
}
