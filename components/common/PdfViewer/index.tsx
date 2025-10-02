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

type ThumbMeta = {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
};

type ThumbMetaWithPosition = ThumbMeta & { top: number };

const THUMB_WIDTH = 120;
const THUMB_GAP = 12;

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const thumbCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbMeta, setThumbMeta] = useState<ThumbMeta[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
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
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 768px)');
    const updateFromQuery = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in event ? event.matches : event.currentTarget?.matches;
      if (matches === undefined) return;
      setIsSidebarOpen(!matches);
    };

    updateFromQuery(query);
    const handler = (event: MediaQueryListEvent) => updateFromQuery(event);
    query.addEventListener('change', handler);
    return () => {
      query.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    thumbCacheRef.current.clear();
  }, [pdf]);

  useEffect(() => {
    if (!pdf) return;
    const render = async () => {
      const pg = await pdf.getPage(page);
      const viewport = pg.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await pg
        .render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
        .promise;
    };
    render();
  }, [pdf, page]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const loadThumbMeta = async () => {
      const meta: ThumbMeta[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const viewport = pg.getViewport({ scale: 1 });
        const scale = THUMB_WIDTH / viewport.width;
        meta.push({
          pageNumber: i,
          width: Math.round(viewport.width * scale),
          height: Math.round(viewport.height * scale),
          scale,
        });
      }
      if (!cancelled) setThumbMeta(meta);
    };
    loadThumbMeta();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    const node = thumbListRef.current;
    if (!node || !isSidebarOpen) return;
    const handleScroll = () => setScrollTop(node.scrollTop);
    handleScroll();
    setContainerHeight(node.clientHeight);

    node.addEventListener('scroll', handleScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setContainerHeight(entry.contentRect.height);
      });
      resizeObserver.observe(node);
    }

    return () => {
      node.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [isSidebarOpen]);

  const thumbPositions = useMemo<ThumbMetaWithPosition[]>(() => {
    let offset = 0;
    return thumbMeta.map((meta) => {
      const item = {
        ...meta,
        top: offset,
      };
      offset += meta.height + THUMB_GAP;
      return item;
    });
  }, [thumbMeta]);

  const totalThumbHeight = useMemo(() => {
    if (thumbPositions.length === 0) return 0;
    const last = thumbPositions[thumbPositions.length - 1];
    return last.top + last.height;
  }, [thumbPositions]);

  const visibleThumbs = useMemo<ThumbMetaWithPosition[]>(() => {
    if (thumbPositions.length === 0) return [];
    if (!isSidebarOpen) return [];
    if (containerHeight === 0) {
      return thumbPositions.slice(0, Math.min(thumbPositions.length, 12));
    }
    const viewBottom = scrollTop + containerHeight;
    let start = 0;
    while (
      start < thumbPositions.length &&
      thumbPositions[start].top + thumbPositions[start].height < scrollTop
    ) {
      start += 1;
    }
    let end = start;
    while (end < thumbPositions.length && thumbPositions[end].top < viewBottom) {
      end += 1;
    }
    const overscan = 2;
    start = Math.max(0, start - overscan);
    end = Math.min(thumbPositions.length, end + overscan);
    return thumbPositions.slice(start, end);
  }, [thumbPositions, containerHeight, scrollTop, isSidebarOpen]);

  const rovingKey = useMemo(
    () => visibleThumbs.map((item) => item.pageNumber).join('-'),
    [visibleThumbs]
  );

  useRovingTabIndex(
    thumbListRef as React.RefObject<HTMLElement>,
    isSidebarOpen && visibleThumbs.length > 0,
    'vertical',
    rovingKey
  );

  const renderThumbnail = useCallback(
    async (pageNumber: number, scale: number) => {
      if (!pdf) return null;
      const cache = thumbCacheRef.current;
      if (cache.has(pageNumber)) return cache.get(pageNumber)!;
      const pg = await pdf.getPage(pageNumber);
      const viewport = pg.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      await pg
        .render({ canvasContext: context, viewport, canvas })
        .promise;
      cache.set(pageNumber, canvas);
      return canvas;
    },
    [pdf]
  );

  const handleThumbCanvasRef = useCallback(
    (meta: ThumbMeta) =>
      (canvas: HTMLCanvasElement | null) => {
        if (!canvas) return;
        canvas.width = meta.width;
        canvas.height = meta.height;
        renderThumbnail(meta.pageNumber, meta.scale).then((source) => {
          if (!source) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, meta.width, meta.height);
          ctx.drawImage(source, 0, 0, meta.width, meta.height);
        });
      },
    [renderThumbnail]
  );

  useEffect(() => {
    const node = thumbListRef.current;
    if (!node || !isSidebarOpen) return;
    const active = thumbPositions.find((item) => item.pageNumber === page);
    if (!active) return;
    const top = active.top;
    const bottom = active.top + active.height;
    if (top < node.scrollTop) {
      node.scrollTop = top;
    } else if (bottom > node.scrollTop + node.clientHeight) {
      node.scrollTop = bottom - node.clientHeight;
    }
  }, [page, thumbPositions, isSidebarOpen]);

  const search = async () => {
    if (!pdf) return;
    const found: number[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i);
      const textContent = await pg.getTextContent();
      const text = (textContent.items as TextItem[])
        .map((it) => it.str)
        .join(' ');
      if (text.toLowerCase().includes(query.toLowerCase())) found.push(i);
    }
    setMatches(found);
    if (found[0]) setPage(found[0]);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="pdf-search">
          Search document
        </label>
        <input
          id="pdf-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search document"
          className="min-w-[200px] flex-1 rounded border border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-sky-400 focus:outline-none"
        />
        <button
          onClick={search}
          type="button"
          className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Search
        </button>
        <button
          type="button"
          className="ml-auto rounded border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
          aria-controls="pdf-thumbnail-sidebar"
        >
          {isSidebarOpen ? 'Hide thumbnails' : 'Show thumbnails'}
        </button>
      </div>
      <div className="flex min-h-[400px] flex-1 overflow-hidden rounded-lg border border-slate-700 bg-black/30">
        <aside
          id="pdf-thumbnail-sidebar"
          className={`relative flex h-full flex-col border-r border-slate-700 bg-slate-900/60 transition-[width,opacity] duration-200 ${
            isSidebarOpen ? 'w-48 sm:w-56 opacity-100' : 'w-0 opacity-0'
          }`}
          aria-hidden={!isSidebarOpen}
        >
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
            <span>Pages</span>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={thumbListRef}
              role="listbox"
              aria-label="Document pages"
              aria-orientation="vertical"
              className="h-full overflow-y-auto focus:outline-none"
              tabIndex={-1}
            >
              <div
                style={{ height: totalThumbHeight, position: 'relative' }}
                className="pr-2"
              >
                {visibleThumbs.map((thumb) => (
                  <div
                    key={thumb.pageNumber}
                    style={{ position: 'absolute', top: thumb.top, left: 0, right: 0 }}
                    className="px-2"
                  >
                    <button
                      type="button"
                      role="option"
                      tabIndex={page === thumb.pageNumber ? 0 : -1}
                      aria-selected={page === thumb.pageNumber}
                      data-testid={`thumb-${thumb.pageNumber}`}
                      onClick={() => setPage(thumb.pageNumber)}
                      onFocus={() => setPage(thumb.pageNumber)}
                      className={`group flex w-full flex-col items-center gap-2 rounded-md border px-2 py-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                        page === thumb.pageNumber
                          ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                          : 'border-transparent bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      <canvas
                        ref={handleThumbCanvasRef(thumb)}
                        width={thumb.width}
                        height={thumb.height}
                        className="w-full rounded shadow-sm"
                        aria-hidden="true"
                      />
                      <span className="w-full text-center text-[11px] uppercase tracking-wide text-slate-300">
                        Page {thumb.pageNumber}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
        <div className="relative flex flex-1 justify-center overflow-auto bg-slate-950/70 p-4">
          <canvas
            ref={canvasRef}
            data-testid="pdf-canvas"
            className="max-h-full w-auto max-w-full"
            role="img"
            aria-label={`Page ${page} preview`}
          />
        </div>
      </div>
      {matches.length > 0 && (
        <div data-testid="search-results" className="space-y-1 text-sm text-slate-100">
          {matches.map((m) => (
            <div key={m}>Page {m}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
