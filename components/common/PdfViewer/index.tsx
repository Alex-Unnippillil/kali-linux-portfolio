"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import Annot from './Annot';

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const thumbListRef = useRef<HTMLDivElement | null>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);

  const pageCount = pdf?.numPages ?? 0;

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
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const context = canvas.getContext('2d');
      if (!context) return;
      await pg.render({ canvasContext: context, viewport, canvas }).promise;
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
        const context = canvas.getContext('2d');
        if (!context) continue;
        await pg.render({ canvasContext: context, viewport, canvas }).promise;
        arr.push(canvas);
      }
      setThumbs(arr);
    };
    loadThumbs();
  }, [pdf]);

  useEffect(() => {
    if (!thumbs.length) return;
    const container = thumbListRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-testid="thumb-${page}"]`,
    );
    target?.focus();
  }, [page, thumbs.length]);

  useEffect(() => {
    const container = thumbListRef.current;
    if (!container) return;
    const handleFocus = (event: FocusEvent) => {
      const element = event.target as HTMLElement | null;
      if (!element) return;
      const value = element.getAttribute('data-page-number');
      if (!value) return;
      const next = Number(value);
      if (Number.isNaN(next) || next === page) return;
      setPage(next);
    };
    container.addEventListener('focusin', handleFocus);
    return () => {
      container.removeEventListener('focusin', handleFocus);
    };
  }, [page]);

  useEffect(() => {
    if (!pdf) return;
    if (page < 1) {
      setPage(1);
      return;
    }
    if (page > pdf.numPages) {
      setPage(pdf.numPages);
    }
  }, [page, pdf]);

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

  const handleJumpToPage = useCallback(
    (target: number) => {
      if (!pageCount) return;
      const next = Math.min(pageCount, Math.max(1, target));
      setPage(next);
    },
    [pageCount],
  );

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="flex-1 min-w-0">
        <div className="mb-2 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-full rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            aria-label="Search document"
          />
          <button
            onClick={search}
            className="rounded border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-100 transition hover:border-sky-500"
          >
            Search
          </button>
        </div>
        <div
          ref={pageContainerRef}
          className="relative inline-block rounded-lg border border-slate-700/60 bg-slate-950/40"
        >
          <canvas
            ref={canvasRef}
            data-testid="pdf-canvas"
            className="block max-w-full"
            role="img"
            aria-label="Current PDF page"
          />
        </div>
        <div
          className="mt-2 flex gap-2 overflow-x-auto"
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
              data-testid={`thumb-${index + 1}`}
              data-page-number={index + 1}
              onClick={() => setPage(index + 1)}
              onFocus={() => setPage(index + 1)}
              onKeyDown={(event) => {
                if (!pageCount) return;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  const nextIndex = (index + 1) % pageCount;
                  setPage(nextIndex + 1);
                } else if (
                  event.key === 'ArrowLeft' ||
                  event.key === 'ArrowUp'
                ) {
                  event.preventDefault();
                  const nextIndex = (index - 1 + pageCount) % pageCount;
                  setPage(nextIndex + 1);
                }
              }}
              ref={(element) => {
                if (element) element.getContext('2d')?.drawImage(thumb, 0, 0);
              }}
              width={thumb.width}
              height={thumb.height}
              className="h-auto w-20 cursor-pointer rounded border border-transparent transition hover:border-sky-500 focus:border-sky-500"
              aria-label={`Page ${index + 1} thumbnail`}
            />
            ))}
        </div>
        {matches.length > 0 && (
          <div
            data-testid="search-results"
            className="mt-2 space-y-1 text-sm text-slate-200"
          >
            {matches.map((match) => (
              <button
                key={match}
                type="button"
                className="block w-full rounded border border-slate-700 bg-slate-900/60 px-2 py-1 text-left transition hover:border-sky-500"
                onClick={() => setPage(match)}
              >
                Page {match}
              </button>
            ))}
          </div>
        )}
      </div>
      <Annot
        documentId={url}
        page={page}
        pageCount={pageCount}
        containerRef={pageContainerRef}
        onJumpToPage={handleJumpToPage}
      />
    </div>
  );
};

export default PdfViewer;
