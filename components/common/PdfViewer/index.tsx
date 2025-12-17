"use client";

import React, { useEffect, useRef, useState, startTransition } from 'react';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import {
  renderThumbnail,
  disposeThumbnailer,
  type ThumbnailResult,
} from '../../../modules/thumbnailer/image';

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<ThumbnailResult[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);
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
      const arr: ThumbnailResult[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const viewport = pg.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await pg.render({ canvasContext: ctx, viewport, canvas }).promise;

        if (typeof createImageBitmap === 'function') {
          try {
            const bitmap = await createImageBitmap(canvas);
            const thumbnail = await renderThumbnail(bitmap, canvas.width, canvas.height);
            arr.push(thumbnail);
          } catch (error) {
            console.warn('Falling back to inline thumbnail rendering', error);
            arr.push({
              width: canvas.width,
              height: canvas.height,
              imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
              mode: 'fallback',
            });
          }
        } else {
          arr.push({
            width: canvas.width,
            height: canvas.height,
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            mode: 'fallback',
          });
        }

        canvas.width = 0;
        canvas.height = 0;
      }

      setThumbs(prev => {
        prev.forEach(thumb => {
          if (thumb.bitmap && typeof thumb.bitmap.close === 'function') {
            try {
              thumb.bitmap.close();
            } catch {
              // ignore bitmap release errors
            }
          }
        });
        return arr;
      });
    };
    loadThumbs();
  }, [pdf]);

  useEffect(() => () => {
    thumbs.forEach(thumb => {
      if (thumb.bitmap && typeof thumb.bitmap.close === 'function') {
        try {
          thumb.bitmap.close();
        } catch {
          // ignore cleanup errors
        }
      }
    });
  }, [thumbs]);

  useEffect(() => () => {
    disposeThumbnailer();
  }, []);

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
    if (found[0]) {
      startTransition(() => setPage(found[0]!));
    }
  };

  const focusPage = (index: number) => {
    if (page === index) return;
    startTransition(() => setPage(index));
  };

  return (
    <div>
        <div className="flex gap-2 mb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search document"
          />
          <button onClick={search} aria-label="Run search">
            Search
          </button>
        </div>
        <canvas
          ref={canvasRef}
          data-testid="pdf-canvas"
          aria-label={`PDF page ${page}`}
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
              aria-label={`Page thumbnail ${i + 1}`}
              data-testid={`thumb-${i + 1}`}
              onClick={() => focusPage(i + 1)}
              onFocus={() => focusPage(i + 1)}
            ref={(el) => {
              if (!el) return;
              el.width = t.width;
              el.height = t.height;
              const ctx = el.getContext('2d');
              if (!ctx) return;
              ctx.clearRect(0, 0, el.width, el.height);
              if (t.bitmap) {
                ctx.drawImage(t.bitmap, 0, 0, el.width, el.height);
              } else if (t.imageData) {
                ctx.putImageData(t.imageData, 0, 0);
              }
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
