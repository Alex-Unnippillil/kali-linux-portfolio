"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

interface PdfViewerProps {
  url: string;
}

interface PageEntry {
  items: TextItem[];
  viewport: ReturnType<PDFPageProxy['getViewport']>;
  scale: number;
}

interface SearchMatch {
  page: number;
  itemIndex: number;
  charIndex: number;
  length: number;
  snippet: string;
}

interface HighlightRect {
  matchIndex: number;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const SCALE = 1.5;

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textCacheRef = useRef<Map<number, PageEntry>>(new Map());
  const highlightRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const searchTokenRef = useRef(0);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<number>(-1);
  const [pageHighlights, setPageHighlights] = useState<HighlightRect[]>([]);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number}>(
    { width: 0, height: 0 },
  );
  const [searching, setSearching] = useState(false);

  useRovingTabIndex(
    thumbListRef as React.RefObject<HTMLElement>,
    thumbs.length > 0,
    'horizontal',
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const loadedPdf = await pdfjsLib.getDocument(url).promise;
        if (!mounted) return;
        textCacheRef.current.clear();
        setPdf(loadedPdf);
        setPage(1);
        setThumbs([]);
        setMatches([]);
        setActiveMatch(-1);
        setViewportSize({ width: 0, height: 0 });
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [url]);

  const ensurePageEntry = useCallback(
    async (pageNumber: number, pageProxy?: PDFPageProxy): Promise<PageEntry | null> => {
      if (!pdf) return null;
      const existing = textCacheRef.current.get(pageNumber);
      const pageRef = pageProxy ?? (await pdf.getPage(pageNumber));
      const viewport = pageRef.getViewport({ scale: SCALE });
      if (existing && existing.scale === SCALE) {
        existing.viewport = viewport;
        return existing;
      }
      const textContent = await pageRef.getTextContent();
      const items = (textContent.items.filter(
        (it): it is TextItem => typeof (it as TextItem).str === 'string',
      ) as TextItem[]);
      const entry: PageEntry = { items, viewport, scale: SCALE };
      textCacheRef.current.set(pageNumber, entry);
      return entry;
    },
    [pdf],
  );

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const arr: HTMLCanvasElement[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        if (cancelled) return;
        const viewport = pg.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await pg.render({ canvasContext: ctx, viewport, canvas }).promise;
        arr.push(canvas);
      }
      if (!cancelled) setThumbs(arr);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const pageProxy = await pdf.getPage(page);
      if (cancelled) return;
      const entry = await ensurePageEntry(page, pageProxy);
      if (!entry || cancelled) return;
      const viewport = entry.viewport;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setViewportSize({ width: viewport.width, height: viewport.height });
      await pageProxy.render({ canvasContext: context, viewport, canvas }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, page, ensurePageEntry]);

  const runSearch = useCallback(async () => {
    if (!pdf) return;
    const trimmed = query.trim();
    const token = ++searchTokenRef.current;
    if (!trimmed) {
      setMatches([]);
      setActiveMatch(-1);
      setSearching(false);
      return;
    }
    setSearching(true);
    const lower = trimmed.toLowerCase();
    const results: SearchMatch[] = [];
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const entry = await ensurePageEntry(i);
        if (!entry) continue;
        for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
          const item = entry.items[itemIndex];
          const text = item.str;
          if (!text) continue;
          const normalized = text.toLowerCase();
          let startIndex = 0;
          while (true) {
            const foundIndex = normalized.indexOf(lower, startIndex);
            if (foundIndex === -1) break;
            const snippetStart = Math.max(0, foundIndex - 20);
            const snippetEnd = Math.min(text.length, foundIndex + trimmed.length + 20);
            results.push({
              page: i,
              itemIndex,
              charIndex: foundIndex,
              length: trimmed.length,
              snippet: text.slice(snippetStart, snippetEnd),
            });
            startIndex = foundIndex + trimmed.length;
          }
        }
        if (searchTokenRef.current !== token) {
          return;
        }
      }
      if (searchTokenRef.current !== token) {
        return;
      }
      setMatches(results);
      if (results.length) {
        setActiveMatch(0);
        setPage(results[0].page);
      } else {
        setActiveMatch(-1);
      }
    } finally {
      if (searchTokenRef.current === token) {
        setSearching(false);
      }
    }
  }, [ensurePageEntry, pdf, query]);

  const goToNextMatch = useCallback(() => {
    if (!matches.length) return;
    setActiveMatch((prev) => {
      if (prev < 0 || prev >= matches.length - 1) return 0;
      return prev + 1;
    });
  }, [matches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (!matches.length) return;
    setActiveMatch((prev) => {
      if (prev <= 0) return matches.length - 1;
      return prev - 1;
    });
  }, [matches.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (event.key === 'F3') {
        if (!matches.length) return;
        event.preventDefault();
        if (event.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToNextMatch, goToPreviousMatch, matches.length]);

  useEffect(() => {
    if (activeMatch < 0 || activeMatch >= matches.length) return;
    const target = matches[activeMatch];
    if (target.page !== page) {
      setPage(target.page);
    }
  }, [activeMatch, matches, page]);

  useEffect(() => {
    if (!matches.length) {
      setPageHighlights([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const entry = await ensurePageEntry(page);
      if (!entry || cancelled) {
        setPageHighlights([]);
        return;
      }
      const { items, viewport } = entry;
      const highlights: HighlightRect[] = [];
      matches.forEach((match, index) => {
        if (match.page !== page) return;
        const item = items[match.itemIndex];
        if (!item) return;
        const textLength = item.str.length;
        if (!textLength) return;
        const startRatio = Math.min(1, Math.max(0, match.charIndex / textLength));
        const endRatio = Math.min(
          1,
          Math.max(startRatio, (match.charIndex + match.length) / textLength),
        );
        const startX = item.transform[4] + item.width * startRatio;
        const endX = item.transform[4] + item.width * endRatio;
        const itemHeight = item.height || Math.abs(item.transform[3]) || 0;
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
          startX,
          item.transform[5],
          endX,
          item.transform[5] + itemHeight,
        ]);
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        highlights.push({
          matchIndex: index,
          rect: { left, top, width, height },
        });
      });
      if (!cancelled) {
        setPageHighlights(highlights);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensurePageEntry, matches, page]);

  useEffect(() => {
    const el = highlightRefs.current.get(activeMatch);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [activeMatch, pageHighlights]);

  useEffect(() => {
    if (!matches.length) {
      if (activeMatch !== -1) setActiveMatch(-1);
      return;
    }
    if (activeMatch < 0) {
      setActiveMatch(0);
    } else if (activeMatch >= matches.length) {
      setActiveMatch(matches.length - 1);
    }
  }, [matches.length, activeMatch]);

  const pageSummary = useMemo(() => {
    const summary = new Map<number, { count: number; firstIndex: number }>();
    matches.forEach((match, index) => {
      const entry = summary.get(match.page);
      if (entry) {
        entry.count += 1;
      } else {
        summary.set(match.page, { count: 1, firstIndex: index });
      }
    });
    return Array.from(summary.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const matchedPages = useMemo(() => new Set(matches.map((m) => m.page)), [matches]);

  return (
    <div className="text-white">
      <form
        className="flex flex-wrap items-center gap-2 mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="px-2 py-1 text-black rounded"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-ub-orange text-black rounded"
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span>{matches.length ? `${activeMatch + 1} / ${matches.length}` : '0 / 0'}</span>
          <button
            type="button"
            onClick={goToPreviousMatch}
            disabled={!matches.length}
            className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goToNextMatch}
            disabled={!matches.length}
            className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </form>
      <div
        ref={viewerRef}
        className="relative border border-gray-700 bg-black/40 max-h-[70vh] overflow-auto"
      >
        <div
          style={{
            position: 'relative',
            width: viewportSize.width ? `${viewportSize.width}px` : undefined,
            height: viewportSize.height ? `${viewportSize.height}px` : undefined,
          }}
        >
          <canvas ref={canvasRef} data-testid="pdf-canvas" style={{ display: 'block' }} />
          <div className="absolute inset-0 pointer-events-none">
            {pageHighlights.map((highlight) => (
              <div
                key={highlight.matchIndex}
                ref={(el) => {
                  if (el) {
                    highlightRefs.current.set(highlight.matchIndex, el);
                  } else {
                    highlightRefs.current.delete(highlight.matchIndex);
                  }
                }}
                data-match-index={highlight.matchIndex}
                className="transition-colors"
                style={{
                  position: 'absolute',
                  left: `${highlight.rect.left}px`,
                  top: `${highlight.rect.top}px`,
                  width: `${highlight.rect.width}px`,
                  height: `${highlight.rect.height}px`,
                  backgroundColor:
                    highlight.matchIndex === activeMatch
                      ? 'rgba(251, 191, 36, 0.65)'
                      : 'rgba(59, 130, 246, 0.35)',
                  borderRadius: '4px',
                  boxShadow:
                    highlight.matchIndex === activeMatch
                      ? '0 0 0 2px rgba(251, 191, 36, 0.9)'
                      : '0 0 0 1px rgba(59, 130, 246, 0.4)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex gap-2 overflow-x-auto mt-2"
        role="listbox"
        aria-orientation="horizontal"
        ref={thumbListRef}
      >
        {thumbs.map((t, i) => (
          <canvas
            key={i + 1}
            role="option"
            tabIndex={page === i + 1 ? 0 : -1}
            aria-selected={page === i + 1}
            data-testid={`thumb-${i + 1}`}
            onClick={() => setPage(i + 1)}
            onFocus={() => {
              if (page !== i + 1) setPage(i + 1);
            }}
            ref={(el) => {
              if (el) {
                el.getContext('2d')?.drawImage(t, 0, 0);
              }
            }}
            width={t.width}
            height={t.height}
            style={{
              border:
                page === i + 1
                  ? '2px solid rgba(96, 165, 250, 0.9)'
                  : matchedPages.has(i + 1)
                    ? '2px solid rgba(251, 191, 36, 0.6)'
                    : '2px solid transparent',
            }}
          />
        ))}
      </div>
      {pageSummary.length > 0 && (
        <div className="mt-2 space-y-1" data-testid="search-results">
          {pageSummary.map(([pageNumber, info]) => (
            <button
              type="button"
              key={pageNumber}
              onClick={() => {
                setPage(pageNumber);
                setActiveMatch(info.firstIndex);
              }}
              className={`w-full text-left px-2 py-1 rounded ${
                page === pageNumber ? 'bg-gray-700' : 'bg-gray-800'
              } hover:bg-gray-700`}
            >
              Page {pageNumber} — {info.count} match{info.count === 1 ? '' : 'es'}
            </button>
          ))}
        </div>
      )}
      {!searching && query && matches.length === 0 && (
        <div className="mt-2 text-sm text-gray-300">No matches found.</div>
      )}
    </div>
  );
};

export default PdfViewer;
