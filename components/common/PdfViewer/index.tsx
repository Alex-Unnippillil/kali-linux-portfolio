import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [thumbs, setThumbs] = useState<HTMLCanvasElement[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>([]);

  useEffect(() => {
    pdfjsLib.getDocument(url).promise.then(setPdf);
  }, [url]);

  useEffect(() => {
    if (!pdf) return;
    const render = async () => {
      const pg = await pdf.getPage(page);
      const viewport = pg.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await pg.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
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
        await pg.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
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
      const text = textContent.items.map((it: any) => it.str).join(' ');
      if (text.toLowerCase().includes(query.toLowerCase())) found.push(i);
    }
    setMatches(found);
    if (found[0]) setPage(found[0]);
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
        />
        <button onClick={search}>Search</button>
      </div>
      <canvas ref={canvasRef} data-testid="pdf-canvas" />
      <div className="flex gap-2 overflow-x-auto mt-2">
        {thumbs.map((t, i) => (
          <canvas
            key={i + 1}
            data-testid={`thumb-${i + 1}`}
            onClick={() => setPage(i + 1)}
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
