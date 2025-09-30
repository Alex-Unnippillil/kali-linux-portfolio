"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

interface HelpSection {
  id: string;
  title: string;
  html: string;
}

const createSlug = (title: string, counts: Map<string, number>) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "section";
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};

const sanitizeHtml = (value: string) => DOMPurify.sanitize(value);

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState("<p>Loading…</p>");
  const [sections, setSections] = useState<HelpSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) return;
    const path = docPath || `/docs/apps/${appId}.md`;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error("Failed to load help content");
        }
        const markdown = await response.text();
        if (!markdown) {
          throw new Error("No help available");
        }

        const tokens = marked.lexer(markdown);
        const counts = new Map<string, number>();
        const createTokensList = () =>
          Object.assign([] as marked.TokensList, { links: tokens.links });
        const summaryTokens = createTokensList();
        const collectedSections: HelpSection[] = [];
        let currentSection:
          | {
              id: string;
              title: string;
              tokens: marked.TokensList;
            }
          | null = null;

        tokens.forEach((token) => {
          if (token.type === "heading" && token.depth <= 3) {
            if (currentSection) {
              const html = sanitizeHtml(marked.parser(currentSection.tokens));
              collectedSections.push({
                id: currentSection.id,
                title: currentSection.title,
                html,
              });
            }

            const id = createSlug(token.text, counts);
            currentSection = {
              id,
              title: token.text,
              tokens: createTokensList(),
            };
          } else if (!currentSection) {
            summaryTokens.push(token);
          } else {
            currentSection.tokens.push(token);
          }
        });

        if (currentSection) {
          const html = sanitizeHtml(marked.parser(currentSection.tokens));
          collectedSections.push({
            id: currentSection.id,
            title: currentSection.title,
            html,
          });
        }

        if (!cancelled) {
          const summary = summaryTokens.length
            ? sanitizeHtml(marked.parser(summaryTokens))
            : "<p>Select a section below to learn more.</p>";
          setSummaryHtml(summary);
          setSections(collectedSections);
          setError(null);
          setOpenSections([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "No help available.");
          setSummaryHtml("<p>No help available.</p>");
          setSections([]);
          setOpenSections([]);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, appId, docPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!focusTarget) return;
    if (!openSections.includes(focusTarget)) return;
    const node = contentRefs.current[focusTarget];
    node?.focus();
    setFocusTarget(null);
  }, [focusTarget, openSections]);

  useEffect(() => {
    if (open) return;
    setOpenSections([]);
    setFocusTarget(null);
  }, [open]);

  const togglePanel = () => setOpen((o) => !o);

  const toggleSection = useCallback(
    (id: string) => {
      setOpenSections((prev) => {
        const isOpen = prev.includes(id);
        if (isOpen) {
          return prev.filter((sectionId) => sectionId !== id);
        }

        const next = isMobile ? [id] : [...prev, id];
        return next;
      });
      setFocusTarget(id);
    },
    [isMobile]
  );

  const registerContentRef = useCallback((id: string) => {
    return (node: HTMLDivElement | null) => {
      contentRefs.current[id] = node;
    };
  }, []);

  const summarySection = useMemo(() => {
    if (error) {
      return <p className="text-sm text-red-600">{error}</p>;
    }
    return (
      <div
        className="prose prose-sm max-w-none text-gray-200"
        dangerouslySetInnerHTML={{ __html: summaryHtml }}
      />
    );
  }, [error, summaryHtml]);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={togglePanel}
        className="fixed top-2 right-2 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white shadow focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4"
          onClick={togglePanel}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-panel-title"
            className="h-full w-full max-w-md overflow-y-auto rounded-lg bg-slate-900 p-4 text-gray-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="help-panel-title" className="text-lg font-semibold text-white">
                Help &amp; Tips
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={togglePanel}
                className="rounded-md bg-slate-700 px-3 py-1 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus:ring"
              >
                Close
              </button>
            </div>
            <section aria-label="Summary" className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                Summary
              </h3>
              {summarySection}
            </section>
            <div className="space-y-3" aria-live="polite">
              {sections.length === 0 && !error ? (
                <p className="text-sm text-slate-300">Additional guidance will appear here when available.</p>
              ) : (
                sections.map((section) => {
                  const isOpen = openSections.includes(section.id);
                  return (
                    <section key={section.id} className="rounded-md border border-slate-700 bg-slate-800">
                      <h3>
                        <button
                          type="button"
                          id={`help-accordion-trigger-${section.id}`}
                          aria-expanded={isOpen}
                          aria-controls={`help-accordion-panel-${section.id}`}
                          onClick={() => toggleSection(section.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-t-md px-4 py-3 text-left text-sm font-medium text-white focus:outline-none focus:ring"
                        >
                          <span>{section.title}</span>
                          <span aria-hidden="true" className="text-xs">
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                      </h3>
                      <div
                        id={`help-accordion-panel-${section.id}`}
                        role="region"
                        aria-labelledby={`help-accordion-trigger-${section.id}`}
                        hidden={!isOpen}
                        ref={registerContentRef(section.id)}
                        tabIndex={-1}
                        className="border-t border-slate-700 px-4 py-3 text-sm text-slate-200"
                      >
                        <div
                          className="prose prose-sm max-w-none text-slate-200"
                          dangerouslySetInnerHTML={{ __html: section.html }}
                        />
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
