'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import Presets from './components/Presets';
import Scan from './components/Scan';
import {
  loadLastGeneration,
  loadLastScan,
  saveLastGeneration,
  saveLastScan,
} from '../../utils/qrStorage';

export default function QR() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payload, setPayload] = useState('');
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [size, setSize] = useState(256);
  const [scanResult, setScanResult] = useState('');
  const [lastGen, setLastGen] = useState('');
  const [lastScan, setLastScan] = useState('');

  useEffect(() => {
    setLastGen(loadLastGeneration());
    setLastScan(loadLastScan());
  }, []);

  useEffect(() => {
    if (payload) {
      saveLastGeneration(payload);
      setLastGen(payload);
    }
  }, [payload]);

  useEffect(() => {
    if (scanResult) {
      saveLastScan(scanResult);
      setLastScan(scanResult);
    }
  }, [scanResult]);

  const downloadPng = useCallback(async () => {
    if (!payload) return;
    const data = await QRCode.toDataURL(payload, { margin: 1, width: size });
    const link = document.createElement('a');
    link.href = data;
    link.download = `qr-${size}.png`;
    link.click();
  }, [payload, size]);

  const downloadSvg = useCallback(async () => {
    if (!payload) return;
    const svg = await QRCode.toString(payload, {
      margin: 1,
      width: size,
      type: 'svg',
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${size}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [payload, size]);

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('generate')}
          className={`px-2 py-1 rounded ${
            mode === 'generate' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`px-2 py-1 rounded ${
            mode === 'scan' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Scan
        </button>
      </div>

      <div className="w-64 aspect-square mx-auto">
        {mode === 'generate' ? (
          <canvas ref={canvasRef} className="w-full h-full bg-white" />
        ) : (
          <Scan onResult={setScanResult} />
        )}
      </div>

      {mode === 'generate' && (
        <>
          <Presets
            canvasRef={canvasRef}
            onPayloadChange={setPayload}
            size={size}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="qr-size" className="text-sm flex items-center gap-1">
              Size
              <select
                id="qr-size"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
                className="ml-1 rounded p-1 text-black"
              >
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
              </select>
            </label>
            <button
              type="button"
              onClick={downloadPng}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download PNG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download SVG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
          </div>
        </>
      )}

      {lastScan && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last scan</p>
          <p className="break-all text-sm">{lastScan}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastScan)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}

      {lastGen && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last generation</p>
          <p className="break-all text-sm">{lastGen}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastGen)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

