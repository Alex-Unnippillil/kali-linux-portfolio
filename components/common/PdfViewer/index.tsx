"use client";

import React, { useEffect, useRef, useState } from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import getIdleQueue from '@/utils/idleQueue';

type ProgressState = {
  state: 'idle' | 'running' | 'complete';
  completed: number;
  total: number;
};

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const pageTextIndexRef = useRef<string[]>([]);
  const mountedRef = useRef(true);
  const [thumbProgress, setThumbProgress] = useState<ProgressState>({
    state: 'idle',
    completed: 0,
    total: 0,
  });
  const [indexProgress, setIndexProgress] = useState<ProgressState>({
    state: 'idle',
    completed: 0,
    total: 0,
  });
  const [isIndexReady, setIsIndexReady] = useState(false);

  useRovingTabIndex(
    thumbListRef as React.RefObject<HTMLElement>,
    thumbs.length > 0,
    'horizontal',
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const queue = getIdleQueue();
    if (!queue) return;
    let lastBlocked = queue.getMetrics().blockedInputs;
    return queue.subscribe((metrics) => {
      if (metrics.blockedInputs > lastBlocked && process.env.NODE_ENV !== 'production') {
        console.debug('Idle queue paused for user input', metrics);
      }
      lastBlocked = metrics.blockedInputs;
    });
  }, []);

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
    if (!pdf) return;
    setPage(1);
    setThumbs([]);
    setMatches([]);
    setThumbProgress({ state: 'running', completed: 0, total: pdf.numPages });
    setIndexProgress({ state: 'running', completed: 0, total: pdf.numPages });
    setIsIndexReady(false);
    pageTextIndexRef.current = new Array(pdf.numPages).fill('');
  }, [pdf]);

  useEffect(() => {
    if (!pdf) return;
    const render = async () => {
      const pg = await pdf.getPage(page);
      const viewport = pg.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
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
    const queue = getIdleQueue();
    const totalPages = pdf.numPages;
    let currentPage = 1;

    const updateProgress = (completed: number, done: boolean) => {
      if (!mountedRef.current) return;
      setThumbProgress({
        state: done ? 'complete' : 'running',
        completed,
        total: totalPages,
      });
    };

    const fallback = async () => {
      let processed = 0;
      while (currentPage <= totalPages && !cancelled) {
        const pg = await pdf.getPage(currentPage);
        const viewport = pg.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await pg
          .render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
          .promise;
        processed += 1;
        if (mountedRef.current) {
          setThumbs((prev) => [...prev, canvas]);
        }
        currentPage += 1;
        updateProgress(processed, processed >= totalPages);
      }
    };

    if (!queue) {
      void fallback();
      return () => {
        cancelled = true;
      };
    }

    const handle = queue.enqueue({
      id: `pdf:${url}:thumbnails`,
      label: 'pdf-thumbnails',
      total: totalPages,
      run: async ({ shouldYield, signal }) => {
        let processed = 0;
        while (currentPage <= totalPages && !shouldYield()) {
          if (signal.aborted || cancelled) return { done: true, processed };
          const pgIndex = currentPage;
          currentPage += 1;
          const pg = await pdf.getPage(pgIndex);
          const viewport = pg.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await pg
            .render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
            .promise;
          if (signal.aborted || cancelled) return { done: true, processed };
          processed += 1;
          if (mountedRef.current) {
            setThumbs((prev) => [...prev, canvas]);
          }
        }

        const done = currentPage > totalPages;
        updateProgress(Math.min(totalPages, currentPage - 1), done);
        return { done, processed };
      },
      onProgress: ({ completed, total }) => {
        if (cancelled) return;
        updateProgress(Math.min(totalPages, completed), completed >= (total ?? totalPages));
      },
    });

    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [pdf, url]);

  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;
    const queue = getIdleQueue();
    const totalPages = pdf.numPages;
    let currentPage = 1;

    const updateProgress = (completed: number, done: boolean) => {
      if (!mountedRef.current) return;
      setIndexProgress({
        state: done ? 'complete' : 'running',
        completed,
        total: totalPages,
      });
      if (done) {
        setIsIndexReady(true);
      }
    };

    const fallback = async () => {
      let processed = 0;
      while (currentPage <= totalPages && !cancelled) {
        const pg = await pdf.getPage(currentPage);
        const textContent = await pg.getTextContent();
        if (cancelled) return;
        const text = (textContent.items as TextItem[])
          .map((it) => it.str)
          .join(' ');
        pageTextIndexRef.current[currentPage - 1] = text;
        processed += 1;
        updateProgress(processed, processed >= totalPages);
        currentPage += 1;
      }
    };

    if (!queue) {
      void fallback();
      return () => {
        cancelled = true;
      };
    }

    const handle = queue.enqueue({
      id: `pdf:${url}:index`,
      label: 'pdf-indexer',
      total: totalPages,
      run: async ({ shouldYield, signal }) => {
        let processed = 0;
        while (currentPage <= totalPages && !shouldYield()) {
          if (signal.aborted || cancelled) return { done: true, processed };
          const pgIndex = currentPage;
          currentPage += 1;
          const pg = await pdf.getPage(pgIndex);
          const textContent = await pg.getTextContent();
          if (signal.aborted || cancelled) return { done: true, processed };
          const text = (textContent.items as TextItem[])
            .map((it) => it.str)
            .join(' ');
          pageTextIndexRef.current[pgIndex - 1] = text;
          processed += 1;
        }

        const done = currentPage > totalPages;
        updateProgress(Math.min(totalPages, currentPage - 1), done);
      return { done, processed };
      },
      onProgress: ({ completed, total }) => {
        if (cancelled) return;
        updateProgress(Math.min(totalPages, completed), completed >= (total ?? totalPages));
      },
    });

    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [pdf, url]);

  const search = async () => {
    if (!pdf) return;
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      setMatches([]);
      return;
    }

    const totalPages = pdf.numPages;
    const found: number[] = [];
    const textCache = pageTextIndexRef.current;

    const hasCompleteIndex =
      isIndexReady && textCache.length === totalPages && textCache.every((value) => Boolean(value));

    if (hasCompleteIndex) {
      textCache.forEach((text, idx) => {
        if (text && text.toLowerCase().includes(normalized)) {
          found.push(idx + 1);
        }
      });
    } else {
      let completed = textCache.filter((value) => value).length;
      for (let i = 1; i <= totalPages; i++) {
        let text = textCache[i - 1];
        if (!text) {
          const pg = await pdf.getPage(i);
          const textContent = await pg.getTextContent();
          text = (textContent.items as TextItem[])
            .map((it) => it.str)
            .join(' ');
          pageTextIndexRef.current[i - 1] = text;
          completed += 1;
          setIndexProgress({
            state: completed >= totalPages ? 'complete' : 'running',
            completed,
            total: totalPages,
          });
          if (completed >= totalPages) {
            setIsIndexReady(true);
          }
        }
        if (text.toLowerCase().includes(normalized)) {
          found.push(i);
        }
      }
    }

    setMatches(found);
    if (found[0]) setPage(found[0]);
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <label htmlFor="pdf-search" className="sr-only">
          Search document text
        </label>
        <input
          id="pdf-search"
          aria-label="Search document text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
        />
        <button
          onClick={() => {
            void search();
          }}
        >
          Search
        </button>
      </div>
      {(thumbProgress.state === 'running' || thumbProgress.state === 'complete') && (
        <p aria-live="polite" className="text-xs text-slate-400">
          Thumbnails {thumbProgress.completed}/{thumbProgress.total}
        </p>
      )}
      {(indexProgress.state === 'running' || indexProgress.state === 'complete') && (
        <p aria-live="polite" className="text-xs text-slate-400">
          Indexing {indexProgress.completed}/{indexProgress.total}
          {!isIndexReady && indexProgress.state === 'running' && ' (in progress)'}
        </p>
      )}
      <canvas
        ref={canvasRef}
        data-testid="pdf-canvas"
        aria-label="PDF page"
      />
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
              if (el) el.getContext('2d')?.drawImage(t, 0, 0);
            }}
            width={t.width}
            height={t.height}
            aria-label={`Page ${i + 1}`}
          />
        ))}
      </div>
      {matches.length > 0 && (
        <div data-testid="search-results">
          {matches.map((m) => (
            <div key={m}>Page {m}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
