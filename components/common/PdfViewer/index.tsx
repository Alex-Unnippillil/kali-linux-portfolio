"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

interface PdfViewerProps {
  url: string;
}

type ZoomMode = 'fit-width' | 'fit-page' | 'actual-size';

const ZOOM_LABELS: Record<ZoomMode, string> = {
  'fit-width': 'Fit to Width',
  'fit-page': 'Fit to Page',
  'actual-size': 'Actual Size',
};

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);
  const [resizeTick, setResizeTick] = useState(0);
  const storageKey = useMemo(() => `pdfViewerZoom:${url}`, [url]);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const thumbListRef = useRef<HTMLDivElement | null>(null);

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
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'fit-width' || stored === 'fit-page' || stored === 'actual-size') {
      setZoomMode(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, zoomMode);
  }, [storageKey, zoomMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setResizeTick((tick) => tick + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setResizeTick((tick) => tick + 1);
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf) return;
    const render = async () => {
      const pg = await pdf.getPage(page);
      const baseViewport = pg.getViewport({ scale: 1 });
      const containerWidth =
        canvasContainerRef.current?.clientWidth ??
        canvasRef.current?.parentElement?.clientWidth ??
        baseViewport.width;
      let availableHeight =
        canvasContainerRef.current?.clientHeight ?? baseViewport.height;
      if (typeof window !== 'undefined') {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (rect) {
          availableHeight = Math.max(
            availableHeight,
            window.innerHeight - rect.top - 24,
          );
        }
      }
      const widthScale =
        containerWidth > 0 ? containerWidth / baseViewport.width : 1;
      const heightScale =
        availableHeight > 0 ? availableHeight / baseViewport.height : widthScale;
      let scale = 1;
      switch (zoomMode) {
        case 'fit-width':
          scale = widthScale;
          break;
        case 'fit-page':
          scale = Math.min(widthScale, heightScale);
          break;
        case 'actual-size':
        default:
          scale = 1;
      }
      if (!Number.isFinite(scale) || scale <= 0) {
        scale = 1;
      }
      const viewport = pg.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      await pg
        .render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
        .promise;
    };
    render();
  }, [pdf, page, zoomMode, resizeTick]);

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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
        />
        <button onClick={search}>Search</button>
      </div>
      <div
        className="mb-2 flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Zoom controls"
      >
        {(Object.keys(ZOOM_LABELS) as ZoomMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setZoomMode(mode)}
            aria-pressed={zoomMode === mode}
            className={
              zoomMode === mode
                ? 'bg-blue-600 text-white px-2 py-1 rounded'
                : 'px-2 py-1 rounded border'
            }
          >
            {ZOOM_LABELS[mode]}
          </button>
        ))}
      </div>
      <div
        ref={canvasContainerRef}
        className="relative w-full flex-1 overflow-auto"
      >
        <canvas
          ref={canvasRef}
          data-testid="pdf-canvas"
          className="mx-auto block"
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
