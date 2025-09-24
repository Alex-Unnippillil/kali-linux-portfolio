'use client';
import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  MAX_BATCH_ITEMS,
  parseBatchCsv,
  sanitizeInput,
  validateQrText,
} from '../../../utils/qrValidation';

interface BatchItem {
  name: string;
  png: string;
  svg: string;
}

const errorLevels = ['L', 'M', 'Q', 'H'] as const;

type ErrorLevel = (typeof errorLevels)[number];

const QRTool: React.FC = () => {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<ErrorLevel>('M');
  const [invert, setInvert] = useState(false);
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');
  const [csv, setCsv] = useState('');
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [error, setError] = useState('');
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const workerRef = React.useRef<Worker | null>(null);

  const initWorker = React.useCallback(() => {
    if (
      !workerRef.current &&
      typeof window !== 'undefined' &&
      typeof Worker === 'function'
    ) {
      workerRef.current = new Worker(
        new URL('../../../workers/qrEncode.worker.ts', import.meta.url),
      );
    }
    return workerRef.current;
  }, []);

  const encodeQr = React.useCallback(
    (text: string) =>
      new Promise<{ png: string; svg: string }>((resolve) => {
        const w = initWorker();
        if (!w) {
          resolve({ png: '', svg: '' });
          return;
        }
        w.onmessage = (
          e: MessageEvent<{ png: string; svg: string }>,
        ) => resolve(e.data);
        w.postMessage({ text, opts: optsRef.current });
      }),
    [initWorker],
  );

  const opts = useMemo(
    () => ({
      errorCorrectionLevel: level,
      color: {
        dark: invert ? '#ffffff' : '#000000',
        light: invert ? '#000000' : '#ffffff',
      },
      margin: 1,
    }),
    [level, invert],
  );

  const optsRef = React.useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (!text) {
      setPng('');
      setSvg('');
      setError('');
      return;
    }
    const { ok, sanitized, error: validationError } = validateQrText(text);
    if (!ok) {
      setError(validationError ?? 'Unable to encode value.');
      setPng('');
      setSvg('');
      return;
    }
    setError('');
    encodeQr(sanitized)
      .then(({ png: p, svg: s }) => {
        setPng(p);
        setSvg(s);
      })
      .catch(() => {
        setError('Failed to generate QR code.');
        setPng('');
        setSvg('');
      });
  }, [text, opts, encodeQr]);

  useEffect(() => () => {
    workerRef.current?.terminate();
  }, []);

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const downloadSvgText = (svgText: string, filename: string) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (png && !error) downloadDataUrl(png, 'qr.png');
  };

  const downloadSvg = () => {
    if (svg && !error) downloadSvgText(svg, 'qr.svg');
  };

  const generateBatch = async () => {
    setBatchErrors([]);
    const { items, errors } = parseBatchCsv(csv);
    if (errors.length) {
      setBatch([]);
      setBatchErrors(errors);
      return;
    }
    const results = await Promise.allSettled(
      items.map(async ({ value, name }) => {
        const pngData = await QRCode.toDataURL(value, opts);
        const svgText = await QRCode.toString(value, {
          ...opts,
          type: 'svg',
        });
        return { name, png: pngData, svg: svgText };
      }),
    );
    const successes: BatchItem[] = [];
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        const line = items[index]?.line ?? index + 1;
        failures.push(`Line ${line}: Failed to encode value.`);
      }
    });
    setBatch(successes);
    setBatchErrors(failures);
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="space-y-2">
          <label htmlFor="qr-input" className="block">
            <span className="text-sm">Text</span>
            <input
              id="qr-input"
              type="text"
              value={text}
              onChange={(e) => setText(sanitizeInput(e.target.value))}
              className="w-full rounded p-1 text-black"
              aria-label="QR text input"
            />
          </label>
        {error && (
          <p className="text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="qr-error" className="flex items-center gap-1 text-sm">
            Error
            <select
              id="qr-error"
              value={level}
              onChange={(e) => setLevel(e.target.value as ErrorLevel)}
              className="rounded p-1 text-black"
            >
              {errorLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="qr-invert" className="flex items-center gap-1 text-sm">
            <input
              id="qr-invert"
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              aria-label="Invert QR colors"
            />
            Invert
          </label>
          <button
            type="button"
            onClick={downloadPng}
            className="px-2 py-1 bg-blue-600 rounded"
            disabled={!png || Boolean(error)}
          >
            PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="px-2 py-1 bg-blue-600 rounded"
            disabled={!svg || Boolean(error)}
          >
            SVG
          </button>
        </div>
        {png && !error && (
          <img src={png} alt="QR preview" className="h-48 w-48 bg-white" />
        )}
      </div>
      <div className="space-y-2">
          <label htmlFor="qr-csv" className="block">
            <span className="text-sm">Batch CSV (text,name)</span>
            <textarea
              id="qr-csv"
              rows={4}
              value={csv}
              onChange={(e) => setCsv(sanitizeInput(e.target.value))}
              className="w-full rounded p-1 text-black"
              aria-label="Batch CSV rows"
            />
          </label>
        <button
          type="button"
          onClick={generateBatch}
          className="px-2 py-1 bg-green-600 rounded"
        >
          Generate Batch
        </button>
        {batchErrors.length > 0 && (
          <div className="space-y-1 text-xs text-red-300" role="alert">
            {batchErrors.map((msg, idx) => (
              <p key={`${msg}-${idx}`}>{msg}</p>
            ))}
            <p className="text-[11px] text-gray-300">
              Limit batches to {MAX_BATCH_ITEMS} valid rows. Invalid lines are
              skipped.
            </p>
          </div>
        )}
        {batch.length > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            {batch.map((item) => (
              <div key={item.name} className="flex flex-col items-center space-y-1">
                <img src={item.png} alt={item.name} className="w-32 h-32 bg-white" />
                <div className="text-center text-xs break-all">{item.name}</div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(item.png, `${item.name}.png`)}
                    className="px-1 py-0.5 text-xs bg-blue-600 rounded"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSvgText(item.svg, `${item.name}.svg`)}
                    className="px-1 py-0.5 text-xs bg-blue-600 rounded"
                  >
                    SVG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRTool;

