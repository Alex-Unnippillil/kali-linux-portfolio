"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { marked } from "marked";

import { trackEvent } from "@/lib/analytics-client";
import usePersistentState from "@/hooks/usePersistentState";
import type { AppDocConfig } from "@/types/app-docs";

interface DocsSidecarProps {
  appId: string;
  doc: AppDocConfig;
  children: ReactNode;
}

interface DocPayload {
  id: string;
  title: string;
  summary?: string;
  markdown: string;
}

type DocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; title: string; summary?: string; html: string };

const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";

function sanitizeMarkdown(markdown: string) {
  const rendered = marked.parse(markdown) as string;
  return DOMPurify.sanitize(rendered);
}

export default function DocsSidecar({ appId, doc, children }: DocsSidecarProps) {
  const docId = doc.docId ?? appId;
  const [persistedOpen, setPersistedOpen] = usePersistentState<boolean>(
    `docs-sidecar:${docId}`,
    () => doc.defaultOpen ?? false,
    (value): value is boolean => typeof value === "boolean",
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [docState, setDocState] = useState<DocState>({ status: "idle" });
  const hasTrackedView = useRef(false);

  const isOpen = isCompact ? overlayOpen : persistedOpen;
  const panelId = useMemo(() => `docs-sidecar-panel-${docId}`, [docId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
    const updateMatches = (matches: boolean) => {
      setIsCompact(matches);
    };

    updateMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => updateMatches(event.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }

    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, []);

  useEffect(() => {
    if (!isCompact) {
      setOverlayOpen(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (!isOpen) return;
    if (docState.status === "ready") return;

    let isCancelled = false;
    const controller = new AbortController();
    setDocState((prev) => (prev.status === "loading" ? prev : { status: "loading" }));

    fetch(`/api/docs/${encodeURIComponent(docId)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load docs: ${response.status}`);
        }
        return response.json() as Promise<DocPayload>;
      })
      .then((payload) => {
        if (isCancelled) return;
        const html = sanitizeMarkdown(payload.markdown);
        setDocState({
          status: "ready",
          title: payload.title,
          summary: payload.summary ?? doc.summary,
          html,
        });
        if (!hasTrackedView.current) {
          trackEvent("docs_sidecar_view", {
            appId,
            docId,
          });
          hasTrackedView.current = true;
        }
      })
      .catch((error) => {
        if (isCancelled || error.name === "AbortError") return;
        console.error("DocsSidecar failed to load content", error);
        setDocState({ status: "error" });
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [appId, doc.summary, docId, docState.status, isOpen]);

  const toggle = useCallback(() => {
    if (isCompact) {
      setOverlayOpen((value) => !value);
    } else {
      setPersistedOpen((value) => !value);
    }
  }, [isCompact, setPersistedOpen]);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
  }, []);

  const retry = useCallback(() => {
    setDocState({ status: "idle" });
  }, []);

  const headerTitle = docState.status === "ready" ? docState.title : doc.title;
  const headerSummary = docState.status === "ready" ? docState.summary : doc.summary;

  const panel = (
    <aside
      key={panelId}
      id={panelId}
      role="complementary"
      aria-label={`${headerTitle} documentation`}
      className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-900/80 text-white backdrop-blur"
    >
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Docs</p>
            <h2 className="truncate text-base font-semibold leading-tight">{headerTitle}</h2>
            {headerSummary ? (
              <p className="mt-1 text-xs text-slate-200/80">{headerSummary}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={toggle}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring"
          >
            Hide
          </button>
        </div>
      </header>
      <div className="docs-sidecar-content flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
        {docState.status === "loading" && (
          <p className="text-slate-200/80">Loading documentation…</p>
        )}
        {docState.status === "error" && (
          <div className="space-y-3">
            <p className="text-red-200">Unable to load documentation right now.</p>
            <button
              type="button"
              onClick={retry}
              className="rounded border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring"
            >
              Retry
            </button>
          </div>
        )}
        {docState.status === "ready" && (
          <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: docState.html }} />
        )}
        {docState.status === "idle" && (
          <p className="text-slate-200/80">Select “Show Docs” to load guidance for this app.</p>
        )}
      </div>
    </aside>
  );

  return (
    <div className="relative flex h-full min-h-0">
      <div
        className={clsx(
          "relative flex min-h-0 flex-1 flex-col",
          !isCompact && persistedOpen ? "md:pr-80 lg:pr-96" : "",
        )}
      >
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="pointer-events-auto rounded border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring"
          >
            {isOpen ? "Hide Docs" : "Show Docs"}
          </button>
        </div>
        <div className="h-full w-full overflow-y-auto">{children}</div>
      </div>
      {!isCompact && persistedOpen ? (
        <div className="hidden h-full flex-col md:flex">{panel}</div>
      ) : null}
      {isCompact && isOpen ? (
        <div className="absolute inset-0 z-40 flex bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            className="flex-1"
            aria-label="Close documentation overlay"
            onClick={closeOverlay}
          />
          <div className="w-full max-w-md">{panel}</div>
        </div>
      ) : null}
    </div>
  );
}
