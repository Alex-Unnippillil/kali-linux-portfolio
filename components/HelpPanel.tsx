"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

interface SearchMatch {
  id: string;
  snippet: string;
}

interface HighlightResult {
  highlightedHtml: string;
  matches: SearchMatch[];
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ESCAPE_HTML_REGEX = /[&<>"]|'/g;

const escapeRegExp = (value: string) => value.replace(/[-/\^$*+?.()|[\]{}]/g, "\$&");

const escapeHtml = (value: string) =>
  value.replace(ESCAPE_HTML_REGEX, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

const createSnippet = (text: string, start: number, match: string) => {
  const radius = 40;
  const matchLength = match.length;
  const snippetStart = Math.max(0, start - radius);
  const snippetEnd = Math.min(text.length, start + matchLength + radius);
  const prefix = text.slice(snippetStart, start);
  const suffix = text.slice(start + matchLength, snippetEnd);
  const leadingEllipsis = snippetStart > 0 ? "…" : "";
  const trailingEllipsis = snippetEnd < text.length ? "…" : "";

  return `${leadingEllipsis}${escapeHtml(prefix)}<mark class="bg-yellow-200 text-black">${escapeHtml(
    match
  )}</mark>${escapeHtml(suffix)}${trailingEllipsis}`;
};

const highlightContent = (
  html: string,
  query: string,
  idPrefix: string
): HighlightResult => {
  if (typeof document === "undefined") {
    return { highlightedHtml: html, matches: [] };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { highlightedHtml: html, matches: [] };
  }

  const safePattern = escapeRegExp(trimmed);
  if (!safePattern) {
    return { highlightedHtml: html, matches: [] };
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  const matches: SearchMatch[] = [];
  let globalIndex = 0;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.nodeValue;
    if (!text) continue;

    const nodeRegex = new RegExp(safePattern, "gi");
    const nodeMatches = Array.from(text.matchAll(nodeRegex));
    if (!nodeMatches.length) continue;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    nodeMatches.forEach((matchResult) => {
      const matchIndex = matchResult.index ?? 0;
      const matchText = matchResult[0];
      if (matchIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
      }

      const mark = document.createElement("mark");
      mark.textContent = matchText;
      mark.dataset.matchIndex = `${globalIndex}`;
      mark.id = `${idPrefix}${globalIndex}`;
      mark.classList.add("bg-yellow-200", "text-black", "rounded", "px-0.5");
      fragment.appendChild(mark);

      matches.push({
        id: mark.id,
        snippet: createSnippet(text, matchIndex, matchText),
      });

      globalIndex += 1;
      lastIndex = matchIndex + matchText.length;
    });

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    const parent = node.parentNode;
    if (parent) {
      parent.replaceChild(fragment, node);
    }
  }

  return { highlightedHtml: container.innerHTML, matches };
};

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [rawHtml, setRawHtml] = useState("<p>Loading...</p>");
  const [renderedHtml, setRenderedHtml] = useState("<p>Loading...</p>");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingScrollRef = useRef(false);
  const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");

  useEffect(() => {
    if (!open) return;
    const path = docPath || `/docs/apps/${appId}.md`;
    fetch(path)
      .then((res) => (res.ok ? res.text() : ""))
      .then((md) => {
        if (!md) {
          setRawHtml("<p>No help available.</p>");
          setRenderedHtml("<p>No help available.</p>");
          return;
        }
        const rendered = DOMPurify.sanitize(marked.parse(md) as string);
        setRawHtml(rendered);
        setRenderedHtml(rendered);
      })
      .catch(() => {
        setRawHtml("<p>No help available.</p>");
        setRenderedHtml("<p>No help available.</p>");
      });
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

    const { highlightedHtml, matches: foundMatches } = highlightContent(
      rawHtml,
      query,
      `help-panel-${appId}-match-`
    );
    setRenderedHtml(highlightedHtml);
    setMatches(foundMatches);
    setActiveMatchIndex(foundMatches.length ? 0 : -1);
  }, [rawHtml, query, appId, open]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const focusTarget = searchInputRef.current;
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const previous = previousFocusRef.current as HTMLElement | null;
      if (previous) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (activeMatchIndex < 0) return;
    const button = resultRefs.current[activeMatchIndex];
    if (button) {
      button.focus({ preventScroll: true });
    }
  }, [activeMatchIndex, open, matches.length]);

  useEffect(() => {
    if (!open) return;
    if (!pendingScrollRef.current) return;
    const match = matches[activeMatchIndex];
    if (match) {
      const element = document.getElementById(match.id);
      if (element) {
        element.scrollIntoView({ behavior: scrollBehaviorRef.current, block: "center" });
      }
    }
    pendingScrollRef.current = false;
  }, [activeMatchIndex, matches, open]);

  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;
    const marks = content.querySelectorAll<HTMLElement>("mark[data-match-index]");
    marks.forEach((mark) => {
      if (Number(mark.dataset.matchIndex) === activeMatchIndex) {
        mark.classList.add("ring", "ring-yellow-500", "ring-offset-2");
      } else {
        mark.classList.remove("ring", "ring-yellow-500", "ring-offset-2");
      }
    });
  }, [activeMatchIndex, renderedHtml, open]);

  const activateMatch = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (index < 0 || index >= matches.length) return;
      pendingScrollRef.current = true;
      scrollBehaviorRef.current = behavior;
      setActiveMatchIndex(index);
    },
    [matches.length]
  );

  const toggle = () => setOpen((o) => !o);

  const handleResultKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % matches.length;
      activateMatch(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (index - 1 + matches.length) % matches.length;
      activateMatch(prev);
    } else if (event.key === "Home") {
      event.preventDefault();
      activateMatch(0);
    } else if (event.key === "End") {
      event.preventDefault();
      activateMatch(matches.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateMatch(index);
    }
  };

  const handleResultClick = (index: number) => {
    activateMatch(index);
  };

  if (resultRefs.current.length !== matches.length) {
    resultRefs.current = new Array(matches.length).fill(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4"
          onClick={toggle}
        >
          <div
            ref={panelRef}
            className="bg-white text-black p-4 rounded max-w-md w-full h-full overflow-hidden shadow-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`help-panel-${appId}-title`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={`help-panel-${appId}-title`} className="text-lg font-semibold">
                Help
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-600 hover:text-black focus:outline-none focus:ring rounded"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 overflow-hidden">
              <label className="flex flex-col text-sm text-gray-700">
                <span className="mb-1 font-medium">Search</span>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search this guide"
                  className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
                />
              </label>
              <div className="flex-1 min-h-0 flex gap-3">
                <div className="w-48 flex-shrink-0 overflow-auto border border-gray-200 rounded" aria-live="polite">
                  <p className="px-3 py-2 text-xs text-gray-600 border-b border-gray-200">
                    {matches.length ? `${matches.length} result${matches.length === 1 ? "" : "s"}` : "No results"}
                  </p>
                  <div className="flex flex-col" role="listbox" aria-label="Search results">
                    {matches.map((match, index) => (
                      <button
                        key={match.id}
                        ref={(el) => {
                          resultRefs.current[index] = el;
                        }}
                        type="button"
                        role="option"
                        tabIndex={index === activeMatchIndex ? 0 : -1}
                        aria-selected={index === activeMatchIndex}
                        onKeyDown={(event) => handleResultKeyDown(event, index)}
                        onClick={() => handleResultClick(index)}
                        className={`text-left px-3 py-2 text-xs border-b border-gray-200 focus:outline-none focus:ring ${
                          index === activeMatchIndex ? "bg-blue-100" : "bg-white"
                        }`}
                        dangerouslySetInnerHTML={{ __html: match.snippet }}
                      />
                    ))}
                  </div>
                </div>
                <div
                  ref={contentRef}
                  data-help-content
                  className="flex-1 overflow-auto pr-2"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

