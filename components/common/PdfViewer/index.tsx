"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);

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
    const loadThumbs = async () => {
      const arr: HTMLCanvasElement[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const viewport = pg.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await pg
          .render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
          .promise;

        arr.push(canvas);
      }
      setThumbs(arr);
    };
    loadThumbs();
  }, [pdf]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (!pdf) return;
      setPage((prev) => {
        const target = Math.min(Math.max(nextPage, 1), pdf.numPages);
        return prev === target ? prev : target;
      });
    },
    [pdf],
  );

  const handleNextPage = useCallback(() => {
    if (!pdf) return;
    goToPage(page + 1);
  }, [goToPage, page, pdf]);

  const handlePreviousPage = useCallback(() => {
    if (!pdf) return;
    goToPage(page - 1);
  }, [goToPage, page, pdf]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const search = useCallback(async () => {
    if (!pdf) return;
    if (!normalizedQuery) {
      setMatches([]);
      setStatusMessage('Enter a term to search the document.');
      return;
    }
    setIsSearching(true);
    setStatusMessage(`Searching for "${normalizedQuery}"…`);
    try {
      const found: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const textContent = await pg.getTextContent();
        const text = (textContent.items as TextItem[])
          .map((it) => it.str)
          .join(' ');
        if (text.toLowerCase().includes(normalizedQuery.toLowerCase())) found.push(i);
      }
      setMatches(found);
      if (found[0]) goToPage(found[0]);
      setStatusMessage(
        found.length
          ? `Found ${found.length} match${found.length === 1 ? '' : 'es'} on page${
              found.length === 1 ? '' : 's'
            } ${found.join(', ')}.`
          : `No matches for "${normalizedQuery}".`,
      );
    } finally {
      setIsSearching(false);
    }
  }, [goToPage, normalizedQuery, pdf]);

  useEffect(() => {
    if (!pdf) return;
    setPage((prev) => Math.min(Math.max(prev, 1), pdf.numPages));
  }, [pdf]);

  const handleShortcutKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextPage();
      } else if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousPage();
      } else if (event.altKey && event.key === 'Enter') {
        event.preventDefault();
        search();
      }
    },
    [handleNextPage, handlePreviousPage, search],
  );

  const shortcutHelpId = 'pdf-viewer-shortcuts';

  return (
    <div
      ref={viewerRef}
      role="region"
      aria-label="PDF viewer"
      aria-describedby={shortcutHelpId}
      tabIndex={0}
      className="focus:outline-none"
      onKeyDown={handleShortcutKey}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2" role="toolbar" aria-label="PDF controls">
        <button
          type="button"
          onClick={handlePreviousPage}
          disabled={!pdf || page <= 1}
          aria-label="Go to previous page (Alt + ArrowLeft)"
          title="Alt + ArrowLeft"
          className="rounded border border-slate-500 px-2 py-1 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleNextPage}
          disabled={!pdf || (pdf && page >= pdf.numPages)}
          aria-label="Go to next page (Alt + ArrowRight)"
          title="Alt + ArrowRight"
          className="rounded border border-slate-500 px-2 py-1 text-sm disabled:opacity-50"
        >
          Next
        </button>
        <span aria-live="polite" className="text-sm text-slate-400">
          Page {page}
          {pdf ? ` of ${pdf.numPages}` : ''}
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          onKeyDown={(event) => {
            if (event.altKey && event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }}
          aria-label="Search text"
          className="rounded border border-slate-500 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={search}
          aria-label="Search document (Alt + Enter)"
          title="Alt + Enter"
          className="rounded border border-slate-500 px-2 py-1 text-sm"
          disabled={!pdf || isSearching}
        >
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Page ${page} preview`}
        data-testid="pdf-canvas"
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
            aria-label={`Page ${i + 1}`}
            data-testid={`thumb-${i + 1}`}
            onClick={() => setPage(i + 1)}
            onFocus={() => setPage(i + 1)}
            ref={(el) => {
              if (el) el.getContext('2d')?.drawImage(t, 0, 0);
            }}
            width={t.width}
            height={t.height}
          />
        ))}
      </div>
      <div id={shortcutHelpId} className="mt-2 text-xs text-slate-400">
        Shortcuts: Alt + ArrowLeft (previous page), Alt + ArrowRight (next page), Alt + Enter (search from the field).
      </div>
      <div
        className="mt-2"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="search-status"
      >
        <span className="sr-only">Search status:</span>
        <span>{statusMessage}</span>
      </div>
      {matches.length > 0 && (
        <div data-testid="search-results" aria-label="Search results">
          {matches.map((m) => (
            <div key={m}>Page {m}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
