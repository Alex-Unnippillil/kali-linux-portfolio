"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

interface PdfViewerProps {
  url: string;
}

interface MatchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SearchMatch {
  index: number;
  page: number;
  rect: MatchRect;
}

const PAGE_SCALE = 1.5;
const THUMBNAIL_SCALE = 0.2;

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [lastSearch, setLastSearch] = useState('');
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pdfjsRef = useRef<typeof import('pdfjs-dist')>();
  const searchInFlight = useRef(0);

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
        if (!mounted) return;
        pdfjsRef.current = pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const loadedPdf = await pdfjsLib.getDocument(url).promise;
        if (mounted) setPdf(loadedPdf);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [url]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const render = async () => {
      const pg = await pdf.getPage(page);
      if (cancelled) return;
      const viewport = pg.getViewport({ scale: PAGE_SCALE });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) return;
      await pg.render({ canvasContext: context, viewport }).promise;
      if (cancelled) return;
      const highlightCanvas = highlightCanvasRef.current;
      if (highlightCanvas) {
        highlightCanvas.width = viewport.width;
        highlightCanvas.height = viewport.height;
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const loadThumbs = async () => {
      const arr: HTMLCanvasElement[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        if (cancelled) return;
        const viewport = pg.getViewport({ scale: THUMBNAIL_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) continue;
        await pg.render({ canvasContext: context, viewport }).promise;
        if (cancelled) return;
        arr.push(canvas);
      }
      if (!cancelled) {
        setThumbs(arr);
      }
    };
    loadThumbs();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    const highlightCanvas = highlightCanvasRef.current;
    const baseCanvas = canvasRef.current;
    if (!highlightCanvas || !baseCanvas) return;
    highlightCanvas.width = baseCanvas.width;
    highlightCanvas.height = baseCanvas.height;
    const context = highlightCanvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
    const pageMatches = matches.filter((match) => match.page === page);
    pageMatches.forEach((match) => {
      const { x, y, width, height } = match.rect;
      const adjustedHeight = Math.max(height, 4);
      const adjustedWidth = Math.max(width, 4);
      const topLeftY = highlightCanvas.height - (y + adjustedHeight);
      context.fillStyle =
        match.index === activeMatchIndex
          ? 'rgba(59, 130, 246, 0.5)'
          : 'rgba(59, 130, 246, 0.25)';
      context.fillRect(x, topLeftY, adjustedWidth, adjustedHeight);
      if (typeof context.strokeRect === 'function') {
        context.strokeStyle =
          match.index === activeMatchIndex
            ? 'rgba(37, 99, 235, 0.9)'
            : 'rgba(59, 130, 246, 0.6)';
        context.lineWidth = match.index === activeMatchIndex ? 2 : 1;
        context.strokeRect(x, topLeftY, adjustedWidth, adjustedHeight);
      }
    });
  }, [matches, page, activeMatchIndex]);

  useEffect(() => {
    if (!matches.length || activeMatchIndex === -1) return;
    const activeMatch = matches[activeMatchIndex];
    if (activeMatch?.page === page) return;
    const firstOnPage = matches.findIndex((match) => match.page === page);
    if (firstOnPage !== -1 && firstOnPage !== activeMatchIndex) {
      setActiveMatchIndex(firstOnPage);
    }
  }, [page, matches, activeMatchIndex]);

  useEffect(() => {
    const container = thumbListRef.current;
    const activeThumb = thumbRefs.current[page - 1];
    if (!container || !activeThumb || typeof activeThumb.scrollIntoView !== 'function') {
      return;
    }
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [page]);

  const search = useCallback(async (): Promise<void> => {
    if (!pdf) return;
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      setMatches([]);
      setActiveMatchIndex(-1);
      setLastSearch('');
      return;
    }
    const requestId = ++searchInFlight.current;
    const found: SearchMatch[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pageProxy = await pdf.getPage(i);
      const viewport = pageProxy.getViewport({ scale: PAGE_SCALE });
      const textContent = await pageProxy.getTextContent();
      (textContent.items as TextItem[]).forEach((item) => {
        if (!item?.str) return;
        if (!item.transform) return;
        if (item.str.toLowerCase().includes(normalized)) {
          const transform = pdfjsRef.current?.Util?.transform
            ? pdfjsRef.current.Util.transform(viewport.transform, item.transform)
            : item.transform;
          const width = Math.max(
            Math.abs(item.width ?? transform?.[0] ?? 0),
            4,
          );
          const height = Math.max(
            Math.abs((item as unknown as { height?: number }).height ?? transform?.[3] ?? 0),
            4,
          );
          const x = transform?.[4] ?? 0;
          const baselineY = transform?.[5] ?? 0;
          const y = baselineY - height;
          found.push({
            index: found.length,
            page: i,
            rect: { x, y, width, height },
          });
        }
      });
    }
    if (searchInFlight.current !== requestId) {
      return;
    }
    setMatches(found);
    if (found.length > 0) {
      setActiveMatchIndex(0);
      setPage(found[0].page);
    } else {
      setActiveMatchIndex(-1);
    }
    setLastSearch(query);
  }, [pdf, query]);

  const goToMatch = useCallback(
    (index: number) => {
      if (!matches.length) return;
      const normalizedIndex = ((index % matches.length) + matches.length) % matches.length;
      const match = matches[normalizedIndex];
      setActiveMatchIndex(normalizedIndex);
      setPage(match.page);
    },
    [matches],
  );

  const goToNextMatch = useCallback(() => {
    if (!matches.length) return;
    if (activeMatchIndex === -1) {
      goToMatch(0);
      return;
    }
    goToMatch(activeMatchIndex + 1);
  }, [matches, activeMatchIndex, goToMatch]);

  const goToPreviousMatch = useCallback(() => {
    if (!matches.length) return;
    if (activeMatchIndex === -1) {
      goToMatch(matches.length - 1);
      return;
    }
    goToMatch(activeMatchIndex - 1);
  }, [matches, activeMatchIndex, goToMatch]);

  const handleQueryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (!query.trim()) {
        void search();
        return;
      }
      if (matches.length > 0 && query === lastSearch) {
        if (event.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
        return;
      }
      void search();
    },
    [goToNextMatch, goToPreviousMatch, lastSearch, matches.length, query, search],
  );

  const matchSummary = useMemo(() => {
    if (!matches.length || activeMatchIndex === -1) return '';
    return `Match ${activeMatchIndex + 1} of ${matches.length}`;
  }, [matches, activeMatchIndex]);

  const hasMatches = matches.length > 0;
  thumbRefs.current.length = thumbs.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleQueryKeyDown}
          placeholder="Search"
          aria-label="Search document"
          className="w-full max-w-xs rounded border border-slate-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={() => {
            void search();
          }}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          Search
        </button>
        {hasMatches && matchSummary && (
          <div
            className="flex items-center gap-2 text-sm text-slate-200"
            data-testid="search-navigation"
          >
            <button
              type="button"
              onClick={goToPreviousMatch}
              className="rounded border border-slate-500 px-2 py-1 transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Previous
            </button>
            <span>{matchSummary}</span>
            <button
              type="button"
              onClick={goToNextMatch}
              className="rounded border border-slate-500 px-2 py-1 transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <div className="relative w-full overflow-hidden rounded border border-slate-700 bg-black">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Document page ${page}`}
          data-testid="pdf-canvas"
          className="block max-w-full"
        />
        <canvas
          ref={highlightCanvasRef}
          data-testid="pdf-highlight-layer"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block"
        />
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        role="listbox"
        aria-orientation="horizontal"
        ref={thumbListRef}
      >
        {thumbs.map((thumb, index) => (
          <canvas
            key={index + 1}
            role="option"
            tabIndex={page === index + 1 ? 0 : -1}
            aria-selected={page === index + 1}
            aria-label={`Thumbnail of page ${index + 1}`}
            data-testid={`thumb-${index + 1}`}
            data-active={page === index + 1}
            onClick={() => setPage(index + 1)}
            onFocus={() => setPage(index + 1)}
            ref={(el) => {
              thumbRefs.current[index] = el;
              if (el) {
                const context = el.getContext('2d');
                if (context) {
                  context.clearRect(0, 0, el.width, el.height);
                  context.drawImage(thumb, 0, 0, el.width, el.height);
                }
              }
            }}
            width={thumb.width}
            height={thumb.height}
            className={`rounded border ${
              page === index + 1
                ? 'border-sky-500 ring-2 ring-sky-400'
                : 'border-transparent'
            }`}
          />
        ))}
      </div>
      {hasMatches && (
        <ol
          className="space-y-1 text-sm text-slate-200"
          data-testid="search-results"
          aria-label="Search results"
        >
          {matches.map((match) => (
            <li key={`${match.page}-${match.index}`} data-testid="search-result-item">
              <button
                type="button"
                onClick={() => goToMatch(match.index)}
                className={`w-full rounded border px-2 py-1 text-left transition ${
                  activeMatchIndex === match.index
                    ? 'border-sky-400 bg-sky-900/40'
                    : 'border-slate-600 bg-slate-800/60 hover:border-sky-400'
                }`}
              >
                Match {match.index + 1}: Page {match.page}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default PdfViewer;
