"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const thumbListRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pageDescription, setPageDescription] = useState('Loading document…');

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
    if (!pdf) {
      setPageDescription('Loading document…');
      return;
    }
    setPageDescription(`Page ${page} of ${pdf.numPages}`);
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

  const resetSequence = useCallback(() => {
    sequenceRef.current = [];
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 80 : -80;
        container.scrollBy({ top: delta, behavior: 'smooth' });
        resetSequence();
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        if (event.shiftKey) {
          event.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          resetSequence();
          return;
        }

        sequenceRef.current.push('g');
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = setTimeout(() => {
          sequenceRef.current = [];
          sequenceTimeoutRef.current = null;
        }, 600);

        if (sequenceRef.current.length === 2) {
          event.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          resetSequence();
        }
        return;
      }

      if (event.key !== 'Shift') {
        resetSequence();
      }
    },
    [resetSequence],
  );

  useEffect(
    () => () => {
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search document text"
        />
        <button onClick={search}>Search</button>
        <button
          type="button"
          onClick={() => scrollContainerRef.current?.focus()}
          className="rounded border px-2 py-1 focus:outline-none focus-visible:ring"
        >
          Focus document
        </button>
      </div>
      <div className="sr-only" aria-live="polite" id="pdf-page-description">
        {pageDescription}
      </div>
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        role="document"
        aria-roledescription="PDF viewer"
        aria-label={
          pdf
            ? `Document viewer showing page ${page} of ${pdf.numPages}`
            : 'Document viewer loading'
        }
        aria-describedby="pdf-page-description"
        className="max-h-[70vh] overflow-auto focus:outline-none focus-visible:ring"
        onKeyDown={handleKeyDown}
      >
        <canvas
          ref={canvasRef}
          data-testid="pdf-canvas"
          role="img"
          aria-label={
            pdf
              ? `Page ${page} of ${pdf.numPages}`
              : 'Document canvas loading'
          }
        />
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
            aria-label={`Go to page ${i + 1}`}
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
