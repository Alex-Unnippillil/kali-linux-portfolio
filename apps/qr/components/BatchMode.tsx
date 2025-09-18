import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';

const HEADER_SIGNALS = [
  'text',
  'value',
  'name',
  'filename',
  'label',
  'url',
  'payload',
  'data',
  'content',
  'code',
];

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export interface ParsedCsvRow {
  columns: Record<string, string>;
  rowNumber: number;
  text: string;
}

export interface BatchResult {
  filename: string;
  png: string;
  svg: string;
  rowNumber: number;
  columns: Record<string, string>;
}

const splitCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(current.trim());
    current = '';
  };

  const pushRow = () => {
    if (row.length > 0 || current.trim()) {
      pushCell();
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      pushRow();
      continue;
    }

    if (!inQuotes && char === ',') {
      pushCell();
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    pushCell();
    rows.push(row);
  }

  return rows.filter((cols) => cols.some((cell) => cell.trim() !== ''));
};

export const parseCsvRows = (input: string): ParsedCsvRow[] => {
  const matrix = splitCsv(input);
  if (!matrix.length) return [];

  const headerCandidates = matrix[0].map((cell, index) => cell.trim() || `column${index + 1}`);
  const hasHeaderSignals = headerCandidates.some((cell) =>
    HEADER_SIGNALS.some((signal) => cell.toLowerCase().includes(signal)),
  );

  const headers = hasHeaderSignals
    ? headerCandidates
    : headerCandidates.map((_, index) => `column${index + 1}`);
  const dataRows = hasHeaderSignals ? matrix.slice(1) : matrix;

  return dataRows
    .map((cells, rowIndex) => {
      const columns: Record<string, string> = {};
      headers.forEach((header, colIndex) => {
        columns[header] = cells[colIndex]?.trim() ?? '';
      });

      const preferredKeys = [
        'text',
        'value',
        'payload',
        'data',
        'url',
        'content',
        headers[0],
      ];

      let text = '';
      for (const key of preferredKeys) {
        if (key && columns[key]) {
          text = columns[key];
          break;
        }
      }
      if (!text) {
        const values = Object.values(columns);
        text = values[0] ?? '';
      }

      return {
        columns,
        rowNumber: rowIndex + 1,
        text,
      } satisfies ParsedCsvRow;
    })
    .filter((row) => row.text !== '');
};

export const templateFilename = (
  template: string,
  row: ParsedCsvRow,
  fallbackIndex: number,
): string => {
  const tokens = new Map<string, string>();
  tokens.set('row', String(row.rowNumber));

  Object.entries(row.columns).forEach(([key, value]) => {
    const trimmedKey = key.trim();
    const normalizedKey = trimmedKey.replace(/\s+/g, '_');
    tokens.set(trimmedKey, value);
    tokens.set(trimmedKey.toLowerCase(), value);
    tokens.set(normalizedKey, value);
    tokens.set(normalizedKey.toLowerCase(), value);
  });

  const resolved = template.replace(/{{\s*([^}]+)\s*}}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return (
      tokens.get(key) ??
      tokens.get(key.toLowerCase()) ??
      tokens.get(key.replace(/\s+/g, '_')) ??
      tokens.get(key.replace(/\s+/g, '_').toLowerCase()) ??
      ''
    );
  });

  const sanitized = resolved
    .trim()
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  if (sanitized) return sanitized;
  return `code-${fallbackIndex + 1}`;
};

export const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1] ?? '';
  if (!base64) return new Uint8Array();

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  if (typeof Buffer === 'function') {
    const buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer);
  }

  return new Uint8Array();
};

export const createZipFromBatch = (items: BatchResult[]): JSZip => {
  const zip = new JSZip();
  items.forEach((item) => {
    if (item.png) {
      zip.file(`${item.filename}.png`, dataUrlToUint8Array(item.png), { binary: true });
    }
    if (item.svg) {
      zip.file(`${item.filename}.svg`, item.svg);
    }
  });
  return zip;
};

interface BatchModeProps {
  size?: number;
  margin?: number;
  ecc?: 'L' | 'M' | 'Q' | 'H';
}

const PreviewCanvas: React.FC<{ dataUrl: string; size: number; label: string }> = ({
  dataUrl,
  size,
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!dataUrl) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };

    return () => {
      img.onload = null;
    };
  }, [dataUrl, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label={label}
      className="w-32 h-32 bg-white"
    />
  );
};

const BatchMode: React.FC<BatchModeProps> = ({ size = 256, margin = 1, ecc = 'M' }) => {
  const [csvInput, setCsvInput] = useState('');
  const [template, setTemplate] = useState('{{name}}');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);

  const initWorker = useCallback(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../../workers/qrEncode.worker.ts', import.meta.url),
      );
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      workerRef.current?.terminate();
    };
  }, []);

  const encodeWithWorker = useCallback(
    (text: string) =>
      new Promise<{ png: string; svg: string }>((resolve) => {
        const worker = initWorker();
        if (!worker) {
          resolve({ png: '', svg: '' });
          return;
        }

        const handleMessage = (event: MessageEvent<{ png: string; svg: string }>) => {
          worker.removeEventListener('message', handleMessage as EventListener);
          resolve(event.data);
        };

        worker.addEventListener('message', handleMessage as EventListener);
        worker.postMessage({
          text,
          opts: {
            margin,
            width: size,
            errorCorrectionLevel: ecc,
          },
        });
      }),
    [ecc, initWorker, margin, size],
  );

  const handleGenerate = useCallback(async () => {
    const parsedRows = parseCsvRows(csvInput);
    setError('');
    setResults([]);

    if (!parsedRows.length) {
      setProgress({ current: 0, total: 0 });
      setError('No rows detected in CSV input.');
      return;
    }

    const worker = initWorker();
    if (!worker) {
      setError('Batch mode requires Web Worker support.');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: parsedRows.length });

    const generated: BatchResult[] = [];
    for (let i = 0; i < parsedRows.length; i += 1) {
      if (cancelledRef.current) break;
      const row = parsedRows[i];
      if (!row.text) {
        setProgress({ current: i + 1, total: parsedRows.length });
        continue;
      }

      const filename = templateFilename(template, row, i);
      try {
        const { png, svg } = await encodeWithWorker(row.text);
        generated.push({
          filename,
          png,
          svg,
          rowNumber: row.rowNumber,
          columns: row.columns,
        });
      } catch {
        // ignore encoding errors for individual rows
      }
      setProgress({ current: i + 1, total: parsedRows.length });
    }

    if (!cancelledRef.current) {
      setResults(generated);
    }

    setIsGenerating(false);
  }, [cancelledRef, csvInput, encodeWithWorker, initWorker, template]);

  const downloadZip = useCallback(async () => {
    if (!results.length) return;
    const zip = createZipFromBatch(results);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-batch.zip';
    link.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const { current: progressCurrent, total: progressTotal } = progress;
  const progressLabel = useMemo(() => {
    if (!progressTotal) return '';
    const percent = Math.round((progressCurrent / progressTotal) * 100);
    return `${progressCurrent}/${progressTotal} (${percent}%)`;
  }, [progressCurrent, progressTotal]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="batch-csv" className="block text-sm">
          CSV rows
          <textarea
            id="batch-csv"
            className="w-full mt-1 rounded p-2 text-black"
            rows={6}
            placeholder="text,name\nhttps://example.com,Homepage"
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            aria-label="Batch CSV rows"
          />
        </label>
        <label htmlFor="batch-template" className="block text-sm">
          Filename template
          <input
            id="batch-template"
            type="text"
            className="w-full mt-1 rounded p-1 text-black"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            placeholder="{{name}}"
            aria-label="Filename template"
          />
        </label>
        <p className="text-xs text-gray-300">
          Use placeholders like {'{{name}}'}, {'{{url}}'} or {'{{row}}'} to build filenames.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-3 py-1 bg-blue-600 rounded disabled:opacity-60"
        >
          {isGenerating ? 'Generating…' : 'Preview batch'}
        </button>
        <button
          type="button"
          onClick={downloadZip}
          disabled={!results.length || isGenerating}
          className="px-3 py-1 bg-green-600 rounded disabled:opacity-60"
        >
          Download ZIP
        </button>
        {progressLabel && (
          <span className="text-xs text-gray-200 self-center">{progressLabel}</span>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {isGenerating && (
        <div role="status" className="text-sm text-gray-200">
          Processing batch… {progressLabel}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Preview ({results.length} items)</p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {results.map((item) => (
              <div key={`${item.filename}-${item.rowNumber}`} className="space-y-1 text-center">
                <PreviewCanvas
                  dataUrl={item.png}
                  size={size}
                  label={`QR code for row ${item.rowNumber}`}
                />
                <div className="text-xs break-all text-gray-100">{item.filename}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchMode;
