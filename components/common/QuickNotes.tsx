"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { marked } from "marked";
import DOMPurify from "dompurify";
import useKeymap from "../../apps/settings/keymapRegistry";
import {
  exportNotesAsJson,
  exportNotesAsMarkdown,
  getNoteForRoute,
  saveNoteForRoute,
  searchQuickNotes,
  type QuickNote,
} from "../../utils/quickNotesStore";

const AUTOSAVE_DELAY = 800;

const formatEvent = (event: KeyboardEvent) => {
  const parts = [
    event.ctrlKey ? "Ctrl" : "",
    event.metaKey ? "Meta" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
    event.key.length === 1 ? event.key.toUpperCase() : event.key,
  ];
  return parts.filter(Boolean).join("+");
};

const normalizeShortcut = (shortcut: string) =>
  shortcut
    .split("+")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      segment.length === 1 ? segment.toUpperCase() : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join("+");

const sanitizeHtml = (markdown: string) => {
  if (!markdown) return "";
  const rendered = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(rendered);
};

const formatTimestamp = (timestamp: number | null) => {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const getCleanRoute = (path?: string) => {
  if (!path) return "/";
  const [withoutHash] = path.split("#");
  const [withoutQuery] = withoutHash.split("?");
  return withoutQuery || "/";
};

const snippetFromContent = (content: string, query: string) => {
  if (!content) return "(empty)";
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (!query) {
    return singleLine.length > 160 ? `${singleLine.slice(0, 157)}…` : singleLine;
  }
  const lower = singleLine.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) {
    return singleLine.length > 160 ? `${singleLine.slice(0, 157)}…` : singleLine;
  }
  const start = Math.max(0, index - 40);
  const end = Math.min(singleLine.length, index + query.length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < singleLine.length ? "…" : "";
  return `${prefix}${singleLine.slice(start, end)}${suffix}`;
};

const downloadFile = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const QuickNotes: React.FC = () => {
  const router = useRouter();
  const { shortcuts } = useKeymap();
  const toggleShortcut =
    shortcuts.find((shortcut) => shortcut.description === "Toggle quick notes")?.keys || "Ctrl+Shift+N";

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<QuickNote[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [routeLabel, setRouteLabel] = useState("/");

  const skipAutosave = useRef(true);

  const isRouterReady = router?.isReady ?? true;
  const activeRoute = isRouterReady ? getCleanRoute(router?.asPath) : "/";

  useEffect(() => {
    const normalizedShortcut = normalizeShortcut(toggleShortcut);
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }
      if (normalizeShortcut(formatEvent(event)) === normalizedShortcut) {
        event.preventDefault();
        setOpen((previous) => !previous);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleShortcut, open]);

  useEffect(() => {
    if (!isRouterReady) return;
    let cancelled = false;
    const nextRoute = activeRoute;
    setStatus("loading");
    setRouteLabel(nextRoute);
    (async () => {
      try {
        const note = await getNoteForRoute(nextRoute);
        if (cancelled) return;
        const nextContent = note?.content ?? "";
        setContent(nextContent);
        setSavedContent(nextContent);
        setLastSavedAt(note?.updatedAt ?? null);
        setStatus(note ? "saved" : "idle");
        skipAutosave.current = true;
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRouterReady, activeRoute]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await searchQuickNotes(searchTerm);
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchTerm, lastSavedAt]);

  useEffect(() => {
    if (!isRouterReady) return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (content === savedContent) return;
    setStatus("saving");
    const handle = window.setTimeout(() => {
      saveNoteForRoute(activeRoute, content)
        .then((record) => {
          setSavedContent(content);
          setLastSavedAt(record?.updatedAt ?? Date.now());
          setStatus("saved");
        })
        .catch(() => {
          setStatus("error");
        });
    }, AUTOSAVE_DELAY);
    return () => {
      window.clearTimeout(handle);
    };
  }, [content, activeRoute, savedContent, isRouterReady]);

  const previewHtml = useMemo(() => sanitizeHtml(content), [content]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "saving":
        return "Saving…";
      case "saved":
        return lastSavedAt ? `Saved ${formatTimestamp(lastSavedAt)}` : "Saved";
      case "error":
        return "Save failed";
      case "loading":
        return "Loading…";
      default:
        return "";
    }
  }, [status, lastSavedAt]);

  const handleExportMarkdown = useCallback(async () => {
    const markdown = await exportNotesAsMarkdown();
    downloadFile(markdown, "quick-notes.md", "text/markdown");
  }, []);

  const handleExportJson = useCallback(async () => {
    const json = await exportNotesAsJson();
    downloadFile(json, "quick-notes.json", "application/json");
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((previous) => !previous);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  }, []);

  const currentRouteMatchesQuery = searchTerm.trim().length > 0
    ? searchResults.some((note) => note.route === activeRoute)
    : false;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          id="quick-notes-panel"
          className="w-[min(100vw-2rem,28rem)] overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 text-sm text-white shadow-2xl backdrop-blur"
        >
          <header className="flex flex-col gap-2 border-b border-white/10 bg-slate-900/80 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Quick Notes</h2>
              <div className="flex items-center gap-2 text-xs text-white/70">
                {statusLabel && <span aria-live="polite">{statusLabel}</span>}
                <button
                  type="button"
                  onClick={handleToggle}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
              <span className="font-mono text-white/80">{routeLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="rounded border border-white/10 px-2 py-1 transition hover:border-white/30 hover:bg-white/10"
                >
                  Export .md
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="rounded border border-white/10 px-2 py-1 transition hover:border-white/30 hover:bg-white/10"
                >
                  Export .json
                </button>
              </div>
            </div>
          </header>
          <div className="flex h-72 flex-col divide-y divide-white/10">
            <div className="flex flex-1 flex-col gap-2 p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60" htmlFor="quick-notes-editor">
                Markdown note
              </label>
              <textarea
                id="quick-notes-editor"
                aria-label="Quick notes markdown editor"
                className="h-32 w-full resize-none rounded border border-white/10 bg-black/40 p-2 font-mono text-sm text-white/90 outline-none focus:border-cyan-400"
                value={content}
                onChange={handleContentChange}
                placeholder="Write markdown notes scoped to this route…"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Preview</p>
                <div
                  className="mt-2 h-24 overflow-auto rounded border border-white/10 bg-black/30 p-2 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60" htmlFor="quick-notes-search">
                Search notes
              </label>
              <input
                id="quick-notes-search"
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by route or content…"
                className="w-full rounded border border-white/10 bg-black/30 p-2 text-sm text-white/90 outline-none focus:border-cyan-400"
              />
              <ul className="max-h-28 space-y-2 overflow-auto">
                {searchResults.length === 0 && searchTerm.trim() && (
                  <li className="text-xs text-white/50">No notes found</li>
                )}
                {searchResults.map((note) => (
                  <li key={note.route} className="rounded border border-white/5 bg-white/5 p-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-white/70">
                      <span className="font-mono text-white/90">{note.route}</span>
                      <span>{formatTimestamp(note.updatedAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/70">{snippetFromContent(note.content, searchTerm)}</p>
                    {note.route !== activeRoute && (
                      <a
                        href={note.route}
                        className="mt-1 inline-flex text-xs text-cyan-300 underline"
                      >
                        Open route
                      </a>
                    )}
                    {note.route === activeRoute && currentRouteMatchesQuery && (
                      <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-green-300">Current route</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
        aria-expanded={open}
        aria-controls="quick-notes-panel"
      >
        Quick Notes
      </button>
    </div>
  );
};

export default QuickNotes;

