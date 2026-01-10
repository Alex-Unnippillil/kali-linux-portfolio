"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type {
  RenderTask,
  TextItem,
} from 'pdfjs-dist/types/src/display/api';

interface PdfViewerProps {
  url: string;
}

interface PageMetric {
  pageNumber: number;
  height: number;
  width: number;
  top: number;
  bottom: number;
}

const PAGE_SCALE = 1.5;
const PAGE_GAP = 16;
const PREFETCH_BUFFER = 1;

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement | null>());
  const renderTasksRef = useRef(new Map<number, RenderTask>());
  const renderedPagesRef = useRef(new Set<number>());
  const prefetchedFirstPageRef = useRef<PDFPageProxy | null>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [metrics, setMetrics] = useState<PageMetric[]>([]);
  const [documentHeight, setDocumentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>(
    { start: 0, end: -1 },
  );
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const loadedPdf = await pdfjsLib.getDocument(url).promise;
        if (!cancelled) {
          setPdf(loadedPdf);
        } else {
          await loadedPdf.destroy();
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(
    () => () => {
      prefetchedFirstPageRef.current?.cleanup();
      prefetchedFirstPageRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!pdf) return undefined;
    let mounted = true;
    (async () => {
      try {
        const firstPage = await pdf.getPage(1);
        if (!mounted) {
          firstPage.cleanup();
          return;
        }
        const viewport = firstPage.getViewport({ scale: PAGE_SCALE });
        let offset = 0;
        const prepared: PageMetric[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const bottom = offset + viewport.height;
          prepared.push({
            pageNumber: i,
            height: viewport.height,
            width: viewport.width,
            top: offset,
            bottom,
          });
          offset = bottom + PAGE_GAP;
        }
        setMetrics(prepared);
        setDocumentHeight(Math.max(offset - PAGE_GAP, viewport.height));
        prefetchedFirstPageRef.current = firstPage;
      } catch (error) {
        console.error('Error preparing PDF metrics:', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pdf]);

  useEffect(() => {
    if (!pdf) return () => undefined;
    return () => {
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();
      renderedPagesRef.current.clear();
      canvasRefs.current.forEach((canvas) => {
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 0;
        canvas.height = 0;
      });
      canvasRefs.current.clear();
      void pdf.destroy();
    };
  }, [pdf]);

  const updateViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const height = container.clientHeight || window.innerHeight || 0;
    setViewportHeight(height);
    setScrollTop(container.scrollTop);
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, [updateViewport]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setScrollTop(container.scrollTop);
  }, []);

  useEffect(() => {
    if (!metrics.length || viewportHeight === 0) return;
    const top = scrollTop;
    const bottom = top + viewportHeight;
    let startIndex = metrics.findIndex((metric) => metric.bottom > top);
    if (startIndex === -1) startIndex = metrics.length - 1;
    let endIndex = startIndex;
    while (endIndex + 1 < metrics.length && metrics[endIndex].bottom < bottom) {
      endIndex += 1;
    }
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [metrics, scrollTop, viewportHeight]);

  const pagesToRender = useMemo(() => {
    if (!metrics.length) {
      return [];
    }
    const { start, end } = visibleRange;
    if (end < start || start < 0) return [];
    const visible = metrics.slice(start, end + 1).map((metric) => metric.pageNumber);
    const pageSet = new Set<number>(visible);
    for (let i = 1; i <= PREFETCH_BUFFER; i++) {
      const before = metrics[start - i];
      const after = metrics[end + i];
      if (before) pageSet.add(before.pageNumber);
      if (after) pageSet.add(after.pageNumber);
    }
    const ordered = Array.from(pageSet).sort((a, b) => a - b);
    return ordered;
  }, [metrics, visibleRange]);

  const releasePage = useCallback((pageNumber: number) => {
    renderedPagesRef.current.delete(pageNumber);
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
    canvasRefs.current.delete(pageNumber);
  }, []);

  useEffect(() => {
    const required = new Set(pagesToRender);
    renderTasksRef.current.forEach((task, pageNumber) => {
      if (!required.has(pageNumber)) {
        task.cancel();
        renderTasksRef.current.delete(pageNumber);
      }
    });
    renderedPagesRef.current.forEach((pageNumber) => {
      if (!required.has(pageNumber)) {
        releasePage(pageNumber);
      }
    });
  }, [pagesToRender, releasePage]);

  const renderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement) => {
      if (!pdf) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      let page: PDFPageProxy | null = null;
      try {
        if (pageNumber === 1 && prefetchedFirstPageRef.current) {
          page = prefetchedFirstPageRef.current;
          prefetchedFirstPageRef.current = null;
        } else {
          page = await pdf.getPage(pageNumber);
        }
        const viewport = page.getViewport({ scale: PAGE_SCALE });
        if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
        }
        const task = page.render({ canvasContext: context, viewport });
        renderTasksRef.current.set(pageNumber, task);
        try {
          await task.promise;
          renderedPagesRef.current.add(pageNumber);
        } catch (error) {
          const err = error as Error;
          if (err?.name !== 'RenderingCancelledException') {
            console.error('Error rendering page:', error);
          }
        } finally {
          renderTasksRef.current.delete(pageNumber);
          page.cleanup();
        }
      } catch (error) {
        console.error('Error preparing page render:', error);
      }
    },
    [pdf],
  );

  const scheduleRender = useCallback(
    (pageNumber: number) => {
      if (!pdf) return;
      const canvas = canvasRefs.current.get(pageNumber);
      if (!canvas) return;
      if (renderTasksRef.current.has(pageNumber)) return;
      if (renderedPagesRef.current.has(pageNumber) && canvas.width > 0) return;
      void renderPage(pageNumber, canvas);
    },
    [pdf, renderPage],
  );

  useEffect(() => {
    if (!pdf) return;
    pagesToRender.forEach((pageNumber) => {
      scheduleRender(pageNumber);
    });
  }, [pagesToRender, pdf, scheduleRender]);

  const registerCanvas = useCallback(
    (pageNumber: number) => (node: HTMLCanvasElement | null) => {
      const current = canvasRefs.current.get(pageNumber) ?? null;
      if (current === node) return;
      if (!node) {
        return;
      }
      canvasRefs.current.set(pageNumber, node);
      scheduleRender(pageNumber);
    },
    [scheduleRender],
  );

  const totalHeight = useMemo(() => documentHeight, [documentHeight]);

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      const container = containerRef.current;
      if (!container) return;
      const metric = metrics.find((item) => item.pageNumber === pageNumber);
      if (!metric) return;
      container.scrollTo({ top: metric.top, behavior: 'smooth' });
    },
    [metrics],
  );

  const search = useCallback(async () => {
    if (!pdf) return;
    const lower = query.trim().toLowerCase();
    if (!lower) {
      setMatches([]);
      return;
    }
    const found: number[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const pg = await pdf.getPage(i);
        const textContent = await pg.getTextContent();
        const text = (textContent.items as TextItem[])
          .map((item) => item.str)
          .join(' ');
        if (text.toLowerCase().includes(lower)) {
          found.push(i);
        }
        pg.cleanup();
      } catch (error) {
        console.error('Error searching PDF:', error);
      }
    }
    setMatches(found);
    if (found.length > 0) {
      scrollToPage(found[0]);
    }
  }, [pdf, query, scrollToPage]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="flex-1 min-w-[160px] rounded border border-neutral-500 bg-neutral-900 px-2 py-1 text-sm text-white"
        />
        <button
          type="button"
          onClick={search}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Search
        </button>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="pdf-scroll-container"
        className="relative w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-950"
        style={{ maxHeight: '70vh', scrollBehavior: 'smooth' }}
      >
        <div style={{ position: 'relative', height: totalHeight }}>
          {pagesToRender.map((pageNumber) => {
            const metric = metrics.find((item) => item.pageNumber === pageNumber);
            if (!metric) return null;
            return (
              <div
                key={pageNumber}
                style={{
                  position: 'absolute',
                  top: metric.top,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: metric.width,
                  height: metric.height,
                }}
              >
                <canvas
                  ref={registerCanvas(pageNumber)}
                  data-testid={`page-canvas-${pageNumber}`}
                  className="h-full w-full shadow-md"
                />
              </div>
            );
          })}
        </div>
      </div>
      {matches.length > 0 && (
        <div
          data-testid="search-results"
          className="flex flex-wrap gap-2 text-sm text-white"
        >
          {matches.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => scrollToPage(pageNumber)}
              className="rounded border border-blue-500 px-2 py-1 hover:bg-blue-600/30"
            >
              Page {pageNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
